import React, { useState, useEffect } from 'react';
import { ActiveTab, AppSettings } from '../types';

interface TopAppBarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onLockClick: () => void;
  settings: AppSettings;
  isComplianceActive?: boolean;
  onAdjustPatrons?: (delta: number) => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  onLockClick,
  settings,
  isComplianceActive = true,
  onAdjustPatrons,
}) => {
  const [timeState, setTimeState] = useState({ hours: '--', minutes: '--', colonVisible: true });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setTimeState(prev => ({
        hours,
        minutes,
        colonVisible: !prev.colonVisible,
      }));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full top-0 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 sticky z-50 transition-all">
      <div className="flex justify-between items-center px-4 sm:px-6 h-[64px] max-w-7xl mx-auto">
        {/* Left Security Icon with Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLockClick}
            aria-label="Security settings and Lock"
            className="text-[#00e476] hover:opacity-80 transition-all active:scale-95 flex items-center justify-center w-10 h-10 rounded-xl glass-edge group"
            title="Lock Scanner / Staff ID"
          >
            <span
              className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              security
            </span>
          </button>
          
          <div className="hidden sm:flex items-center gap-1.5 bg-[#00e476]/10 px-2.5 py-1 rounded-full border border-[#00e476]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e476] animate-pulse"></span>
            <span className="text-[10px] font-mono-code font-bold tracking-wider text-[#00e476] whitespace-nowrap">
              {isComplianceActive ? 'COMPLIANCE: ACTIVE' : 'SYSTEM READY'}
            </span>
          </div>

          {/* Digital Blinking Colon Shift Clock */}
          <div className="flex items-center px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 font-mono-code text-xs text-white tracking-widest whitespace-nowrap">
            <span>{timeState.hours}</span>
            <span className={`inline-block mx-0.5 text-[#00ff85] font-bold ${timeState.colonVisible ? 'opacity-100' : 'opacity-0'}`}>:</span>
            <span>{timeState.minutes}</span>
          </div>
        </div>

        {/* Center Title & Capacity Counter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="font-hanken text-[18px] sm:text-[22px] font-extrabold text-[#00e476] tracking-tight glow-text-green uppercase select-none whitespace-nowrap overflow-hidden text-ellipsis">
              ID SCANNER
            </h1>
            <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/10 hidden md:inline-block whitespace-nowrap">
              {settings.venueName.split(' ')[0]}
            </span>
          </div>

          {/* Live Patron Occupancy */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/50 border border-white/10 font-mono-code text-xs">
            <span className="text-[#b9cbb9] text-[10px] tracking-wider uppercase">PATRONS</span>
            <span className={`font-bold ${
              (settings.currentPatronCount || 0) >= (settings.venueCapacity || 150)
                ? 'text-[#ff4b4b]'
                : (settings.currentPatronCount || 0) >= (settings.venueCapacity || 150) * 0.85
                ? 'text-[#fbbf24]'
                : 'text-[#00ff85]'
            }`}>
              {settings.currentPatronCount || 0}/{settings.venueCapacity || 150}
            </span>
            {onAdjustPatrons && (
              <div className="flex items-center gap-1 ml-1.5">
                <button
                  type="button"
                  onClick={() => onAdjustPatrons(-1)}
                  className="w-5 h-5 rounded flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold transition-colors active:scale-90"
                  title="Patron Exit (-1)"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustPatrons(1)}
                  className="w-5 h-5 rounded flex items-center justify-center bg-[#00ff85]/20 hover:bg-[#00ff85]/40 text-[#00ff85] font-bold transition-colors active:scale-90"
                  title="Patron Entry (+1)"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Staff / Profile */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLockClick}
            aria-label="Staff Profile"
            className="flex items-center gap-2 pl-2 pr-1 sm:pr-3 py-1.5 rounded-full glass-edge hover:bg-white/5 transition-all text-[#e5e2e1] active:scale-95"
            title={`Logged in as ${settings.staffName} (${settings.staffRole || 'SCANNER'})`}
          >
            <div className="text-right hidden sm:block max-w-[130px]">
              <div className="text-[11px] font-bold font-hanken leading-tight text-white whitespace-nowrap overflow-hidden text-ellipsis">{settings.staffName}</div>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <span className={`text-[8px] font-mono-code font-bold px-1 rounded uppercase ${
                  settings.staffRole === 'WAIT STAFF'
                    ? 'bg-[#38bdf8]/20 text-[#38bdf8]'
                    : settings.staffRole === 'SUPERVISOR'
                    ? 'bg-[#fbbf24]/20 text-[#fbbf24]'
                    : 'bg-[#00e476]/20 text-[#00e476]'
                }`}>
                  {settings.staffRole || 'SCANNER'}
                </span>
                <span className="text-[9px] font-mono-code text-[#00e476] leading-none whitespace-nowrap">{settings.staffId}</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#00ff85]/20 border border-[#00ff85]/40 flex items-center justify-center text-[#00ff85]">
              <span className="material-symbols-outlined text-[18px]">
                {settings.staffRole === 'WAIT STAFF' ? 'restaurant' : 'account_circle'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
