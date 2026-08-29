import React, { useState } from 'react';
import { AppSettings, ActiveTab } from '../types';
import { playSound } from '../utils/audio';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (updated: Partial<AppSettings>) => void;
  onResetShiftData: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetShiftData,
  onNavigateTab,
}) => {
  const [venueNameInput, setVenueNameInput] = useState(settings.venueName);
  const [staffNameInput, setStaffNameInput] = useState(settings.staffName);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const handleSaveVenueInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      venueName: venueNameInput,
      staffName: staffNameInput,
    });
    playSound('success', settings.audioFeedback);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-12">
      <div className="mb-6">
        <h2 className="font-hanken text-2xl sm:text-3xl font-extrabold text-white">
          System Configuration
        </h2>
        <p className="font-inter text-xs sm:text-sm text-[#b9cbb9] mt-0.5">
          Hospitality Pro • Version 2.4.1 Security Suite
        </p>
      </div>

      {saveToast && (
        <div className="mb-4 p-3 bg-[#00ff85]/15 border border-[#00ff85]/30 rounded-xl text-[#00ff85] text-xs font-mono-code flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Configuration updated and synchronized.
        </div>
      )}

      <div className="space-y-4">
        {/* Venue & Identity Section */}
        <section className="glass-edge rounded-2xl p-5 border border-white/10">
          <h3 className="font-mono-code text-xs font-bold text-[#00ff85] mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">store</span>
            VENUE &amp; OPERATOR PROFILE
          </h3>

          <form onSubmit={handleSaveVenueInfo} className="space-y-3">
            <div>
              <label className="block font-mono-code text-[11px] text-[#b9cbb9] mb-1">
                VENUE NAME
              </label>
              <input
                type="text"
                value={venueNameInput}
                onChange={(e) => setVenueNameInput(e.target.value)}
                className="w-full bg-[#0e0e0e] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-inter text-sm focus:border-[#00ff85] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono-code text-[11px] text-[#b9cbb9] mb-1">
                ACTIVE STAFF OPERATOR
              </label>
              <input
                type="text"
                value={staffNameInput}
                onChange={(e) => setStaffNameInput(e.target.value)}
                className="w-full bg-[#0e0e0e] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-inter text-sm focus:border-[#00ff85] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#00ff85] text-[#003919] font-mono-code text-xs font-bold hover:bg-[#00ff85]/90 transition-all"
            >
              SAVE VENUE INFO
            </button>
          </form>
        </section>

        {/* Verification Rule Settings */}
        <section className="glass-edge rounded-2xl p-5 border border-white/10">
          <h3 className="font-mono-code text-xs font-bold text-[#00ff85] mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            COMPLIANCE THRESHOLDS
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-inter text-sm text-white font-semibold">
                  Minimum Legal Age
                </span>
                <span className="font-mono-code text-xs font-bold text-[#00ff85] bg-[#00ff85]/10 px-2 py-0.5 rounded border border-[#00ff85]/30">
                  {settings.minAge}+ YEARS
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[18, 20, 21].map((age) => (
                  <button
                    key={age}
                    onClick={() => {
                      onUpdateSettings({ minAge: age });
                      playSound('click', settings.audioFeedback);
                    }}
                    className={`py-2 rounded-xl font-mono-code text-xs font-bold transition-all border ${
                      settings.minAge === age
                        ? 'bg-[#00ff85] text-[#003919] border-[#00ff85]'
                        : 'bg-[#0e0e0e] text-[#b9cbb9] border-white/10 hover:bg-white/5'
                    }`}
                  >
                    {age}+ (Legal Standard)
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-inter text-sm text-white font-semibold">
                  Auto-Purge Scan Logs
                </span>
                <span className="font-mono-code text-xs text-[#b9cbb9]">
                  {settings.autoPurgeHours} Hours
                </span>
              </div>
              <p className="text-xs text-[#b9cbb9]/70 font-inter mb-2">
                Automatically deletes patron data to meet local data privacy guidelines.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[12, 24, 48].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => {
                      onUpdateSettings({ autoPurgeHours: hours });
                      playSound('click', settings.audioFeedback);
                    }}
                    className={`py-2 rounded-xl font-mono-code text-xs transition-all border ${
                      settings.autoPurgeHours === hours
                        ? 'bg-[#00ff85]/20 text-[#00ff85] border-[#00ff85]/50 font-bold'
                        : 'bg-[#0e0e0e] text-[#b9cbb9] border-white/10 hover:bg-white/5'
                    }`}
                  >
                    {hours} Hours
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Audio & Haptic Feedback */}
        <section className="glass-edge rounded-2xl p-5 border border-white/10">
          <h3 className="font-mono-code text-xs font-bold text-[#00ff85] mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">volume_up</span>
            FEEDBACK &amp; SENSORY CONTROLS
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <div className="font-inter text-sm text-white font-semibold">
                  Acoustic Feedback
                </div>
                <div className="text-xs text-[#b9cbb9]/70">
                  Play distinct high-frequency chime on pass and low buzzer on refusal
                </div>
              </div>
              <button
                onClick={() => {
                  const next = !settings.audioFeedback;
                  onUpdateSettings({ audioFeedback: next });
                  playSound('click', next);
                }}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  settings.audioFeedback ? 'bg-[#00ff85]' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.audioFeedback ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <div className="font-inter text-sm text-white font-semibold">
                  Haptic Vibration
                </div>
                <div className="text-xs text-[#b9cbb9]/70">
                  Vibrate handheld device on verification results
                </div>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings({ hapticFeedback: !settings.hapticFeedback })
                }
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  settings.hapticFeedback ? 'bg-[#00ff85]' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.hapticFeedback ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Quick Operational Shortcuts */}
        <section className="glass-edge rounded-2xl p-5 border border-white/10">
          <h3 className="font-mono-code text-xs font-bold text-[#00ff85] mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">handyman</span>
            SHORTCUTS &amp; SHIFT TOOLS
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onNavigateTab('staff')}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center gap-3 text-left transition-all"
            >
              <span className="material-symbols-outlined text-[#00ff85]">group</span>
              <div>
                <div className="font-inter text-sm font-semibold text-white">Staff Roster</div>
                <div className="text-[11px] text-[#b9cbb9]/70">Manage door personnel</div>
              </div>
            </button>

            <button
              onClick={() => onNavigateTab('sync')}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center gap-3 text-left transition-all"
            >
              <span className="material-symbols-outlined text-[#00ff85]">qr_code_scanner</span>
              <div>
                <div className="font-inter text-sm font-semibold text-white">Device Sync</div>
                <div className="text-[11px] text-[#b9cbb9]/70">Pair scanning devices</div>
              </div>
            </button>
          </div>
        </section>

        {/* Danger Zone: Reset Shift */}
        <section className="glass-edge rounded-2xl p-5 border border-[#ff4b4b]/20 bg-[#2a1a1a]/20">
          <h3 className="font-mono-code text-xs font-bold text-[#ffb4ab] mb-2 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            END SHIFT / RESET DATA
          </h3>
          <p className="text-xs text-[#b9cbb9]/80 font-inter mb-4">
            Reset current shift counters, active tokens, and compliance buffers for the next operating evening.
          </p>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2.5 bg-[#ff4b4b]/20 border border-[#ff4b4b]/40 text-[#ffb4ab] rounded-xl font-mono-code text-xs font-bold hover:bg-[#ff4b4b]/30 transition-all active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            Reset Shift Counters
          </button>
        </section>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-[#ff4b4b]/40 rounded-2xl p-6 max-w-sm w-full glow-red">
            <div className="w-12 h-12 rounded-full bg-[#ff4b4b]/20 flex items-center justify-center text-[#ff4b4b] mx-auto mb-3">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <h3 className="text-center font-hanken text-lg font-bold text-white mb-1">
              Reset Current Shift?
            </h3>
            <p className="text-center text-xs text-[#b9cbb9] mb-5">
              This will reset the total scans and hourly volumes for a fresh shift. History logs will be preserved.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white font-mono-code text-xs hover:bg-white/5"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  onResetShiftData();
                  setShowResetConfirm(false);
                  playSound('denied', settings.audioFeedback);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#ff4b4b] text-white font-mono-code text-xs font-bold hover:bg-[#ff4b4b]/90"
              >
                CONFIRM RESET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
