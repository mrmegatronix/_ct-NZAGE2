import { useState, useEffect } from 'react';
import { ActiveTab, ScanRecord, StaffMember, VenueToken, HourlyStat, AppSettings } from './types';
import {
  INITIAL_SETTINGS,
  INITIAL_SCANS,
  INITIAL_STAFF,
  INITIAL_TOKENS,
  INITIAL_HOURLY,
} from './data/initialData';
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

  // App Settings with LocalStorage persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('id_scanner_settings');
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  // Scan Records with LocalStorage persistence
  const [scans, setScans] = useState<ScanRecord[]>(() => {
    try {
      const saved = localStorage.getItem('id_scanner_scans');
      return saved ? JSON.parse(saved) : INITIAL_SCANS;
    } catch {
      return INITIAL_SCANS;
    }
  });

  // Staff members
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    try {
      const saved = localStorage.getItem('id_scanner_staff');
      return saved ? JSON.parse(saved) : INITIAL_STAFF;
    } catch {
      return INITIAL_STAFF;
    }
  });

  // Venue tokens
  const [tokens, setTokens] = useState<VenueToken[]>(() => {
    try {
      const saved = localStorage.getItem('id_scanner_tokens');
      return saved ? JSON.parse(saved) : INITIAL_TOKENS;
    } catch {
      return INITIAL_TOKENS;
    }
  });

  // Hourly Stats
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>(() => {
    try {
      const saved = localStorage.getItem('id_scanner_hourly');
      return saved ? JSON.parse(saved) : INITIAL_HOURLY;
    } catch {
      return INITIAL_HOURLY;
    }
  });

  // Synchronize to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('id_scanner_settings', JSON.stringify(settings));
    } catch {
      // Storage quota or private mode
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('id_scanner_scans', JSON.stringify(scans));
    } catch {
      // Storage quota
    }
  }, [scans]);

  useEffect(() => {
    try {
      localStorage.setItem('id_scanner_staff', JSON.stringify(staffList));
    } catch {
      // Storage quota
    }
  }, [staffList]);

  useEffect(() => {
    try {
      localStorage.setItem('id_scanner_tokens', JSON.stringify(tokens));
    } catch {
      // Storage quota
    }
  }, [tokens]);

  useEffect(() => {
    try {
      localStorage.setItem('id_scanner_hourly', JSON.stringify(hourlyStats));
    } catch {
      // Storage quota
    }
  }, [hourlyStats]);

  // Handlers
  const handleScanOrVerifyComplete = (record: ScanRecord) => {
    setScans((prev) => [record, ...prev]);

    // Update hourly stats volume
    const currentHourNumber = new Date().getHours();
    let hourKey = '11PM';
    if (currentHourNumber >= 20 && currentHourNumber < 21) hourKey = '8PM';
    else if (currentHourNumber >= 21 && currentHourNumber < 22) hourKey = '9PM';
    else if (currentHourNumber >= 22 && currentHourNumber < 23) hourKey = '10PM';
    else if (currentHourNumber >= 23) hourKey = '11PM';
    else if (currentHourNumber >= 0 && currentHourNumber < 1) hourKey = '12AM';
    else if (currentHourNumber >= 1) hourKey = '1AM';

    setHourlyStats((prev) =>
      prev.map((item) => {
        if (item.hour === hourKey) {
          return {
            ...item,
            scans: item.scans + 1,
            permitted: record.status === 'PERMITTED' ? item.permitted + 1 : item.permitted,
            denied: record.status !== 'PERMITTED' ? item.denied + 1 : item.denied,
          };
        }
        return item;
      })
    );
  };

  const handlePurgeHistory = () => {
    setScans([]);
  };

  const handleDeleteSingleScan = (id: string) => {
    setScans((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddStaff = (member: StaffMember) => {
    setStaffList((prev) => [member, ...prev]);
  };

  const handleGenerateToken = () => {
    const newToken: VenueToken = {
      id: `tok-${Date.now()}`,
      name: `Handheld Scanner #${Math.floor(10 + Math.random() * 90)}`,
      status: 'ACTIVE',
      syncedTime: 'JUST NOW',
      deviceId: `DEV-MOB-${Math.floor(100 + Math.random() * 900)}`,
    };
    setTokens((prev) => [newToken, ...prev]);
  };

  const handleResetShiftData = () => {
    setHourlyStats([
      { hour: '8PM', scans: 0, permitted: 0, denied: 0 },
      { hour: '9PM', scans: 0, permitted: 0, denied: 0 },
      { hour: '10PM', scans: 0, permitted: 0, denied: 0 },
      { hour: '11PM', scans: 0, permitted: 0, denied: 0 },
      { hour: '12AM', scans: 0, permitted: 0, denied: 0 },
      { hour: '1AM', scans: 0, permitted: 0, denied: 0 },
    ]);
  };

  const handleUpdateSettings = (updated: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e2e1] flex flex-col font-inter selection:bg-[#00ff85] selection:text-[#003919]">
      {/* Top App Bar */}
      <TopAppBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onLockClick={() => setIsLocked(true)}
        settings={settings}
      />

      {/* Main Layout Container */}
      <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 md:flex md:gap-6">
        {/* Desktop Sidebar / Navigation */}
        <BottomNavBar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
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
              onGenerateToken={handleGenerateToken}
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
        onUpdateStaff={(name, id) => {
          setSettings((prev) => ({ ...prev, staffName: name, staffId: id }));
        }}
      />
    </div>
  );
}
