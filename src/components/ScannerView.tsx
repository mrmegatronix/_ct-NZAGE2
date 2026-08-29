import React, { useState, useRef, useEffect } from 'react';
import { ScanRecord, AppSettings, DocumentType } from '../types';
import { playSound, triggerHaptic } from '../utils/audio';
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
  const [useLiveCamera, setUseLiveCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanRecord | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop video stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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
        setCameraError('Camera access denied or unavailable. Using simulated optical scanner.');
        setUseLiveCamera(false);
      }
    }
  };

  const handleSimulatedScan = (
    type: DocumentType,
    label: string,
    dob: string,
    age: number | null,
    status: 'PERMITTED' | 'DENIED' | 'CHECK_DATE' | 'FAKE_FLAG',
    reason?: string
  ) => {
    if (isScanning) return;
    setIsScanning(true);
    playSound('click', settings.audioFeedback);

    // Short scanning latency
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const dateStr = now.toISOString().split('T')[0];

      const newRecord: ScanRecord = {
        id: `scan-${Date.now()}`,
        timestamp: timeStr,
        date: dateStr,
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
    }, 700);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setTimeout(() => {
      // Analyze mock uploaded document
      handleSimulatedScan(
        'NZDL',
        'NZDL (Scanned)',
        '15.06.1998',
        28,
        'PERMITTED',
        'Image OCR Verified Legal Adult'
      );
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto w-full pb-8">
      {/* Top Security & Encryption Status Pill */}
      <div className="flex items-center justify-between w-full mb-3 px-2">
        <div className="flex items-center gap-1.5 text-[#00e476]">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          <span className="text-[10px] font-mono-code font-bold tracking-wider">SECURE_LINK ACTIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCamera}
            className="text-[10px] font-mono-code px-2.5 py-1 rounded-full border border-white/10 glass-edge text-[#b9cbb9] hover:text-white flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">
              {useLiveCamera ? 'videocam_off' : 'videocam'}
            </span>
            {useLiveCamera ? 'Live Camera ON' : 'Switch Live Cam'}
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="w-full mb-3 p-2 bg-[#ff4b4b]/10 border border-[#ff4b4b]/30 rounded-lg text-[#ffb4ab] text-xs font-mono-code text-center">
          {cameraError}
        </div>
      )}

      {/* Main Viewfinder Box */}
      <div
        id="scanner-view"
        className={`relative w-full aspect-[4/3] max-h-[380px] bg-[#141414] rounded-2xl overflow-hidden mb-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] ${
          lastResult?.status === 'DENIED' || lastResult?.status === 'FAKE_FLAG'
            ? 'glow-red border-2 border-[#ff4b4b]'
            : lastResult?.status === 'PERMITTED'
            ? 'glow-green border-2 border-[#00ff85]'
            : lastResult?.status === 'CHECK_DATE'
            ? 'glow-amber border-2 border-[#feb700]'
            : 'border border-white/10'
        }`}
      >
        {/* Live Video Feed or Simulated Animated Camera Grid */}
        {useLiveCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[#141414] flex items-center justify-center">
            {/* Tech grid texture */}
            <div 
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: `linear-gradient(#00e476 1px, transparent 1px), linear-gradient(90deg, #00e476 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
            {/* Center target icon */}
            <div className="relative flex flex-col items-center justify-center opacity-40">
              <span className="material-symbols-outlined text-[64px] text-[#00e476]">
                document_scanner
              </span>
              <div className="w-3 h-3 rounded-full bg-[#00e476] mt-2 animate-ping" />
            </div>
          </div>
        )}

        {/* Laser Scanning Line */}
        <div className="animate-scan-laser absolute left-0 right-0 h-[2px] bg-[#00ff85] shadow-[0_0_12px_#00ff85] z-10" />

        {/* Corner Targeting Brackets */}
        <div className="absolute inset-4 pointer-events-none">
          {/* Top Left Bracket */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#00e476] rounded-tl-md shadow-[0_0_8px_rgba(0,228,118,0.4)]" />
          {/* Top Right Bracket */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#00e476] rounded-tr-md shadow-[0_0_8px_rgba(0,228,118,0.4)]" />
          {/* Bottom Left Bracket */}
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-[#00e476] rounded-bl-md shadow-[0_0_8px_rgba(0,228,118,0.4)]" />
          {/* Bottom Right Bracket */}
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-[#00e476] rounded-br-md shadow-[0_0_8px_rgba(0,228,118,0.4)]" />

          {/* Top Overlay Badges */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-[#0e0e0e]/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10 z-10">
            <span className="material-symbols-outlined text-[13px] text-[#00e476]">lock</span>
            <span className="font-mono-code text-[9px] text-white tracking-wider">DATA ENCRYPTED</span>
          </div>

          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-[#0e0e0e]/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10 z-10">
            <span className="material-symbols-outlined text-[13px] text-[#00e476]">verified_user</span>
            <span className="font-mono-code text-[9px] text-white tracking-wider">PRIVACY SHIELD</span>
          </div>

          {/* Bottom Left Overlay Badge */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-[#00ff85]/15 backdrop-blur-sm px-2.5 py-1 rounded-full border border-[#00ff85]/30 z-10">
            <span className="material-symbols-outlined text-[13px] text-[#00e476]">privacy_tip</span>
            <span className="font-mono-code text-[9px] text-[#00e476] tracking-wider">PRIVACY VERIFIED</span>
          </div>
        </div>

        {/* Torch / Flashlight Toggle Button */}
        <button
          id="torch-toggle-btn"
          onClick={() => {
            setTorchActive(!torchActive);
            playSound('click', settings.audioFeedback);
          }}
          className={`absolute bottom-3 right-3 p-3 rounded-full backdrop-blur-md transition-all z-20 ${
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

        {/* Scanning Activity Spinner Overlay */}
        {isScanning && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-30">
            <div className="w-12 h-12 border-3 border-[#00ff85] border-t-transparent rounded-full animate-spin mb-2" />
            <div className="font-mono-code text-xs font-bold text-[#00ff85] tracking-widest animate-pulse">
              ANALYZING ID DOCUMENT...
            </div>
          </div>
        )}
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
                <span className="text-base font-bold text-white">{lastResult.dob}</span>
              </div>
            </div>

            <p className="text-xs text-[#e5e2e1]/80 font-inter mb-3">
              {lastResult.statusReason || `${lastResult.documentLabel} verified for venue entry`}
            </p>

            {/* Action to clear or scan next */}
            <button
              onClick={() => setLastResult(null)}
              className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-mono-code text-xs font-bold transition-all border border-white/10 active:scale-95 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              READY FOR NEXT SCAN
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-[#00e476] mb-1.5 text-[32px]">
              qr_code_scanner
            </span>
            <p className="font-hanken text-[20px] font-bold text-white tracking-tight uppercase">
              READY TO SCAN
            </p>
            <p className="font-inter text-xs text-[#b9cbb9] mt-1 max-w-[280px]">
              Align NZ Driver's Licence, Passport, or R18 Card within frame
            </p>

            <p className="font-mono-code text-[10px] text-[#00e476] mt-3 px-3 py-1.5 bg-[#00e476]/5 rounded-lg border border-[#00e476]/20">
              Your data is encrypted locally and never stored on this device.
            </p>

            {/* Manual Override button */}
            <div className="mt-3 pt-3 border-t border-white/10 w-full flex justify-center">
              <button
                onClick={onGoToManual}
                className="font-mono-code text-xs font-bold text-[#b9cbb9] hover:text-[#00ff85] flex items-center gap-2 transition-colors uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-[16px]">terminal</span>
                MANUAL ENTRY / OVERRIDE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Test Scanner Triggers (Allows testing realistic IDs easily) */}
      <div className="w-full mt-4 glass-edge rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-mono-code font-bold text-[#b9cbb9]/70 tracking-wider">
            QUICK SCAN SIMULATOR
          </span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] font-mono-code text-[#00ff85] hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">upload_file</span>
            Upload ID
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() =>
              handleSimulatedScan(
                'NZ_Passport',
                'NZ Passport',
                '05.08.1999',
                27,
                'PERMITTED',
                'Verified Legal Adult (NZ Passport)'
              )
            }
            className="p-2.5 bg-white/5 hover:bg-[#00ff85]/20 border border-white/10 hover:border-[#00ff85]/50 rounded-xl text-left transition-all active:scale-95"
          >
            <div className="text-[10px] font-mono-code text-[#00ff85] font-bold">PASS: ADULT (27)</div>
            <div className="text-xs text-white font-semibold truncate">NZ Passport</div>
          </button>

          <button
            onClick={() =>
              handleSimulatedScan(
                'NZDL',
                'NZDL',
                '12.04.2009',
                17,
                'DENIED',
                'Underage patron (17 years old - Threshold 18+)'
              )
            }
            className="p-2.5 bg-white/5 hover:bg-[#ff4b4b]/20 border border-white/10 hover:border-[#ff4b4b]/50 rounded-xl text-left transition-all active:scale-95"
          >
            <div className="text-[10px] font-mono-code text-[#ff4b4b] font-bold">DENY: UNDER 18</div>
            <div className="text-xs text-white font-semibold truncate">NZDL (Age 17)</div>
          </button>

          <button
            onClick={() =>
              handleSimulatedScan(
                'R18_Card',
                '18+ Card',
                '14.02.1993',
                33,
                'PERMITTED',
                'Kiwi Access 18+ Card Verified'
              )
            }
            className="p-2.5 bg-white/5 hover:bg-[#00ff85]/20 border border-white/10 hover:border-[#00ff85]/50 rounded-xl text-left transition-all active:scale-95"
          >
            <div className="text-[10px] font-mono-code text-[#00ff85] font-bold">PASS: 18+ CARD</div>
            <div className="text-xs text-white font-semibold truncate">Kiwi Access</div>
          </button>

          <button
            onClick={() =>
              handleSimulatedScan(
                'Intl_ID',
                'Intl ID (Manual)',
                '23.10.2007',
                18,
                'CHECK_DATE',
                'Borderline Age: 18th Birthday this month'
              )
            }
            className="p-2.5 bg-white/5 hover:bg-[#feb700]/20 border border-white/10 hover:border-[#feb700]/50 rounded-xl text-left transition-all active:scale-95"
          >
            <div className="text-[10px] font-mono-code text-[#feb700] font-bold">CHECK DATE (18?)</div>
            <div className="text-xs text-white font-semibold truncate">Intl ID Check</div>
          </button>

          <button
            onClick={() =>
              handleSimulatedScan(
                'Other',
                'Fake ID Flag',
                '--.--.----',
                null,
                'FAKE_FLAG',
                'Security Hologram and microprint failure'
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
      </div>
    </div>
  );
};
