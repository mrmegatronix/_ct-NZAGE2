import React, { useState } from 'react';
import { StaffMember, VenueToken, AppSettings } from '../types';
import { playSound } from '../utils/audio';

interface StaffManagementViewProps {
  staffList: StaffMember[];
  tokens: VenueToken[];
  onAddStaff: (member: StaffMember) => void;
  onGenerateToken: () => void;
  settings: AppSettings;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  staffList,
  tokens,
  onAddStaff,
  onGenerateToken,
  settings,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ROSTER' | 'SYNC'>('ROSTER');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'ADMIN' | 'SCANNER' | 'SUPERVISOR'>('SCANNER');
  const [qrCodeSeed, setQrCodeSeed] = useState(1);

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    const newMember: StaffMember = {
      id: `#${Math.floor(1000 + Math.random() * 9000)}`,
      name: newStaffName.trim(),
      role: newStaffRole,
      status: 'ACTIVE_NOW',
      lastActive: 'Just now',
      scansCount: 0,
      email: `${newStaffName.toLowerCase().replace(/\s+/g, '.')}@${settings.venueName.toLowerCase().replace(/[^a-z]/g, '')}.co.nz`,
    };

    onAddStaff(newMember);
    playSound('success', settings.audioFeedback);
    setNewStaffName('');
    setShowAddModal(false);
  };

  const handleGenerateNewCode = () => {
    playSound('click', settings.audioFeedback);
    setQrCodeSeed((prev) => prev + 1);
    onGenerateToken();
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-12">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSubTab('ROSTER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono-code text-xs font-bold transition-all ${
            activeSubTab === 'ROSTER'
              ? 'bg-[#00ff85] text-[#003919] shadow-[0_0_16px_rgba(0,255,133,0.3)]'
              : 'text-[#b9cbb9] hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">group</span>
          Staff Roster
        </button>

        <button
          onClick={() => setActiveSubTab('SYNC')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono-code text-xs font-bold transition-all ${
            activeSubTab === 'SYNC'
              ? 'bg-[#00ff85] text-[#003919] shadow-[0_0_16px_rgba(0,255,133,0.3)]'
              : 'text-[#b9cbb9] hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
          Sync &amp; Invite
        </button>
      </div>

      {activeSubTab === 'ROSTER' ? (
        <div>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="font-hanken text-2xl sm:text-3xl font-extrabold text-white">
                Staff Management
              </h2>
              <p className="font-inter text-xs sm:text-sm text-[#b9cbb9] mt-0.5">
                Manage team access, permissions, and shift duties.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto h-[48px] px-5 bg-[#00ff85] text-[#003919] font-mono-code text-xs font-extrabold rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,133,0.3)]"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              ADD NEW STAFF
            </button>
          </div>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffList.map((staff) => {
              const isAdmin = staff.role === 'ADMIN';
              const isActive = staff.status === 'ACTIVE_NOW';

              return (
                <div
                  key={staff.id}
                  className="glass-edge rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group border border-white/10 hover:border-[#00ff85]/40 transition-all duration-300 min-h-[160px]"
                >
                  {isAdmin && (
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00ff85]" />
                  )}

                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-[24px]">
                          {isAdmin ? 'admin_panel_settings' : 'badge'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-hanken text-lg font-bold text-white leading-tight mb-1">
                          {staff.name}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-code font-bold tracking-wider border ${
                            isAdmin
                              ? 'bg-[#00ff85]/10 text-[#00ff85] border-[#00ff85]/30'
                              : 'bg-white/5 text-[#b9cbb9] border-white/10'
                          }`}
                        >
                          {staff.role}
                        </span>
                      </div>
                    </div>

                    <button className="text-[#b9cbb9]/50 hover:text-white p-1">
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs font-mono-code">
                    <div className="flex items-center gap-1.5 text-[#b9cbb9]">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isActive ? 'bg-[#00ff85] animate-pulse' : 'bg-white/30'
                        }`}
                      />
                      <span className="text-[11px]">
                        {isActive ? 'ACTIVE NOW' : `LAST: ${staff.lastActive.toUpperCase()}`}
                      </span>
                    </div>

                    <span className="text-[11px] text-[#b9cbb9]/60">ID: {staff.id}</span>
                  </div>
                </div>
              );
            })}

            {/* Invite Staff Placeholder Card */}
            <div
              onClick={() => setShowAddModal(true)}
              className="glass-edge rounded-2xl p-5 flex flex-col items-center justify-center gap-2 border-dashed border-2 border-white/15 hover:border-[#00ff85]/50 cursor-pointer transition-all min-h-[160px] group active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-[#00ff85]/20 flex items-center justify-center text-[#b9cbb9] group-hover:text-[#00ff85] transition-colors">
                <span className="material-symbols-outlined text-[28px]">add</span>
              </div>
              <span className="font-mono-code text-xs font-bold text-[#b9cbb9] group-hover:text-white transition-colors">
                INVITE STAFF
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Sync & Invite View */
        <div className="flex flex-col items-center max-w-lg mx-auto">
          <div className="text-center mb-6 w-full">
            <h2 className="font-hanken text-2xl sm:text-3xl font-extrabold text-white mb-1">
              Sync &amp; Invite
            </h2>
            <p className="font-inter text-xs sm:text-sm text-[#b9cbb9]">
              Pair secondary handheld scanner or tablet to live shift stream.
            </p>
          </div>

          {/* QR Code Container */}
          <div className="relative w-full max-w-[280px] aspect-square flex flex-col items-center justify-center mb-6 p-6">
            {/* Animated Laser Frame */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#00ff85] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#00ff85] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-[#00ff85] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-[#00ff85] rounded-br-lg" />
            </div>

            {/* High-tech QR Code SVG representation */}
            <div className="glass-panel w-full h-full rounded-2xl flex flex-col items-center justify-center glow-green relative overflow-hidden bg-[#141414] p-4 border border-[#00ff85]/40">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full text-[#00ff85]"
                fill="currentColor"
              >
                {/* SVG Mock QR Code Pattern */}
                <rect x="5" y="5" width="25" height="25" fill="#00ff85" />
                <rect x="9" y="9" width="17" height="17" fill="#141414" />
                <rect x="13" y="13" width="9" height="9" fill="#00ff85" />

                <rect x="70" y="5" width="25" height="25" fill="#00ff85" />
                <rect x="74" y="9" width="17" height="17" fill="#141414" />
                <rect x="78" y="13" width="9" height="9" fill="#00ff85" />

                <rect x="5" y="70" width="25" height="25" fill="#00ff85" />
                <rect x="9" y="74" width="17" height="17" fill="#141414" />
                <rect x="13" y="78" width="9" height="9" fill="#00ff85" />

                {/* Random Data matrix cells */}
                <rect x="36" y="8" width="6" height="6" />
                <rect x="48" y="12" width="6" height="6" />
                <rect x="36" y="24" width="6" height="6" />
                <rect x="12" y="38" width="6" height="6" />
                <rect x="24" y="44" width="6" height="6" />
                <rect x="38" y="38" width="8" height="8" />
                <rect x="52" y="42" width="6" height="6" />
                <rect x="64" y="36" width="6" height="6" />
                <rect x="78" y="44" width="6" height="6" />
                <rect x="88" y="38" width="6" height="6" />
                <rect x="42" y="56" width="6" height="6" />
                <rect x="56" y="58" width="8" height="8" />
                <rect x="70" y="54" width="6" height="6" />
                <rect x="84" y="60" width="6" height="6" />
                <rect x="38" y="72" width="6" height="6" />
                <rect x="50" y="80" width="6" height="6" />
                <rect x="64" y="74" width="8" height="8" />
                <rect x="78" y="82" width="6" height="6" />
                <rect x="88" y="72" width="6" height="6" />
              </svg>

              <div className="absolute inset-x-0 bottom-2 text-center text-[9px] font-mono-code text-[#00ff85]/80">
                TOKEN #{qrCodeSeed}-NZ-{Date.now().toString().slice(-4)}
              </div>
            </div>

            <div className="absolute -bottom-3 bg-[#0a0a0a] px-3">
              <span className="font-mono-code text-[10px] font-bold text-[#00ff85] bg-[#00ff85]/10 px-3 py-1 rounded-full border border-[#00ff85]/30">
                Scan to Join Venue
              </span>
            </div>
          </div>

          {/* Generate New Code Action */}
          <button
            onClick={handleGenerateNewCode}
            className="w-full h-[52px] bg-[#00ff85] text-[#003919] font-hanken text-sm font-extrabold rounded-xl flex items-center justify-center gap-2 mb-6 active:scale-95 transition-transform shadow-[0_0_16px_rgba(0,255,133,0.3)]"
          >
            <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
            Generate New Code
          </button>

          {/* Active Venue Tokens List */}
          <div className="w-full">
            <h3 className="font-mono-code text-xs font-bold text-[#b9cbb9]/70 mb-2.5 border-b border-white/10 pb-2">
              ACTIVE VENUE TOKENS
            </h3>
            <div className="flex flex-col gap-2">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="glass-edge rounded-xl p-3.5 flex justify-between items-center border border-white/10 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center">
                    <div
                      className={`w-2.5 h-2.5 rounded-full mr-3 ${
                        token.status === 'ACTIVE'
                          ? 'bg-[#00ff85] shadow-[0_0_8px_#00ff85]'
                          : 'bg-[#feb700] shadow-[0_0_8px_#feb700]'
                      }`}
                    />
                    <div>
                      <p className="font-hanken text-sm font-bold text-white">
                        {token.name}
                      </p>
                      <p className="font-mono-code text-[10px] text-[#b9cbb9]/60">
                        SYNCED: {token.syncedTime} • {token.deviceId}
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#b9cbb9]/50 hover:text-white">
                    more_vert
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-white/15 rounded-2xl p-6 max-w-sm w-full glass-panel">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-hanken text-lg font-bold text-white">Add Team Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#b9cbb9] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block font-mono-code text-xs text-[#b9cbb9] mb-1">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Liam Cooper"
                  className="w-full bg-[#0e0e0e] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-inter text-sm focus:border-[#00ff85] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono-code text-xs text-[#b9cbb9] mb-1">
                  ASSIGNED ROLE
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) =>
                    setNewStaffRole(e.target.value as 'ADMIN' | 'SCANNER' | 'SUPERVISOR')
                  }
                  className="w-full bg-[#0e0e0e] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-inter text-sm focus:border-[#00ff85] focus:outline-none"
                >
                  <option value="SCANNER">Scanner (Door Staff)</option>
                  <option value="SUPERVISOR">Supervisor / Floor Lead</option>
                  <option value="ADMIN">Admin (Full Permissions)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white font-mono-code text-xs hover:bg-white/5"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#00ff85] text-[#003919] font-mono-code text-xs font-bold hover:bg-[#00ff85]/90"
                >
                  CREATE STAFF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
