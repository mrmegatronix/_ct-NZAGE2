import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';
import { ScanRecord, AppSettings, DocumentType, ScanStatus } from '../types';
import { playSound, triggerHaptic } from '../utils/audio';
import { parseIdBarcode, extractDobFromOcrText, calculateAge, formatDob } from '../utils/idParser';
import confetti from 'canvas-confetti';

interface ScannerViewProps {
  onScanComplete: (record: ScanRecord) => void;
  onGoToManual: () => void;
  settings: AppSettings;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onScanComplete,
  onGoToManual,
  settings,
}) => {
  const [torchActive, setTorchActive] = useState(false);
  const [useLiveCamera, setUseLiveCamera] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('ANALYZING ID DOCUMENT...');
  const [lastResult, setLastResult] = useState<ScanRecord | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [showDobModal, setShowDobModal] = useState(false);
  const [modalDobDigits, setModalDobDigits] = useState('');
  const [modalDocType, setModalDocType] = useState<DocumentType>('NZDL');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize camera by default
  useEffect(() => {
    let active = true;

    async function initCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setUseLiveCamera(true);
        setCameraError(null);
      } catch {
        if (active) {
          setCameraError('Camera access unavailable. Using optical card snapshot mode.');
          setUseLiveCamera(false);
        }
      }
    }

    initCam();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleTorch = async () => {
    const nextTorch = !torchActive;
    setTorchActive(nextTorch);
    playSound('click', settings.audioFeedback);

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && 'applyConstraints' in track) {
        try {
          await (track as any).applyConstraints({
            advanced: [{ torch: nextTorch }],
          });
        } catch {
          // Hardware torch unsupported
        }
      }
    }
  };

  // Process decoded raw string from Barcode / PDF417 / QR
  const handleDecodedBarcode = useCallback(
    (rawText: string) => {
      if (isScanning) return;
      setIsScanning(true);
      playSound('beep', settings.audioFeedback);

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const dateStr = now.toISOString().split('T')[0];

      const parsed = parseIdBarcode(rawText, settings.minAge);
      if (parsed) {
        const newRecord: ScanRecord = {
          id: `scan-${Date.now()}`,
          timestamp: timeStr,
          date: dateStr,
          createdAt: Date.now(),
          documentType: parsed.documentType,
          documentLabel: parsed.documentLabel,
          dob: parsed.dob,
          calculatedAge: parsed.calculatedAge,
          status: parsed.status,
          statusReason: parsed.statusReason,
          isManual: false,
          documentNumber: parsed.documentNumber,
          notes: parsed.notes,
          staffName: settings.staffName,
        };

        setLastResult(newRecord);
        setIsScanning(false);
        onScanComplete(newRecord);

        if (parsed.status === 'PERMITTED') {
          playSound('success', settings.audioFeedback);
          triggerHaptic('success', settings.hapticFeedback);
          confetti({
            particleCount: 35,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#00ff85', '#61ff97', '#ffffff'],
          });
        } else {
          playSound('denied', settings.audioFeedback);
          triggerHaptic('error', settings.hapticFeedback);
        }
      } else {
        // Unrecognized barcode string format - prompt optical confirmation
        setIsScanning(false);
        setModalDobDigits('');
        setShowDobModal(true);
      }
    },
    [isScanning, onScanComplete, settings]
  );

  // Real-time ZXing Multi-Format (PDF417 + QR + 1D) Live Camera Loop
  useEffect(() => {
    let isRunning = true;
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.PDF_417,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.AZTEC,
    ]);
    const reader = new BrowserMultiFormatReader(hints);

    let lastDecodeTime = 0;
    const scanLoop = async () => {
      if (!isRunning) return;
      const now = Date.now();
      if (now - lastDecodeTime > 250 && useLiveCamera && !isScanning && !lastResult && !showDobModal) {
        lastDecodeTime = now;
        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          try {
            const zxResult = await reader.decodeFromVideoElement(video);
            if (zxResult && zxResult.getText()) {
              handleDecodedBarcode(zxResult.getText());
            }
          } catch {
            // ZXing throws NotFoundException when no code is in frame
          }
        }
      }

      if (isRunning) {
        requestAnimationFrame(scanLoop);
      }
    };

    if (useLiveCamera) {
      requestAnimationFrame(scanLoop);
    }

    return () => {
      isRunning = false;
      try {
        reader.reset();
      } catch {}
    };
  }, [useLiveCamera, isScanning, lastResult, showDobModal, handleDecodedBarcode]);

  // Capture Button: Barcode -> jsQR -> Tesseract OCR -> Optical Sheet
  const handleCaptureFrame = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanStatusText('SCANNING CARD BARCODE...');
    playSound('click', settings.audioFeedback);

    let frameDataUrl: string | null = null;
    let detectedRaw: string | null = null;

    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          frameDataUrl = canvas.toDataURL('image/jpeg', 0.9);

          // 1. Try ZXing on captured frame data URL
          if (frameDataUrl) {
            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [
              BarcodeFormat.PDF_417,
              BarcodeFormat.QR_CODE,
              BarcodeFormat.CODE_128,
              BarcodeFormat.CODE_39,
            ]);
            const reader = new BrowserMultiFormatReader(hints);
            try {
              const zxResult = await reader.decodeFromImageUrl(frameDataUrl);
              if (zxResult && zxResult.getText()) {
                detectedRaw = zxResult.getText();
              }
            } catch {}
          }

          // 2. Try jsQR
          if (!detectedRaw) {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qr = jsQR(imgData.data, imgData.width, imgData.height);
            if (qr && qr.data) {
              detectedRaw = qr.data;
            }
          }
        } catch (err) {
          console.warn('Canvas frame capture error:', err);
        }
      }
    }

    if (detectedRaw) {
      setIsScanning(false);
      handleDecodedBarcode(detectedRaw);
      return;
    }

    // 3. Try Client-Side OCR on Card Face
    if (frameDataUrl) {
      setScanStatusText('READING PRINTED DOB (OCR)...');
      try {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(frameDataUrl);
        await worker.terminate();

        if (ret && ret.data && ret.data.text) {
          const ocrResult = extractDobFromOcrText(ret.data.text, settings.minAge);
          if (ocrResult) {
            const now = new Date();
            const record: ScanRecord = {
              id: `scan-${Date.now()}`,
              timestamp: now.toTimeString().split(' ')[0],
              date: now.toISOString().split('T')[0],
              createdAt: Date.now(),
              documentType: ocrResult.documentType,
              documentLabel: ocrResult.documentLabel,
              dob: ocrResult.dob,
              calculatedAge: ocrResult.calculatedAge,
              status: ocrResult.status,
              statusReason: ocrResult.statusReason,
              isManual: false,
              documentNumber: ocrResult.documentNumber,
              staffName: settings.staffName,
            };

            setLastResult(record);
            setIsScanning(false);
            onScanComplete(record);

            if (ocrResult.status === 'PERMITTED') {
              playSound('success', settings.audioFeedback);
              triggerHaptic('success', settings.hapticFeedback);
              confetti({
                particleCount: 35,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#00ff85', '#61ff97', '#ffffff'],
              });
            } else {
              playSound('denied', settings.audioFeedback);
              triggerHaptic('error', settings.hapticFeedback);
            }
            return;
          }
        }
      } catch (ocrErr) {
        console.warn('OCR processing error, opening verification confirmation:', ocrErr);
      }
    }

    // 4. Fallback to Optical Confirmation Sheet (shows actual photo taken)
    setIsScanning(false);
    setCapturedPhotoUrl(frameDataUrl);
    setModalDobDigits('');
    setShowDobModal(true);
  };

  // Confirm DOB from Optical Sheet
  const handleConfirmOpticalDob = (digits: string, docType: DocumentType) => {
    if (digits.length !== 8) return;
    const day = parseInt(digits.substring(0, 2), 10);
    const month = parseInt(digits.substring(2, 4), 10);
    const year = parseInt(digits.substring(4, 8), 10);

    if (isNaN(day) || isNaN(month) || isNaN(year) || month < 1 || month > 12 || day < 1 || day > 31) {
      return;
    }

    const calculatedAge = calculateAge(day, month, year);
    const permitted = calculatedAge >= settings.minAge;
    const formattedDob = formatDob(day, month, year);

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];

    const labelMap: Record<DocumentType, string> = {
      NZDL: 'NZ Driver Licence (Optical)',
      NZ_Passport: 'NZ Passport (Optical)',
      R18_Card: '18+ Kiwi Access (Optical)',
      Intl_Passport: 'International Passport (Optical)',
      Intl_ID: 'International ID Card (Optical)',
      Other: 'National ID Card (Optical)',
    };

    const newRecord: ScanRecord = {
      id: `scan-${Date.now()}`,
      timestamp: timeStr,
      date: dateStr,
      createdAt: Date.now(),
      documentType: docType,
      documentLabel: labelMap[docType] || 'ID Document (Optical)',
      dob: formattedDob,
      calculatedAge: calculatedAge,
      status: permitted ? 'PERMITTED' : 'DENIED',
      statusReason: permitted
        ? `Optical Verified (${calculatedAge}+ Legal Adult)`
        : `Underage Patron Refusal (${calculatedAge} < ${settings.minAge})`,
      isManual: false,
      documentNumber: `OPT-${Math.floor(100000 + Math.random() * 900000)}`,
      staffName: settings.staffName,
    };

    setShowDobModal(false);
    setCapturedPhotoUrl(null);
    setLastResult(newRecord);
    onScanComplete(newRecord);

    if (permitted) {
      playSound('success', settings.audioFeedback);
      triggerHaptic('success', settings.hapticFeedback);
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00ff85', '#61ff97', '#ffffff'],
      });
    } else {
      playSound('denied', settings.audioFeedback);
      triggerHaptic('error', settings.hapticFeedback);
    }
  };

  // Quick age preset selector for optical cards
  const handleQuickAgePreset = (targetAge: number, docType: DocumentType) => {
    const today = new Date();
    const birthYear = today.getFullYear() - targetAge;
    const birthMonth = today.getMonth() + 1;
    const birthDay = today.getDate();
    const digits = `${birthDay.toString().padStart(2, '0')}${birthMonth.toString().padStart(2, '0')}${birthYear}`;
    handleConfirmOpticalDob(digits, docType);
  };

  const toggleCamera = async () => {
    if (useLiveCamera) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      setUseLiveCamera(false);
      setCameraError(null);
    } else {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setUseLiveCamera(true);
      } catch {
        setCameraError('Camera access denied or unavailable. Using snapshot mode.');
        setUseLiveCamera(false);
      }
    }
  };

  const handleSimulatedScan = (
    type: DocumentType,
    label: string,
    dob: string,
    age: number | null,
    status: ScanStatus,
    reason?: string
  ) => {
    if (isScanning) return;
    setIsScanning(true);
    playSound('click', settings.audioFeedback);

    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const dateStr = now.toISOString().split('T')[0];

      const newRecord: ScanRecord = {
        id: `scan-${Date.now()}`,
        timestamp: timeStr,
        date: dateStr,
        createdAt: Date.now(),
        documentType: type,
        documentLabel: label,
        dob: dob,
        calculatedAge: age,
        status: status,
        statusReason: reason,
        isManual: false,
        documentNumber: `DOC-${Math.floor(100000 + Math.random() * 900000)}`,
        gender: Math.random() > 0.5 ? 'M' : 'F',
        staffName: settings.staffName,
      };

      setLastResult(newRecord);
      setIsScanning(false);
      onScanComplete(newRecord);

      if (status === 'PERMITTED') {
        playSound('success', settings.audioFeedback);
        triggerHaptic('success', settings.hapticFeedback);
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00ff85', '#61ff97', '#ffffff'],
        });
      } else if (status === 'DENIED' || status === 'FAKE_FLAG') {
        playSound('denied', settings.audioFeedback);
        triggerHaptic('error', settings.hapticFeedback);
      } else {
        playSound('warning', settings.audioFeedback);
        triggerHaptic('warning', settings.hapticFeedback);
      }
    }, 300);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanStatusText('ANALYZING UPLOADED ID...');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = img.width;
        offscreen.height = img.height;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);

          // 1. Try ZXing Barcode / PDF417
          try {
            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [
              BarcodeFormat.PDF_417,
              BarcodeFormat.QR_CODE,
              BarcodeFormat.CODE_128,
              BarcodeFormat.CODE_39,
            ]);
            const zxReader = new BrowserMultiFormatReader(hints);
            const zxResult = await zxReader.decodeFromImageElement(img);
            if (zxResult && zxResult.getText()) {
              setIsScanning(false);
              handleDecodedBarcode(zxResult.getText());
              return;
            }
          } catch {}

          // 2. Try OCR on image
          try {
            const worker = await createWorker('eng');
            const ret = await worker.recognize(src);
            await worker.terminate();

            if (ret && ret.data && ret.data.text) {
              const ocrResult = extractDobFromOcrText(ret.data.text, settings.minAge);
              if (ocrResult) {
                const now = new Date();
                const record: ScanRecord = {
                  id: `scan-${Date.now()}`,
                  timestamp: now.toTimeString().split(' ')[0],
                  date: now.toISOString().split('T')[0],
                  createdAt: Date.now(),
                  documentType: ocrResult.documentType,
                  documentLabel: ocrResult.documentLabel,
                  dob: ocrResult.dob,
                  calculatedAge: ocrResult.calculatedAge,
                  status: ocrResult.status,
                  statusReason: ocrResult.statusReason,
                  isManual: false,
                  documentNumber: ocrResult.documentNumber,
                  staffName: settings.staffName,
                };

                setLastResult(record);
                setIsScanning(false);
                onScanComplete(record);
                return;
              }
            }
          } catch {}

          // 3. Prompt with image preview
          setIsScanning(false);
          setCapturedPhotoUrl(src);
          setModalDobDigits('');
          setShowDobModal(true);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto w-full pb-8">
      {/* Top Security & Encryption Status Pill */}
      <div className="flex items-center justify-between w-full mb-3 px-2">
        <div className="flex items-center gap-1.5 text-[#00e476]">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          <span className="text-[10px] font-mono-code font-bold tracking-wider">
            OPTICAL SCANNER ACTIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCamera}
            className="text-[10px] font-mono-code px-2.5 py-1 rounded-full border border-white/10 glass-edge text-[#b9cbb9] hover:text-white flex items-center gap-1 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[14px]">
              {useLiveCamera ? 'videocam_off' : 'videocam'}
            </span>
            {useLiveCamera ? 'Camera Active' : 'Switch Live Cam'}
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="w-full mb-3 p-2.5 bg-[#ff4b4b]/10 border border-[#ff4b4b]/30 rounded-xl text-[#ffb4ab] text-xs font-mono-code text-center">
          {cameraError}
        </div>
      )}

      {/* Main Viewfinder Box */}
      <div
        id="scanner-view"
        className={`w-full aspect-[4/3] rounded-3xl relative overflow-hidden bg-black/90 border transition-all duration-300 flex items-center justify-center mb-4 select-none ${
          lastResult
            ? lastResult.status === 'PERMITTED'
              ? 'border-[#00ff85] shadow-[0_0_30px_rgba(0,255,133,0.3)]'
              : lastResult.status === 'DENIED' || lastResult.status === 'FAKE_FLAG'
              ? 'border-[#ff4b4b] shadow-[0_0_30px_rgba(255,75,75,0.3)]'
              : 'border-[#feb700] shadow-[0_0_30px_rgba(254,183,0,0.3)]'
            : 'border-white/10'
        }`}
      >
        {/* Video stream container */}
        {useLiveCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-[#b9cbb9]">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[32px] text-[#00ff85]">
                document_scanner
              </span>
            </div>
            <div className="font-hanken text-sm font-bold text-white mb-1">
              Optical Card Framing Mode
            </div>
            <p className="font-inter text-xs text-[#b9cbb9]/70 max-w-xs">
              Position ID card within the laser brackets and tap Capture to verify age.
            </p>
          </div>
        )}

        {/* High-Tech Framing Brackets */}
        <div className="absolute inset-5 pointer-events-none">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#00ff85] rounded-tl-xl shadow-[0_0_10px_#00ff85]" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#00ff85] rounded-tr-xl shadow-[0_0_10px_#00ff85]" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-[#00ff85] rounded-bl-xl shadow-[0_0_10px_#00ff85]" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-[#00ff85] rounded-br-xl shadow-[0_0_10px_#00ff85]" />
        </div>

        {/* Continuous Scanning Laser */}
        <div className="animate-scan-laser absolute left-0 right-0 h-[2px] bg-[#00ff85] shadow-[0_0_12px_#00ff85] z-10" />

        {/* Flashlight / Torch Toggle */}
        <button
          onClick={toggleTorch}
          className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            torchActive
              ? 'bg-[#feb700] text-black shadow-[0_0_15px_#feb700]'
              : 'bg-black/60 text-white hover:bg-white/20 border border-white/10'
          }`}
          aria-label="Toggle Flashlight"
          title="Toggle Flashlight"
        >
          <span className="material-symbols-outlined text-[20px]">
            {torchActive ? 'flashlight_on' : 'flashlight_off'}
          </span>
        </button>

        {/* Scanning Spinner Overlay */}
        {isScanning && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30">
            <div className="w-12 h-12 border-3 border-[#00ff85] border-t-transparent rounded-full animate-spin mb-3" />
            <div className="font-mono-code text-xs font-bold text-[#00ff85] tracking-widest animate-pulse text-center px-4">
              {scanStatusText}
            </div>
          </div>
        )}
      </div>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Primary Capture Action Button */}
      <div className="w-full mb-4">
        <button
          onClick={handleCaptureFrame}
          disabled={isScanning}
          className="w-full h-[56px] rounded-2xl bg-[#00ff85] text-[#003919] font-hanken text-base font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,133,0.35)]"
        >
          <span className="material-symbols-outlined text-[24px]">camera</span>
          CAPTURE &amp; VERIFY ID
        </button>
      </div>

      {/* Dynamic Status / Result Card */}
      <div
        id="status-card"
        className={`w-full rounded-2xl p-5 border transition-all duration-300 ${
          lastResult
            ? lastResult.status === 'PERMITTED'
              ? 'bg-[#00ff85]/10 border-[#00ff85]/40 glow-green'
              : lastResult.status === 'DENIED' || lastResult.status === 'FAKE_FLAG'
              ? 'bg-[#ff4b4b]/10 border-[#ff4b4b]/40 glow-red'
              : 'bg-[#feb700]/10 border-[#feb700]/40 glow-amber'
            : 'bg-[#1a1a1a] border-white/10 glass-edge'
        }`}
      >
        {lastResult ? (
          <div className="flex flex-col items-center text-center">
            {/* Status Icon & Title */}
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`material-symbols-outlined text-[28px] ${
                  lastResult.status === 'PERMITTED'
                    ? 'text-[#00ff85]'
                    : lastResult.status === 'DENIED' || lastResult.status === 'FAKE_FLAG'
                    ? 'text-[#ff4b4b]'
                    : 'text-[#feb700]'
                }`}
              >
                {lastResult.status === 'PERMITTED'
                  ? 'check_circle'
                  : lastResult.status === 'DENIED'
                  ? 'cancel'
                  : lastResult.status === 'FAKE_FLAG'
                  ? 'gpp_bad'
                  : 'warning'}
              </span>
              <h2
                className={`font-hanken text-[26px] font-extrabold tracking-tight uppercase ${
                  lastResult.status === 'PERMITTED'
                    ? 'text-[#00ff85] glow-text-green'
                    : lastResult.status === 'DENIED' || lastResult.status === 'FAKE_FLAG'
                    ? 'text-[#ff4b4b] glow-text-red'
                    : 'text-[#feb700]'
                }`}
              >
                {lastResult.status === 'PERMITTED'
                  ? 'ENTRY PERMITTED'
                  : lastResult.status === 'DENIED'
                  ? 'ACCESS DENIED'
                  : lastResult.status === 'FAKE_FLAG'
                  ? 'FAKE ID DETECTED'
                  : 'CHECK DATE'}
              </h2>
            </div>

            {/* Calculated Age and DOB row */}
            <div className="flex items-center justify-center gap-6 my-2 font-mono-code">
              <div>
                <span className="text-xs text-[#b9cbb9]/70 mr-1">AGE:</span>
                <span className="text-xl font-extrabold text-white">
                  {lastResult.calculatedAge !== null ? lastResult.calculatedAge : 'UNK'}
                </span>
              </div>
              <div className="w-[1px] h-4 bg-white/20" />
              <div>
                <span className="text-xs text-[#b9cbb9]/70 mr-1">DOB:</span>
                <span className="text-xl font-extrabold text-white">
                  {lastResult.dob}
                </span>
              </div>
            </div>

            {/* Document Label & Subtext */}
            <div className="text-xs font-mono-code text-[#b9cbb9] mb-1">
              {lastResult.documentLabel} • {lastResult.documentNumber || 'VERIFIED'}
            </div>

            {lastResult.statusReason && (
              <div className="text-[11px] font-inter text-[#b9cbb9]/80 max-w-sm mt-1">
                {lastResult.statusReason}
              </div>
            )}

            {/* Clear Button */}
            <button
              onClick={() => setLastResult(null)}
              className="mt-4 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-mono-code text-xs flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Scan Next Patron
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-4">
            <span className="material-symbols-outlined text-[32px] text-[#00ff85] mb-2 animate-bounce">
              qr_code_scanner
            </span>
            <div className="font-hanken text-lg font-bold text-white mb-0.5">
              Ready to Scan
            </div>
            <p className="font-inter text-xs text-[#b9cbb9]/70">
              Show Driver License barcode or front photo to camera.
            </p>
          </div>
        )}
      </div>

      {/* Simulator & Tools Drawer */}
      <div className="w-full mt-4 glass-edge rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="flex items-center gap-1.5 text-[11px] font-mono-code font-bold text-[#b9cbb9]/70 hover:text-white tracking-wider"
          >
            <span className="material-symbols-outlined text-[16px]">
              {showSimulator ? 'expand_less' : 'tune'}
            </span>
            TEST SCENARIOS &amp; SIMULATOR
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] font-mono-code text-[#00ff85] hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">upload_file</span>
            Upload ID Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {showSimulator && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
            <button
              onClick={() =>
                handleSimulatedScan(
                  'NZ_Passport',
                  'NZ Passport',
                  '05.08.1999',
                  calculateAge(5, 8, 1999),
                  'PERMITTED',
                  'Verified Legal Adult (NZ Passport Passed)'
                )
              }
              className="p-2.5 bg-white/5 hover:bg-[#00ff85]/20 border border-white/10 hover:border-[#00ff85]/50 rounded-xl text-left transition-all active:scale-95"
            >
              <div className="text-[10px] font-mono-code text-[#00ff85] font-bold">
                PASS: ADULT ({calculateAge(5, 8, 1999)})
              </div>
              <div className="text-xs text-white font-semibold truncate">NZ Passport</div>
            </button>

            <button
              onClick={() =>
                handleSimulatedScan(
                  'NZDL',
                  'NZDL',
                  '12.04.2009',
                  calculateAge(12, 4, 2009),
                  'DENIED',
                  `Underage patron (${calculateAge(12, 4, 2009)} yrs - Threshold ${settings.minAge}+)`
                )
              }
              className="p-2.5 bg-white/5 hover:bg-[#ff4b4b]/20 border border-white/10 hover:border-[#ff4b4b]/50 rounded-xl text-left transition-all active:scale-95"
            >
              <div className="text-[10px] font-mono-code text-[#ff4b4b] font-bold">
                DENY: MINOR ({calculateAge(12, 4, 2009)})
              </div>
              <div className="text-xs text-white font-semibold truncate">NZDL (Minor)</div>
            </button>

            <button
              onClick={() =>
                handleSimulatedScan(
                  'R18_Card',
                  '18+ Kiwi Access Card',
                  '14.02.2004',
                  calculateAge(14, 2, 2004),
                  'PERMITTED',
                  'Kiwi Access 18+ Card Verified Legal Adult'
                )
              }
              className="p-2.5 bg-white/5 hover:bg-[#00ff85]/20 border border-white/10 hover:border-[#00ff85]/50 rounded-xl text-left transition-all active:scale-95"
            >
              <div className="text-[10px] font-mono-code text-[#00ff85] font-bold">
                PASS: 18+ ({calculateAge(14, 2, 2004)})
              </div>
              <div className="text-xs text-white font-semibold truncate">Kiwi Access</div>
            </button>

            <button
              onClick={() => {
                const today = new Date();
                const borderlineYear = today.getFullYear() - settings.minAge;
                const borderlineDob = formatDob(today.getDate(), today.getMonth() + 1, borderlineYear);
                handleSimulatedScan(
                  'Intl_ID',
                  'Intl ID (Borderline)',
                  borderlineDob,
                  settings.minAge,
                  'CHECK_DATE',
                  `18th Birthday this month: Exactly ${settings.minAge} Years Old`
                );
              }}
              className="p-2.5 bg-white/5 hover:bg-[#feb700]/20 border border-white/10 hover:border-[#feb700]/50 rounded-xl text-left transition-all active:scale-95"
            >
              <div className="text-[10px] font-mono-code text-[#feb700] font-bold">BORDERLINE (18)</div>
              <div className="text-xs text-white font-semibold truncate">18th Birthday Check</div>
            </button>

            <button
              onClick={() =>
                handleSimulatedScan(
                  'Other',
                  'Flagged Altered Document',
                  '--.--.----',
                  null,
                  'FAKE_FLAG',
                  'Microprint and UV security feature validation failure'
                )
              }
              className="p-2.5 bg-white/5 hover:bg-[#ff4b4b]/20 border border-white/10 hover:border-[#ff4b4b]/50 rounded-xl text-left transition-all active:scale-95"
            >
              <div className="text-[10px] font-mono-code text-[#ff4b4b] font-bold">FLAG: SUSPECT ID</div>
              <div className="text-xs text-white font-semibold truncate">Tamper Alert</div>
            </button>

            <button
              onClick={onGoToManual}
              className="p-2.5 bg-[#00ff85]/10 hover:bg-[#00ff85]/20 border border-[#00ff85]/30 rounded-xl text-left transition-all active:scale-95 flex flex-col justify-center"
            >
              <div className="text-[10px] font-mono-code text-[#00ff85] font-bold">KEYPAD ENTRY</div>
              <div className="text-xs text-white font-semibold truncate">Manual Verify →</div>
            </button>
          </div>
        )}
      </div>

      {/* Optical DOB Confirmation Sheet (When card photo taken without barcode) */}
      {showDobModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/15 rounded-3xl max-w-sm w-full p-5 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#00ff85]">
                  document_scanner
                </span>
                <h3 className="font-hanken text-lg font-bold text-white">
                  Confirm Date of Birth
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowDobModal(false);
                  setCapturedPhotoUrl(null);
                }}
                className="text-[#b9cbb9] hover:text-white p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Captured frame preview if available */}
            {capturedPhotoUrl && (
              <div className="w-full h-32 rounded-xl overflow-hidden mb-3 border border-white/10 bg-black">
                <img
                  src={capturedPhotoUrl}
                  alt="Captured ID"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <p className="text-xs font-inter text-[#b9cbb9] mb-3">
              Confirm the Date of Birth seen on this ID card:
            </p>

            {/* Quick Age Presets */}
            <div className="mb-4">
              <span className="font-mono-code text-[10px] text-[#b9cbb9]/70 uppercase tracking-wider block mb-1.5">
                ONE-TAP AGE PRESETS
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickAgePreset(17, modalDocType)}
                  className="py-2.5 px-3 rounded-xl bg-[#ff4b4b]/15 border border-[#ff4b4b]/40 text-[#ff4b4b] font-mono-code text-xs font-bold text-left hover:bg-[#ff4b4b]/25 active:scale-95 transition-all"
                >
                  <div>UNDER 18 (17)</div>
                  <div className="text-[10px] text-[#b9cbb9]">Deny Entry</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAgePreset(18, modalDocType)}
                  className="py-2.5 px-3 rounded-xl bg-[#feb700]/15 border border-[#feb700]/40 text-[#feb700] font-mono-code text-xs font-bold text-left hover:bg-[#feb700]/25 active:scale-95 transition-all"
                >
                  <div>TURNS 18 (18)</div>
                  <div className="text-[10px] text-[#b9cbb9]">Check Date</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAgePreset(21, modalDocType)}
                  className="py-2.5 px-3 rounded-xl bg-[#00ff85]/15 border border-[#00ff85]/40 text-[#00ff85] font-mono-code text-xs font-bold text-left hover:bg-[#00ff85]/25 active:scale-95 transition-all"
                >
                  <div>LEGAL ADULT (21)</div>
                  <div className="text-[10px] text-[#b9cbb9]">Permit Entry</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAgePreset(26, modalDocType)}
                  className="py-2.5 px-3 rounded-xl bg-[#00ff85]/15 border border-[#00ff85]/40 text-[#00ff85] font-mono-code text-xs font-bold text-left hover:bg-[#00ff85]/25 active:scale-95 transition-all"
                >
                  <div>ADULT (26+)</div>
                  <div className="text-[10px] text-[#b9cbb9]">Permit Entry</div>
                </button>
              </div>
            </div>

            {/* Exact DDMMYYYY Keypad input */}
            <div>
              <span className="font-mono-code text-[10px] text-[#b9cbb9]/70 uppercase tracking-wider block mb-1.5">
                OR TYPE EXACT DOB (DDMMYYYY)
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={8}
                  placeholder="DDMMYYYY (e.g. 15082001)"
                  value={modalDobDigits}
                  onChange={(e) =>
                    setModalDobDigits(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))
                  }
                  className="flex-1 bg-[#0a0a0a] border border-white/15 rounded-xl px-3 py-2 text-white font-mono-code text-sm tracking-wider focus:border-[#00ff85] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={modalDobDigits.length !== 8}
                  onClick={() => handleConfirmOpticalDob(modalDobDigits, modalDocType)}
                  className="px-4 py-2 bg-[#00ff85] disabled:opacity-30 disabled:pointer-events-none text-[#003919] font-mono-code text-xs font-bold rounded-xl active:scale-95 transition-all"
                >
                  VERIFY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
