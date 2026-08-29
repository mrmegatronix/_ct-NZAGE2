import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { playSound, triggerHaptic } from '../utils/audio';

interface PinLoginModalProps {
  isOpen: boolean;
  onUnlock: () => void;
  settings: AppSettings;
  onUpdateStaff?: (name: string, id: string) => void;
}

export const PinLoginModal: React.FC<PinLoginModalProps> = ({
  isOpen,
  onUnlock,
  settings,
  onUpdateStaff,
}) => {
  const [mode, setMode] = useState<'PIN_PAD' | 'STAFF_ID'>('PIN_PAD');
  const [pinDigits, setPinDigits] = useState<string>('');
  const [staffIdInput, setStaffIdInput] = useState<string>(settings.staffId || '#4928');
  const [staffPinInput, setStaffPinInput] = useState<string>('••••');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPinDigits('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAppendPin = (digit: string) => {
    if (pinDigits.length < 4) {
      const next = pinDigits + digit;
      setPinDigits(next);
      playSound('click', settings.audioFeedback);
      
      if (next.length === 4) {
        // Evaluate PIN (Accept any 4 digit PIN, or specific test PIN 1234 / 4928)
        setTimeout(() => {
          if (next === '0000') {
            setErrorMessage('Invalid Security PIN');
            playSound('denied', settings.audioFeedback);
            triggerHaptic('error', settings.hapticFeedback);
            setPinDigits('');
          } else {
            playSound('success', settings.audioFeedback);
            triggerHaptic('success', settings.hapticFeedback);
            onUnlock();
          }
        }, 200);
      }
    }
  };

  const handleDeletePin = () => {
    if (pinDigits.length > 0) {
      setPinDigits(pinDigits.slice(0, -1));
      playSound('click', settings.audioFeedback);
      setErrorMessage(null);
    }
  };

  const handleBiometricLogin = () => {
    playSound('click', settings.audioFeedback);
    setTimeout(() => {
      playSound('success', settings.audioFeedback);
      triggerHaptic('success', settings.hapticFeedback);
      onUnlock();
    }, 400);
  };

  const handleStaffFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffIdInput.trim()) return;

    if (onUpdateStaff) {
      onUpdateStaff(staffIdInput.startsWith('#') ? 'Staff ' + staffIdInput : staffIdInput, staffIdInput);
    }
    playSound('success', settings.audioFeedback);
    onUnlock();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl flex flex-col items-center justify-between p-6 sm:p-8 selection:bg-[#00ff85] selection:text-[#003919]">
      {/* Top Brand / Header */}
      <header className="text-center flex flex-col items-center gap-2 pt-6 w-full max-w-sm">
        <div className="w-16 h-16 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-1 glass-edge border border-white/10 shadow-[0_0_20px_rgba(0,228,118,0.15)]">
          <span
            className="material-symbols-outlined text-[32px] text-[#00ff85]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            security
          </span>
        </div>

        {mode === 'PIN_PAD' ? (
          <>
            <h1 className="font-hanken text-2xl sm:text-3xl tracking-tight text-white font-extrabold">
              Enter PIN
            </h1>
            <p className="font-inter text-xs text-[#b9cbb9]">
              Verify staff authorization to continue scanning
            </p>
          </>
        ) : (
          <>
            <h1 className="font-hanken text-2xl sm:text-3xl tracking-tight text-[#00ff85] font-extrabold uppercase glow-text-green">
              ID SCANNER
            </h1>
            <p className="font-inter text-xs text-[#b9cbb9]">
              Secure Staff Access • {settings.venueName}
            </p>
          </>
        )}
      </header>

      {/* Main Mode Body */}
      {mode === 'PIN_PAD' ? (
        <div className="flex flex-col items-center w-full max-w-xs my-auto">
          {/* 4 PIN Dots */}
          <div className="flex justify-center gap-5 my-6">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < pinDigits.length;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    isFilled
                      ? 'bg-[#00ff85] border-transparent shadow-[0_0_14px_#00ff85] scale-110'
                      : 'border-white/20 bg-transparent'
                  }`}
                />
              );
            })}
          </div>

          {errorMessage && (
            <div className="text-xs text-[#ffb4ab] font-mono-code mb-4 text-center">
              {errorMessage}
            </div>
          )}

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-y-4 gap-x-6 w-full max-w-[280px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                onClick={() => handleAppendPin(d)}
                className="font-hanken text-3xl text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto glass-edge hover:bg-white/10 active:scale-90 transition-all border border-white/5"
              >
                {d}
              </button>
            ))}

            {/* Biometric Button */}
            <button
              onClick={handleBiometricLogin}
              className="text-[#00ff85] w-16 h-16 rounded-full flex items-center justify-center mx-auto glass-edge hover:bg-white/10 active:scale-90 transition-all border border-white/5"
              title="Biometric Fingerprint Unlock"
            >
              <span className="material-symbols-outlined text-[26px]">fingerprint</span>
            </button>

            {/* 0 Button */}
            <button
              onClick={() => handleAppendPin('0')}
              className="font-hanken text-3xl text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto glass-edge hover:bg-white/10 active:scale-90 transition-all border border-white/5"
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              onClick={handleDeletePin}
              className="text-[#b9cbb9] w-16 h-16 rounded-full flex items-center justify-center mx-auto glass-edge hover:bg-white/10 active:scale-90 transition-all border border-white/5"
              title="Backspace"
            >
              <span className="material-symbols-outlined text-[24px]">backspace</span>
            </button>
          </div>

          <button
            onClick={() => setMode('STAFF_ID')}
            className="mt-6 font-mono-code text-xs text-[#b9cbb9] hover:text-[#00ff85] transition-colors"
          >
            Switch to Staff ID &amp; Password Form →
          </button>
        </div>
      ) : (
        /* Staff ID Form Mode */
        <form onSubmit={handleStaffFormSubmit} className="flex flex-col gap-4 w-full max-w-sm my-auto">
          <div>
            <label className="block font-mono-code text-xs text-white mb-1.5 font-bold">
              STAFF ID
            </label>
            <div className="relative rounded-xl glass-edge border border-white/10">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b9cbb9] text-[20px]">
                badge
              </span>
              <input
                type="text"
                value={staffIdInput}
                onChange={(e) => setStaffIdInput(e.target.value)}
                placeholder="e.g. #4928"
                className="w-full bg-transparent border-none text-white pl-11 pr-4 py-3.5 text-sm focus:ring-0 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-mono-code text-xs text-white font-bold">PIN CODE</label>
              <button
                type="button"
                onClick={() => setMode('PIN_PAD')}
                className="font-mono-code text-[11px] text-[#b9cbb9] hover:text-[#00ff85]"
              >
                USE KEYPAD
              </button>
            </div>
            <div className="relative rounded-xl glass-edge border border-white/10">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b9cbb9] text-[20px]">
                dialpad
              </span>
              <input
                type="password"
                value={staffPinInput}
                onChange={(e) => setStaffPinInput(e.target.value)}
                className="w-full bg-transparent border-none text-white pl-11 pr-4 py-3.5 text-sm tracking-widest focus:ring-0 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#00ff85] text-[#003919] font-hanken text-base font-extrabold h-[52px] rounded-xl hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 mt-2 shadow-[0_0_16px_rgba(0,255,133,0.3)]"
          >
            LOG IN
            <span className="material-symbols-outlined text-[20px]">login</span>
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10" />
            <span className="flex-shrink-0 mx-3 text-[#b9cbb9]/60 font-mono-code text-[10px]">OR</span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          <button
            type="button"
            onClick={handleBiometricLogin}
            className="w-full bg-transparent border border-white/15 text-white font-hanken text-sm font-bold h-[52px] rounded-xl hover:bg-white/5 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[22px] text-[#00ff85]">fingerprint</span>
            Biometric Login
          </button>
        </form>
      )}

      {/* Footer System Version */}
      <footer className="text-center pb-safe pt-4">
        <p className="font-mono-code text-[10px] text-[#b9cbb9]/50 tracking-wider">
          SYSTEM V2.4.1 • HOSPITALITY PRO ENVIRONMENT
        </p>
      </footer>
    </div>
  );
};
