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
  const { settings, updateSettings } = useFirebaseSettings();
  const { scans, addScan, deleteScan, purgeScans } = useFirebaseScans();
  const { staffList, addStaff } = useFirebaseStaff();
  const { tokens, addToken } = useFirebaseTokens();
  const { hourlyStats, updateHourStat, resetStats } = useFirebaseHourlyStats();

  // Handlers
  const handleScanOrVerifyComplete = (record: ScanRecord) => {
    addScan(record);

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
          updateSettings({ staffName: name, staffId: id });
        }}
      />
    </div>
  );
}
