import React from 'react';
import { ActiveTab } from '../types';

interface BottomNavBarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  unreadCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'scanner', label: 'Scanner', icon: 'photo_camera' },
    { id: 'history', label: 'History', icon: 'history' },
    { id: 'manual', label: 'Manual', icon: 'edit_note' },
    { id: 'stats', label: 'Stats', icon: 'dashboard' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav 
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-3 pb-safe bg-[#0e0e0e]/95 backdrop-blur-xl border-t border-white/10 h-[80px]"
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          
          if (tab.id === 'scanner' && isActive) {
            return (
              <button
                key={tab.id}
                id={`nav-btn-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className="flex flex-col items-center justify-center bg-[#00ff85] text-[#003919] rounded-full p-2 h-[52px] w-[52px] shadow-[0_0_20px_rgba(0,255,133,0.4)] active:scale-90 transition-all duration-200 -translate-y-2"
                aria-label={tab.label}
              >
                <span 
                  className="material-symbols-outlined text-[26px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {tab.icon}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              id={`nav-btn-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center p-2 min-w-[56px] h-touch-target-min transition-all duration-150 active:scale-90 ${
                isActive
                  ? 'text-[#00ff85]'
                  : 'text-[#b9cbb9]/70 hover:text-white'
              }`}
              aria-label={tab.label}
            >
              {isActive && tab.id !== 'scanner' ? (
                <div className="bg-[#00ff85]/15 border border-[#00ff85]/30 rounded-xl px-2 py-1 flex flex-col items-center">
                  <span 
                    className="material-symbols-outlined text-[22px] text-[#00ff85]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {tab.icon}
                  </span>
                  <span className="font-mono-code text-[10px] font-bold mt-0.5 tracking-wider text-[#00ff85]">
                    {tab.label}
                  </span>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[22px]">
                    {tab.icon}
                  </span>
                  <span className="font-mono-code text-[10px] mt-1 tracking-wider opacity-80">
                    {tab.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Desktop Sidebar (Rendered on md screens) */}
      <aside 
        id="desktop-sidebar-nav"
        className="hidden md:flex flex-col w-64 glass-edge rounded-2xl p-4 h-[calc(100vh-96px)] sticky top-20 border border-white/5"
      >
        <div className="text-[11px] font-mono-code text-[#b9cbb9]/60 px-3 mb-3 tracking-wider uppercase">
          NAVIGATION
        </div>
        <nav className="flex flex-col gap-2">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`desktop-nav-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${
                  isActive
                    ? 'bg-[#00ff85] text-[#003919] font-bold shadow-[0_0_16px_rgba(0,255,133,0.3)]'
                    : 'text-[#e5e2e1]/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <span 
                  className={`material-symbols-outlined text-[22px] ${isActive ? 'text-[#003919]' : 'text-[#00e476] group-hover:scale-110 transition-transform'}`}
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {tab.icon}
                </span>
                <span className="font-mono-code text-sm font-semibold tracking-wide">
                  {tab.label.toUpperCase()}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Secondary section for Staff & Venue Sync */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="text-[11px] font-mono-code text-[#b9cbb9]/60 px-3 mb-2 tracking-wider uppercase">
            OPERATIONS
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => onSelectTab('staff')}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left text-sm ${
                currentTab === 'staff'
                  ? 'bg-white/10 text-[#00ff85] font-bold'
                  : 'text-[#b9cbb9]/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">group</span>
              <span className="font-mono-code text-xs">Staff Roster</span>
            </button>
            <button
              onClick={() => onSelectTab('sync')}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left text-sm ${
                currentTab === 'sync'
                  ? 'bg-white/10 text-[#00ff85] font-bold'
                  : 'text-[#b9cbb9]/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              <span className="font-mono-code text-xs">Device Sync</span>
            </button>
          </div>
        </div>

        {/* Bottom Compliance & Security info */}
        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/5">
            <span className="material-symbols-outlined text-[18px] text-[#00ff85]">lock</span>
            <div className="text-[10px] font-mono-code leading-tight text-[#b9cbb9]">
              <div>LOCAL ENCRYPTION</div>
              <div className="text-[#00ff85]/80">E2E PROTECTED</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
