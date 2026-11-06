import { useState, useEffect } from 'react';
import { ActiveTab, ScanRecord, StaffMember, VenueToken, HourlyStat, AppSettings } from './types';
import {
  useFirebaseScans,
  useFirebaseSettings,
  useFirebaseStaff,
  useFirebaseTokens,
  useFirebaseHourlyStats
} from './hooks/useFirebaseData';
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { ScannerView } from './components/ScannerView';
import { HistoryView } from './components/HistoryView';
import { ManualVerificationView } from './components/ManualVerificationView';
import { StatsView } from './components/StatsView';
import { StaffManagementView } from './components/StaffManagementView';
import { SettingsView } from './components/SettingsView';
import { PinLoginModal } from './components/PinLoginModal';

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<ActiveTab>('scanner');
  const [isLocked, setIsLocked] = useState(false);

  // Firebase State Hooks
  const { settings, updateSettings, adjustPatronCount } = useFirebaseSettings();
  const { scans, addScan, deleteScan, purgeScans } = useFirebaseScans(settings.autoPurgeHours);
  const { staffList, addStaff, deleteStaff, incrementStaffScanCount } = useFirebaseStaff();
  const { tokens, addToken, deleteToken } = useFirebaseTokens();
  const { hourlyStats, updateHourStat, resetStats } = useFirebaseHourlyStats();

  // Idle Auto-Lock Timer
  useEffect(() => {
    const lockMinutes = settings.autoLockMinutes ?? 5;
    if (lockMinutes <= 0 || isLocked) return;

    let timer: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsLocked(true);
      }, lockMinutes * 60 * 1000);
    };

    resetTimer();
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));

    return () => {
      clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [settings.autoLockMinutes, isLocked]);

  // Global Keyboard Navigation (Digital Signage protocol)
  useEffect(() => {
    const tabs: ActiveTab[] = ['scanner', 'history', 'manual', 'stats', 'staff', 'settings'];
    const handleKeyDown = (e: KeyboardEvent) => {
      // Input guard
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if (e.key === 'ArrowRight') {
        setCurrentTab((prev) => {
          const idx = tabs.indexOf(prev);
          return tabs[(idx + 1) % tabs.length];
        });
      } else if (e.key === 'ArrowLeft') {
        setCurrentTab((prev) => {
          const idx = tabs.indexOf(prev);
          return tabs[(idx - 1 + tabs.length) % tabs.length];
        });
      } else if (e.key === '0') {
        setIsLocked((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleSelectTab = (tab: ActiveTab) => {
    if ((settings.staffRole === 'WAIT STAFF' || settings.staffRole === 'WAIT_STAFF') && (tab === 'settings' || tab === 'staff' || tab === 'sync')) {
      setIsLocked(true);
      return;
    }
    setCurrentTab(tab);
  };

  const handleScanOrVerifyComplete = (record: ScanRecord) => {
    addScan(record);

    // Increment scan counter on active staff if exists
    if (settings.staffId) {
      incrementStaffScanCount(settings.staffId);
    }

    // Adjust live patron count on permitted entry
    if (record.status === 'PERMITTED') {
      adjustPatronCount(1);
    }

    // Update hourly stats volume
    const currentHourNumber = new Date().getHours();
    let hourKey = '11PM';
    if (currentHourNumber >= 20 && currentHourNumber < 21) hourKey = '8PM';
    else if (currentHourNumber >= 21 && currentHourNumber < 22) hourKey = '9PM';
    else if (currentHourNumber >= 22 && currentHourNumber < 23) hourKey = '10PM';
    else if (currentHourNumber >= 23) hourKey = '11PM';
    else if (currentHourNumber >= 0 && currentHourNumber < 1) hourKey = '12AM';
    else if (currentHourNumber >= 1) hourKey = '1AM';

    updateHourStat(
      hourKey, 
      record.status === 'PERMITTED' ? 1 : 0, 
      record.status !== 'PERMITTED' ? 1 : 0
    );
  };

  const handlePurgeHistory = () => {
    purgeScans();
  };

  const handleDeleteSingleScan = (id: string) => {
    deleteScan(id);
  };

  const handleAddStaff = (member: StaffMember) => {
    addStaff(member);
  };

  const handleDeleteStaff = (id: string) => {
    deleteStaff(id);
  };

  const handleDeleteToken = (id: string) => {
    deleteToken(id);
  };

  const handleGenerateToken = () => {
    const newToken: VenueToken = {
      id: `tok-${Date.now()}`,
      name: `Handheld Scanner #${Math.floor(10 + Math.random() * 90)}`,
      status: 'ACTIVE',
      syncedTime: 'JUST NOW',
      deviceId: `DEV-MOB-${Math.floor(100 + Math.random() * 900)}`,
    };
    addToken(newToken);
  };

  const handleResetShiftData = () => {
    resetStats();
  };

  const handleUpdateSettings = (updated: Partial<AppSettings>) => {
    updateSettings(updated);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e2e1] flex flex-col font-inter selection:bg-[#00ff85] selection:text-[#003919]">
      {/* Top App Bar */}
      <TopAppBar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onLockClick={() => setIsLocked(true)}
        settings={settings}
        onAdjustPatrons={adjustPatronCount}
      />

      {/* Main Layout Container */}
      <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 md:flex md:gap-6">
        {/* Desktop Sidebar / Navigation */}
        <BottomNavBar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          unreadCount={scans.filter((s) => s.status === 'DENIED').length}
        />

        {/* View Content Canvas */}
        <main className="flex-1 w-full pt-1 pb-24 md:pb-8">
          {currentTab === 'scanner' && (
            <ScannerView
              onScanComplete={handleScanOrVerifyComplete}
              onGoToManual={() => setCurrentTab('manual')}
              settings={settings}
            />
          )}

          {currentTab === 'history' && (
            <HistoryView
              scans={scans}
              onPurgeHistory={handlePurgeHistory}
              onDeleteScan={handleDeleteSingleScan}
              settings={settings}
            />
          )}

          {currentTab === 'manual' && (
            <ManualVerificationView
              onVerifyComplete={handleScanOrVerifyComplete}
              settings={settings}
            />
          )}

          {currentTab === 'stats' && (
            <StatsView
              scans={scans}
              hourlyStats={hourlyStats}
              onViewRefusals={() => setCurrentTab('history')}
              settings={settings}
            />
          )}

          {(currentTab === 'staff' || currentTab === 'sync') && (
            <StaffManagementView
              staffList={staffList}
              tokens={tokens}
              onAddStaff={handleAddStaff}
              onDeleteStaff={handleDeleteStaff}
              onGenerateToken={handleGenerateToken}
              onDeleteToken={handleDeleteToken}
              settings={settings}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetShiftData={handleResetShiftData}
              onNavigateTab={setCurrentTab}
            />
          )}
        </main>
      </div>

      {/* PIN Security Lock Modal */}
      <PinLoginModal
        isOpen={isLocked}
        onUnlock={() => setIsLocked(false)}
        settings={settings}
        staffList={staffList}
        onUpdateStaff={(name, id, role) => {
          updateSettings({ staffName: name, staffId: id, staffRole: role || 'ADMIN' });
        }}
      />
    </div>
  );
}
