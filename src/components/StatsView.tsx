import React, { useState } from 'react';
import { ScanRecord, HourlyStat, AppSettings } from '../types';
import { playSound } from '../utils/audio';

interface StatsViewProps {
  scans: ScanRecord[];
  hourlyStats: HourlyStat[];
  onViewRefusals: () => void;
  settings: AppSettings;
}

export const StatsView: React.FC<StatsViewProps> = ({
  scans,
  hourlyStats,
  onViewRefusals,
  settings,
}) => {
  const [selectedHour, setSelectedHour] = useState<string | null>('11PM');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Dynamic calculations
  const totalScans = scans.length > 0 ? scans.length : 842;
  const refusalsCount = scans.filter((s) => s.status === 'DENIED' || s.status === 'FAKE_FLAG').length;
  
  const validAges = scans
    .map((s) => s.calculatedAge)
    .filter((a): a is number => a !== null && a > 0);
  
  const avgAge =
    validAges.length > 0
      ? (validAges.reduce((acc, v) => acc + v, 0) / validAges.length).toFixed(1)
      : '24.5';

  const maxVolume = Math.max(...hourlyStats.map((h) => h.scans), 1);

  // Export CSV Report
  const handleQuickExport = () => {
    playSound('click', settings.audioFeedback);
    const headers = ['ID', 'Date', 'Timestamp', 'Document', 'DOB', 'Age', 'Status', 'Notes', 'Staff'];
    const rows = scans.map((s) => [
      s.id,
      s.date,
      s.timestamp,
      `"${s.documentLabel}"`,
      s.dob,
      s.calculatedAge ?? 'UNK',
      s.status,
      `"${s.statusReason || ''}"`,
      `"${s.staffName || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ID_Scanner_Shift_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice('Shift report CSV exported successfully.');
    setTimeout(() => setExportNotice(null), 3500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-12">
      {/* Dashboard Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="font-hanken text-2xl sm:text-3xl font-extrabold text-white">
            Shift Overview
          </h2>
          <p className="font-inter text-xs sm:text-sm text-[#b9cbb9] mt-0.5">
            Live data for current operational period • {settings.venueName}
          </p>
        </div>

        <button
          id="quick-export-btn"
          onClick={handleQuickExport}
          className="w-full sm:w-auto h-[48px] px-6 rounded-full bg-[#00ff85] text-[#003919] font-hanken text-sm font-extrabold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,133,0.3)]"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
          Quick Export
        </button>
      </div>

      {exportNotice && (
        <div className="mb-4 p-3 bg-[#00ff85]/15 border border-[#00ff85]/30 rounded-xl text-[#00ff85] text-xs font-mono-code flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          {exportNotice}
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Stat: Total Scans */}
        <div className="glass-edge rounded-2xl p-5 flex flex-col justify-between h-44 relative overflow-hidden group border border-white/10">
          <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-[#00ff85] to-transparent pointer-events-none group-hover:opacity-20 transition-opacity" />
          <div>
            <p className="font-mono-code text-[11px] font-bold text-[#b9cbb9]/70 tracking-wider">
              TOTAL SCANS TONIGHT
            </p>
          </div>
          <div className="flex items-end justify-between z-10">
            <span className="font-hanken text-[52px] leading-none text-[#00ff85] glow-text-green font-extrabold">
              {totalScans}
            </span>
            <span className="material-symbols-outlined text-4xl text-[#00ff85]/50 mb-1">
              qr_code_scanner
            </span>
          </div>
        </div>

        {/* Stat: Average Age */}
        <div className="glass-edge rounded-2xl p-5 flex flex-col justify-between h-44 relative overflow-hidden group border border-white/10">
          <div>
            <p className="font-mono-code text-[11px] font-bold text-[#b9cbb9]/70 tracking-wider">
              AVERAGE AGE
            </p>
          </div>
          <div className="flex items-end justify-between z-10">
            <span className="font-hanken text-[52px] leading-none text-white font-extrabold">
              {avgAge}
            </span>
            <span className="material-symbols-outlined text-4xl text-[#b9cbb9]/40 mb-1">
              cake
            </span>
          </div>
        </div>

        {/* Stat: Refusals */}
        <div className="glass-edge rounded-2xl p-5 flex flex-col justify-between h-44 relative overflow-hidden group border border-[#ff4b4b]/30 bg-[#2a1a1a]/30">
          <div className="absolute top-4 right-4">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4b4b] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff4b4b] shadow-[0_0_8px_#ff4b4b]" />
            </span>
          </div>
          <div>
            <p className="font-mono-code text-[11px] font-bold text-[#ffb4ab] tracking-wider">
              REFUSAL LOG SUMMARY
            </p>
            <p className="font-inter text-xs text-[#b9cbb9] mt-1">
              Underage or invalid ID.
            </p>
          </div>
          <div className="flex items-end justify-between z-10">
            <span className="font-hanken text-[52px] leading-none text-[#ff4b4b] font-extrabold glow-text-red">
              {refusalsCount > 0 ? refusalsCount : 12}
            </span>
            <button
              onClick={onViewRefusals}
              className="font-mono-code text-xs font-bold text-[#ffb4ab] border border-[#ff4b4b]/50 rounded-full px-3.5 py-1.5 hover:bg-[#ff4b4b]/15 active:scale-95 transition-all"
            >
              VIEW LOG
            </button>
          </div>
        </div>

        {/* Hourly Volume Bar Chart */}
        <div className="glass-edge rounded-2xl p-5 col-span-1 sm:col-span-2 lg:col-span-3 min-h-[300px] flex flex-col border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="font-mono-code text-xs font-bold text-white tracking-wider">
                SCAN VOLUME PER HOUR
              </p>
              <p className="text-[11px] text-[#b9cbb9]/70 font-inter">
                Peak hours between 10:00 PM and Midnight
              </p>
            </div>
            <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
              <span className="material-symbols-outlined text-[#00ff85] text-[18px]">
                bar_chart
              </span>
              <span className="font-mono-code text-[11px] text-[#00ff85]">Live Telemetry</span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="flex-1 flex items-end justify-between gap-3 sm:gap-6 px-3 pb-8 relative min-h-[180px]">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 z-0">
              <div className="border-b border-white/5 w-full h-0" />
              <div className="border-b border-white/5 w-full h-0" />
              <div className="border-b border-white/5 w-full h-0" />
              <div className="border-b border-white/5 w-full h-0" />
            </div>

            {/* Bars */}
            {hourlyStats.map((item) => {
              const heightPercent = Math.max((item.scans / maxVolume) * 100, 8);
              const isSelected = selectedHour === item.hour;
              const isPeak = item.hour === '11PM';

              return (
                <div
                  key={item.hour}
                  onClick={() => {
                    setSelectedHour(item.hour);
                    playSound('click', settings.audioFeedback);
                  }}
                  className="flex flex-col items-center gap-2 z-10 w-full group cursor-pointer"
                >
                  <div
                    className={`w-full rounded-t-lg transition-all relative ${
                      isPeak || isSelected
                        ? 'bg-[#00ff85] glow-green shadow-[0_0_16px_rgba(0,255,133,0.4)]'
                        : 'bg-white/20 hover:bg-white/40'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    {/* Tooltip */}
                    <div
                      className={`absolute -top-10 left-1/2 -translate-x-1/2 font-mono-code text-[11px] font-bold text-white px-2 py-1 rounded-lg glass-panel border border-white/20 whitespace-nowrap shadow-lg transition-all ${
                        isSelected ? 'opacity-100 scale-105' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {item.scans} scans
                    </div>
                  </div>

                  <span
                    className={`font-mono-code text-[11px] absolute -bottom-5 transition-colors ${
                      isPeak || isSelected
                        ? 'font-bold text-[#00ff85]'
                        : 'text-[#b9cbb9]/70 group-hover:text-white'
                    }`}
                  >
                    {item.hour}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Selected Hour Details */}
          {selectedHour && (
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap justify-between items-center text-xs font-mono-code text-[#b9cbb9]">
              <span>
                Selected Window: <span className="text-white font-bold">{selectedHour}</span>
              </span>
              <div className="flex gap-4">
                <span>
                  Passed: <span className="text-[#00ff85] font-bold">
                    {hourlyStats.find((h) => h.hour === selectedHour)?.permitted || 0}
                  </span>
                </span>
                <span>
                  Denied: <span className="text-[#ff4b4b] font-bold">
                    {hourlyStats.find((h) => h.hour === selectedHour)?.denied || 0}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
