import React, { useState } from 'react';
import { ScanRecord, AppSettings } from '../types';
import { playSound } from '../utils/audio';

interface HistoryViewProps {
  scans: ScanRecord[];
  onPurgeHistory: () => void;
  onDeleteScan?: (id: string) => void;
  settings: AppSettings;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  scans,
  onPurgeHistory,
  onDeleteScan,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'FLAGGED' | 'MANUAL' | 'PERMITTED'>('ALL');
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  const filteredScans = scans.filter((scan) => {
    // Filter by type
    if (filterType === 'FLAGGED' && scan.status !== 'DENIED' && scan.status !== 'FAKE_FLAG') {
      return false;
    }
    if (filterType === 'MANUAL' && !scan.isManual && scan.status !== 'CHECK_DATE') {
      return false;
    }
    if (filterType === 'PERMITTED' && scan.status !== 'PERMITTED') {
      return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        scan.timestamp.toLowerCase().includes(q) ||
        scan.documentLabel.toLowerCase().includes(q) ||
        scan.dob.toLowerCase().includes(q) ||
        (scan.calculatedAge && scan.calculatedAge.toString().includes(q)) ||
        (scan.documentNumber && scan.documentNumber.toLowerCase().includes(q)) ||
        (scan.staffName && scan.staffName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handlePurge = () => {
    playSound('denied', settings.audioFeedback);
    onPurgeHistory();
    setShowPurgeConfirm(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-12">
      {/* Search Bar & Sticky Filters Header */}
      <section className="mb-4 sticky top-[64px] bg-[#0a0a0a]/90 backdrop-blur-md z-30 pt-2 pb-2">
        <div className="relative rounded-2xl glass-edge p-[1px] flex items-center mb-3">
          <span className="material-symbols-outlined text-[#b9cbb9] ml-4 absolute pointer-events-none text-[20px]">
            search
          </span>
          <input
            type="text"
            id="history-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID or Timestamp..."
            className="w-full bg-transparent border-none text-white font-inter pl-11 pr-4 py-3 h-[48px] rounded-2xl focus:ring-0 focus:outline-none placeholder-[#b9cbb9]/50 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mr-3 text-[#b9cbb9] hover:text-white"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterType('ALL')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full whitespace-nowrap font-mono-code text-xs transition-all border ${
              filterType === 'ALL'
                ? 'bg-[#00ff85]/20 text-[#00ff85] border-[#00ff85]/40 font-bold'
                : 'bg-[#1a1a1a] text-[#b9cbb9] border-white/10 hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
            All Scans ({scans.length})
          </button>

          <button
            onClick={() => setFilterType('FLAGGED')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full whitespace-nowrap font-mono-code text-xs transition-all border ${
              filterType === 'FLAGGED'
                ? 'bg-[#ff4b4b]/20 text-[#ffb4ab] border-[#ff4b4b]/50 font-bold'
                : 'bg-[#ff4b4b]/5 text-[#ffb4ab]/80 border-[#ff4b4b]/20 hover:bg-[#ff4b4b]/10'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">block</span>
            Flagged (Underage)
          </button>

          <button
            onClick={() => setFilterType('MANUAL')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full whitespace-nowrap font-mono-code text-xs transition-all border ${
              filterType === 'MANUAL'
                ? 'bg-[#feb700]/20 text-[#feb700] border-[#feb700]/50 font-bold'
                : 'bg-[#feb700]/5 text-[#ffdb9d]/80 border-[#feb700]/20 hover:bg-[#feb700]/10'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">warning</span>
            Manual Checks
          </button>

          <button
            onClick={() => setFilterType('PERMITTED')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full whitespace-nowrap font-mono-code text-xs transition-all border ${
              filterType === 'PERMITTED'
                ? 'bg-[#00ff85]/20 text-[#00ff85] border-[#00ff85]/50 font-bold'
                : 'bg-[#00ff85]/5 text-[#00ff85]/80 border-[#00ff85]/20 hover:bg-[#00ff85]/10'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Permitted
          </button>
        </div>
      </section>

      {/* Compliance Log List */}
      <section className="flex flex-col gap-2.5 mb-8">
        {filteredScans.length === 0 ? (
          <div className="text-center py-12 glass-edge rounded-2xl p-6">
            <span className="material-symbols-outlined text-[40px] text-[#b9cbb9]/40 mb-2">
              history_toggle_off
            </span>
            <p className="font-hanken text-base text-white font-semibold">No Scan Records Found</p>
            <p className="text-xs text-[#b9cbb9]/70 font-inter mt-1">
              Try adjusting your filter or search query.
            </p>
          </div>
        ) : (
          filteredScans.map((scan) => {
            const isDenied = scan.status === 'DENIED' || scan.status === 'FAKE_FLAG';
            const isCheckDate = scan.status === 'CHECK_DATE';

            return (
              <div
                key={scan.id}
                onClick={() => setSelectedScan(scan)}
                className={`glass-edge rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 active:scale-[0.99] transition-all border ${
                  isCheckDate
                    ? 'border-l-4 border-l-[#feb700] border-white/10'
                    : isDenied
                    ? 'border-l-4 border-l-[#ff4b4b] border-white/10'
                    : 'border-white/10 hover:border-[#00ff85]/30'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Status Indicator Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                      isDenied
                        ? 'bg-[#ff4b4b]/15 border-[#ff4b4b]/30 text-[#ff4b4b]'
                        : isCheckDate
                        ? 'bg-[#feb700]/15 border-[#feb700]/30 text-[#feb700]'
                        : 'bg-[#00ff85]/15 border-[#00ff85]/30 text-[#00ff85]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isDenied ? 'block' : isCheckDate ? 'warning' : 'check'}
                    </span>
                  </div>

                  <div>
                    <div
                      className={`font-hanken text-base font-bold leading-snug ${
                        isDenied
                          ? 'text-[#ffb4ab]'
                          : isCheckDate
                          ? 'text-[#ffdb9d]'
                          : 'text-white'
                      }`}
                    >
                      {scan.status === 'DENIED'
                        ? 'ACCESS DENIED'
                        : scan.status === 'FAKE_FLAG'
                        ? 'ACCESS DENIED (FAKE ID)'
                        : scan.status === 'CHECK_DATE'
                        ? 'CHECK DATE'
                        : 'ENTRY PERMITTED'}
                    </div>

                    <div className="font-mono-code text-[11px] text-[#b9cbb9]/70 flex items-center gap-2 mt-0.5">
                      <span>{scan.timestamp}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">
                          {scan.documentType === 'NZ_Passport' || scan.documentType === 'Intl_Passport'
                            ? 'menu_book'
                            : scan.documentType === 'R18_Card'
                            ? 'contact_emergency'
                            : 'badge'}
                        </span>
                        {scan.documentLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-mono-code text-xs font-bold ${
                      isDenied
                        ? 'text-[#ff4b4b]'
                        : isCheckDate
                        ? 'text-[#feb700]'
                        : 'text-[#00ff85]'
                    }`}
                  >
                    AGE: {scan.calculatedAge !== null ? `${scan.calculatedAge}${isCheckDate ? '?' : ''}` : 'UNK'}
                  </div>
                  <div className="font-inter text-xs text-[#b9cbb9]/60">
                    DOB: {scan.dob}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Privacy & Compliance Section */}
      <section className="glass-edge rounded-2xl p-5 border border-white/10">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#00ff85]/10 flex items-center justify-center flex-shrink-0 border border-[#00ff85]/20 text-[#00ff85]">
            <span className="material-symbols-outlined text-[22px]">encrypted</span>
          </div>

          <div className="flex-1">
            <h3 className="font-hanken text-base font-bold text-white mb-1">
              Privacy &amp; Compliance
            </h3>
            <p className="text-xs text-[#b9cbb9]/80 font-inter leading-relaxed mb-4">
              All scan data is end-to-end encrypted. Personal details are automatically purged after {settings.autoPurgeHours} hours in accordance with local privacy regulations.
            </p>

            <button
              onClick={() => setShowPurgeConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-[#ff4b4b]/40 text-[#ffb4ab] rounded-xl font-mono-code text-xs font-bold hover:bg-[#ff4b4b]/10 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              Purge History Now
            </button>
          </div>
        </div>
      </section>

      {/* Purge Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-[#ff4b4b]/40 rounded-2xl p-6 max-w-sm w-full glow-red">
            <div className="w-12 h-12 rounded-full bg-[#ff4b4b]/20 flex items-center justify-center text-[#ff4b4b] mx-auto mb-3">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <h3 className="text-center font-hanken text-lg font-bold text-white mb-1">
              Purge Compliance Log?
            </h3>
            <p className="text-center text-xs text-[#b9cbb9] mb-5">
              This will permanently delete all {scans.length} scan records from local storage. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPurgeConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white font-mono-code text-xs hover:bg-white/5"
              >
                CANCEL
              </button>
              <button
                onClick={handlePurge}
                className="flex-1 py-2.5 rounded-xl bg-[#ff4b4b] text-white font-mono-code text-xs font-bold hover:bg-[#ff4b4b]/90"
              >
                CONFIRM PURGE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan Detail Modal */}
      {selectedScan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-white/15 rounded-2xl p-6 max-w-md w-full glass-panel">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-[24px] ${
                    selectedScan.status === 'PERMITTED'
                      ? 'text-[#00ff85]'
                      : selectedScan.status === 'CHECK_DATE'
                      ? 'text-[#feb700]'
                      : 'text-[#ff4b4b]'
                  }`}
                >
                  {selectedScan.status === 'PERMITTED'
                    ? 'verified'
                    : selectedScan.status === 'CHECK_DATE'
                    ? 'warning'
                    : 'gpp_bad'}
                </span>
                <span className="font-hanken text-lg font-bold text-white">
                  Scan Record #{selectedScan.id.slice(-4)}
                </span>
              </div>
              <button
                onClick={() => setSelectedScan(null)}
                className="text-[#b9cbb9] hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 font-mono-code text-xs text-[#b9cbb9] mb-5">
              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl">
                <span>VERDICT</span>
                <span
                  className={`font-bold ${
                    selectedScan.status === 'PERMITTED'
                      ? 'text-[#00ff85]'
                      : selectedScan.status === 'CHECK_DATE'
                      ? 'text-[#feb700]'
                      : 'text-[#ff4b4b]'
                  }`}
                >
                  {selectedScan.status}
                </span>
              </div>

              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl">
                <span>CALCULATED AGE</span>
                <span className="text-white font-bold text-sm">
                  {selectedScan.calculatedAge !== null ? `${selectedScan.calculatedAge} Years` : 'Unknown'}
                </span>
              </div>

              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl">
                <span>DATE OF BIRTH</span>
                <span className="text-white font-bold">{selectedScan.dob}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl">
                <span>DOCUMENT TYPE</span>
                <span className="text-white">{selectedScan.documentLabel}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl">
                <span>TIMESTAMP</span>
                <span className="text-white">{selectedScan.date} at {selectedScan.timestamp}</span>
              </div>

              <div className="flex justify-between p-2.5 bg-white/5 rounded-xl">
                <span>STAFF OPERATOR</span>
                <span className="text-white">{selectedScan.staffName || 'Door Security'}</span>
              </div>

              {selectedScan.statusReason && (
                <div className="p-2.5 bg-white/5 rounded-xl">
                  <div className="text-[10px] text-white/50 mb-0.5">COMPLIANCE NOTES</div>
                  <div className="text-white">{selectedScan.statusReason}</div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {onDeleteScan && (
                <button
                  onClick={() => {
                    onDeleteScan(selectedScan.id);
                    setSelectedScan(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[#ff4b4b]/30 text-[#ffb4ab] text-xs font-mono-code hover:bg-[#ff4b4b]/10"
                >
                  Delete Record
                </button>
              )}
              <button
                onClick={() => setSelectedScan(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#00ff85] text-[#003919] font-mono-code text-xs font-bold hover:bg-[#00ff85]/90 text-center"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
