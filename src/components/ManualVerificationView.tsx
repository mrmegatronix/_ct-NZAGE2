import React, { useState, useEffect, useCallback } from 'react';
import { ScanRecord, AppSettings, DocumentType } from '../types';
import { playSound, triggerHaptic } from '../utils/audio';
import confetti from 'canvas-confetti';

interface ManualVerificationViewProps {
  onVerifyComplete: (record: ScanRecord) => void;
  settings: AppSettings;
}

export const ManualVerificationView: React.FC<ManualVerificationViewProps> = ({
  onVerifyComplete,
  settings,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<DocumentType>('NZDL');
  const [inputDigits, setInputDigits] = useState<string>('');
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [calcStatus, setCalcStatus] = useState<'IDLE' | 'PERMITTED' | 'DENIED' | 'CHECK_DATE' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('AWAITING INPUT');

  const docOptions: { type: DocumentType; label: string; icon: string }[] = [
    { type: 'NZDL', label: 'License', icon: 'badge' },
    { type: 'NZ_Passport', label: 'Passport', icon: 'menu_book' },
    { type: 'R18_Card', label: '18+ Card', icon: 'contact_emergency' },
    { type: 'Intl_ID', label: 'Intl ID', icon: 'public' },
  ];

  // Calculate age based on digits
  const evaluateDate = useCallback((digits: string) => {
    if (digits.length !== 8) {
      setCalculatedAge(null);
      setCalcStatus('IDLE');
      setStatusMessage('AWAITING INPUT');
      return;
    }

    const day = parseInt(digits.substring(0, 2), 10);
    const month = parseInt(digits.substring(2, 4), 10) - 1;
    const year = parseInt(digits.substring(4, 8), 10);

    const today = new Date();
    const dob = new Date(year, month, day);

    // Validation
    if (
      isNaN(dob.getTime()) ||
      dob > today ||
      month < 0 ||
      month > 11 ||
      day < 1 ||
      day > 31 ||
      year < 1900 ||
      year > today.getFullYear()
    ) {
      setCalculatedAge(null);
      setCalcStatus('ERROR');
      setStatusMessage('INVALID DATE');
      return;
    }

    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    setCalculatedAge(age);

    if (age >= settings.minAge) {
      setCalcStatus('PERMITTED');
      setStatusMessage('ENTRY PERMITTED');
    } else {
      setCalcStatus('DENIED');
      setStatusMessage('ACCESS DENIED');
    }
  }, [settings.minAge]);

  const handleAppend = (digit: string) => {
    if (inputDigits.length < 8) {
      const next = inputDigits + digit;
      setInputDigits(next);
      playSound('click', settings.audioFeedback);
      evaluateDate(next);
    }
  };

  const handleDelete = () => {
    if (inputDigits.length > 0) {
      const next = inputDigits.slice(0, -1);
      setInputDigits(next);
      playSound('click', settings.audioFeedback);
      evaluateDate(next);
    }
  };

  const handleClear = () => {
    setInputDigits('');
    setCalculatedAge(null);
    setCalcStatus('IDLE');
    setStatusMessage('AWAITING INPUT');
    playSound('click', settings.audioFeedback);
  };

  const handleVerifySubmit = () => {
    if (inputDigits.length !== 8 || calcStatus === 'ERROR' || calcStatus === 'IDLE') return;

    const day = inputDigits.substring(0, 2);
    const month = inputDigits.substring(2, 4);
    const year = inputDigits.substring(4, 8);
    const formattedDob = `${day}.${month}.${year}`;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];

    const docObj = docOptions.find((d) => d.type === selectedDoc);
    const docLabel = `${docObj?.label || 'Manual ID'} (Manual)`;

    const record: ScanRecord = {
      id: `manual-${Date.now()}`,
      timestamp: timeStr,
      date: dateStr,
      documentType: selectedDoc,
      documentLabel: docLabel,
      dob: formattedDob,
      calculatedAge: calculatedAge,
      status: calcStatus === 'PERMITTED' ? 'PERMITTED' : 'DENIED',
      statusReason: calcStatus === 'PERMITTED' ? 'Manual Keypad Verification (Passed)' : 'Manual Keypad Verification (Underage)',
      isManual: true,
      documentNumber: `MAN-${Math.floor(10000 + Math.random() * 90000)}`,
      staffName: settings.staffName,
    };

    onVerifyComplete(record);

    if (calcStatus === 'PERMITTED') {
      playSound('success', settings.audioFeedback);
      triggerHaptic('success', settings.hapticFeedback);
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.5 },
        colors: ['#00ff85', '#61ff97', '#ffffff'],
      });
    } else {
      playSound('denied', settings.audioFeedback);
      triggerHaptic('error', settings.hapticFeedback);
    }

    // Reset for next patron
    handleClear();
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleAppend(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter') {
        handleVerifySubmit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Format display string
  const renderDobDisplay = () => {
    let result = '';
    for (let i = 0; i < 8; i++) {
      if (i < inputDigits.length) {
        result += inputDigits[i];
      } else {
        result += '-';
      }
      if (i === 1 || i === 3) {
        result += ' / ';
      }
    }
    return result;
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col justify-between pb-12 pt-2">
      {/* Top Input & Calculation Section */}
      <div className="flex flex-col gap-4">
        {/* Document Selection Tabs */}
        <div className="flex flex-col gap-1.5 w-full">
          <span className="font-mono-code text-[11px] font-bold text-[#b9cbb9]/70 pl-1 uppercase tracking-wider">
            DOCUMENT TYPE
          </span>
          <div className="grid grid-cols-4 gap-1.5 w-full">
            {docOptions.map((doc) => {
              const isSelected = selectedDoc === doc.type;
              return (
                <button
                  key={doc.type}
                  id={`doc-select-${doc.type}`}
                  onClick={() => {
                    setSelectedDoc(doc.type);
                    playSound('click', settings.audioFeedback);
                  }}
                  className={`py-2 px-1.5 rounded-xl font-inter text-xs flex flex-col items-center justify-center gap-1 transition-all border ${
                    isSelected
                      ? 'bg-white/15 text-white border-[#00ff85]/60 shadow-[0_0_12px_rgba(0,255,133,0.2)] font-bold'
                      : 'bg-[#1a1a1a] text-[#b9cbb9] border-white/10 hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {doc.icon}
                  </span>
                  <span className="text-[10px] truncate">{doc.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DOB Display Card */}
        <div className="glass-edge rounded-2xl p-4 flex flex-col items-center justify-center min-h-[105px] relative border border-white/10">
          <span className="font-mono-code text-[10px] text-[#b9cbb9]/70 absolute top-3 left-3 tracking-wider">
            DATE OF BIRTH (DDMMYYYY)
          </span>
          <div
            id="dob-display"
            className="font-hanken text-[28px] sm:text-[32px] text-white tracking-[0.2em] font-extrabold mt-3 select-none"
          >
            {renderDobDisplay()}
          </div>
        </div>

        {/* Age Calculation Result Card */}
        <div
          id="age-result-card"
          className={`rounded-2xl p-4 flex flex-col items-center justify-center min-h-[120px] transition-all duration-300 border ${
            calcStatus === 'PERMITTED'
              ? 'bg-[#00ff85]/15 border-[#00ff85] glow-green'
              : calcStatus === 'DENIED' || calcStatus === 'ERROR'
              ? 'bg-[#ff4b4b]/15 border-[#ff4b4b] glow-red'
              : 'glass-edge border-white/10 opacity-60'
          }`}
        >
          <span className="font-mono-code text-[10px] text-[#b9cbb9]/80 mb-1 tracking-wider">
            CALCULATED AGE
          </span>
          <div
            id="age-display"
            className={`font-hanken text-[42px] font-extrabold leading-none ${
              calcStatus === 'PERMITTED'
                ? 'text-[#00ff85] glow-text-green'
                : calcStatus === 'DENIED' || calcStatus === 'ERROR'
                ? 'text-[#ff4b4b] glow-text-red'
                : 'text-[#e5e2e1]'
            }`}
          >
            {calcStatus === 'ERROR' ? 'ERR' : calculatedAge !== null ? calculatedAge : '--'}
          </div>
          <div
            id="status-text"
            className={`font-hanken text-sm font-bold mt-1.5 tracking-wide ${
              calcStatus === 'PERMITTED'
                ? 'text-[#00ff85]'
                : calcStatus === 'DENIED' || calcStatus === 'ERROR'
                ? 'text-[#ff4b4b]'
                : 'text-[#b9cbb9]/70'
            }`}
          >
            {statusMessage}
          </div>
        </div>
      </div>

      {/* High-Tactile Keypad */}
      <div className="flex flex-col gap-3 mt-4">
        <div className="grid grid-cols-3 gap-2 max-w-[300px] mx-auto w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              id={`keypad-${digit}`}
              onClick={() => handleAppend(digit)}
              className="h-[54px] rounded-xl glass-edge font-hanken text-2xl font-bold flex items-center justify-center text-white active:scale-90 active:bg-white/15 transition-all border border-white/5 hover:border-white/20 shadow-sm"
            >
              {digit}
            </button>
          ))}

          {/* Clear Key */}
          <button
            id="keypad-clear"
            onClick={handleClear}
            className="h-[54px] rounded-xl glass-edge text-[#ffb4ab] flex items-center justify-center active:scale-90 active:bg-[#ff4b4b]/20 transition-all border border-white/5 hover:border-[#ff4b4b]/30"
            title="Clear"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>

          {/* 0 Key */}
          <button
            id="keypad-0"
            onClick={() => handleAppend('0')}
            className="h-[54px] rounded-xl glass-edge font-hanken text-2xl font-bold flex items-center justify-center text-white active:scale-90 active:bg-white/15 transition-all border border-white/5 hover:border-white/20"
          >
            0
          </button>

          {/* Backspace Key */}
          <button
            id="keypad-backspace"
            onClick={handleDelete}
            className="h-[54px] rounded-xl glass-edge text-[#b9cbb9] flex items-center justify-center active:scale-90 active:bg-white/15 transition-all border border-white/5 hover:border-white/20"
            title="Backspace"
          >
            <span className="material-symbols-outlined text-[24px]">backspace</span>
          </button>
        </div>

        {/* Submit / Verify Age Action Button */}
        <button
          id="verify-age-submit-btn"
          disabled={inputDigits.length !== 8 || calcStatus === 'ERROR'}
          onClick={handleVerifySubmit}
          className={`w-full h-[56px] rounded-xl font-hanken text-base font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 shadow-md ${
            inputDigits.length === 8 && calcStatus !== 'ERROR'
              ? calcStatus === 'PERMITTED'
                ? 'bg-[#00ff85] text-[#003919] hover:opacity-90 active:scale-95 shadow-[0_0_20px_rgba(0,255,133,0.4)]'
                : 'bg-[#ff4b4b] text-white hover:opacity-90 active:scale-95 shadow-[0_0_20px_rgba(255,75,75,0.4)]'
              : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed opacity-50'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {calcStatus === 'PERMITTED' ? 'check' : calcStatus === 'DENIED' ? 'block' : 'verified'}
          </span>
          {calcStatus === 'PERMITTED'
            ? 'LOG ENTRY PERMITTED'
            : calcStatus === 'DENIED'
            ? 'LOG ACCESS DENIED'
            : 'VERIFY AGE'}
        </button>
      </div>
    </div>
  );
};
