import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { StaffMember, VenueToken, AppSettings, StaffRole } from '../types';
import { playSound } from '../utils/audio';

interface StaffManagementViewProps {
  staffList: StaffMember[];
  tokens: VenueToken[];
  onAddStaff: (member: StaffMember) => void;
  onDeleteStaff?: (id: string) => void;
  onGenerateToken: () => void;
  onDeleteToken?: (id: string) => void;
  settings: AppSettings;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  staffList,
  tokens,
  onAddStaff,
  onDeleteStaff,
  onGenerateToken,
  onDeleteToken,
  settings,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ROSTER' | 'SYNC'>('ROSTER');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('1234');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('SCANNER');
  const [qrCodeSeed, setQrCodeSeed] = useState(1);
  const [createdToast, setCreatedToast] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeTokenString = `TOKEN-${qrCodeSeed}-${settings.venueName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;

  useEffect(() => {
    if (activeSubTab === 'SYNC' && qrCanvasRef.current) {
      const pairingUrl = `${window.location.origin}${window.location.pathname}?venue=${encodeURIComponent(settings.venueName)}&pair=${activeTokenString}`;
      QRCode.toCanvas(qrCanvasRef.current, pairingUrl, {
        width: 220,
        margin: 1,
        color: {
          dark: '#00ff85',
          light: '#141414',
        },
      }).catch((err) => {
        console.error('QR code generation error:', err);
      });
    }
  }, [activeSubTab, qrCodeSeed, settings.venueName, activeTokenString]);

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newStaffName.trim();
    if (!cleanName) return;

    const finalPin = (newStaffPin.trim() || '1234').padEnd(4, '0').slice(0, 4);

    const newMember: StaffMember = {
      id: `#${Math.floor(1000 + Math.random() * 9000)}`,
      name: cleanName,
      role: newStaffRole,
      status: 'ACTIVE_NOW',
      lastActive: 'Just now',
      scansCount: 0,
      email: `${cleanName.toLowerCase().replace(/\s+/g, '.')}@${settings.venueName.toLowerCase().replace(/[^a-z]/g, '')}.co.nz`,
      pin: finalPin,
    };

    onAddStaff(newMember);
    playSound('success', settings.audioFeedback);
    setCreatedToast(`${cleanName} (${newStaffRole}) added to roster!`);
    setTimeout(() => setCreatedToast(null), 3000);
    setNewStaffName('');
    setNewStaffPin('1234');
    setShowAddModal(false);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(activeTokenString).then(() => {
      setCopiedToken(true);
      playSound('click', settings.audioFeedback);
      setTimeout(() => setCopiedToken(false), 2000);
    });
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

      {createdToast && (
        <div className="mb-4 p-3 bg-[#00ff85]/15 border border-[#00ff85]/40 rounded-xl text-[#00ff85] font-mono-code text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,133,0.2)]">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{createdToast}</span>
        </div>
      )}

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
                          {isAdmin ? 'admin_panel_settings' : (staff.role === 'WAIT STAFF' || staff.role === 'WAIT_STAFF') ? 'restaurant' : 'badge'}
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

                    {onDeleteStaff && (
                      <button 
                        onClick={() => onDeleteStaff(staff.id)}
                        className="text-[#b9cbb9]/50 hover:text-[#ff4b4b] p-1 transition-colors"
                        title="Remove Staff"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    )}
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
          <div className="relative w-full max-w-[280px] aspect-square flex flex-col items-center justify-center mb-6 p-4">
            {/* Animated Laser Frame */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#00ff85] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#00ff85] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-[#00ff85] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-[#00ff85] rounded-br-lg" />
            </div>

            {/* Live Functional QR Code Canvas */}
            <div className="glass-panel w-full h-full rounded-2xl flex flex-col items-center justify-center glow-green relative overflow-hidden bg-[#141414] p-3 border border-[#00ff85]/40">
              <canvas
                ref={qrCanvasRef}
                className="max-w-[200px] max-h-[200px] w-full h-full rounded-xl"
              />
              <div className="mt-1 text-center text-[10px] font-mono-code text-[#00ff85] tracking-wider truncate max-w-full px-2">
                {activeTokenString}
              </div>
            </div>

            <div className="absolute -bottom-3 bg-[#0a0a0a] px-3 z-10">
              <span className="font-mono-code text-[10px] font-bold text-[#00ff85] bg-[#00ff85]/10 px-3 py-1 rounded-full border border-[#00ff85]/30">
                Scan with Camera to Pair
              </span>
            </div>
          </div>

          {/* Token Actions: Copy & Refresh */}
          <div className="w-full flex gap-2 mb-6">
            <button
              onClick={handleCopyToken}
              className="flex-1 h-[48px] bg-white/10 hover:bg-white/15 text-white font-mono-code text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copiedToken ? 'check' : 'content_copy'}
              </span>
              {copiedToken ? 'COPIED!' : 'COPY TOKEN'}
            </button>
            <button
              onClick={handleGenerateNewCode}
              className="flex-1 h-[48px] bg-[#00ff85] text-[#003919] font-mono-code text-xs font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_16px_rgba(0,255,133,0.3)]"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
              NEW CODE
            </button>
          </div>

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
                  {onDeleteToken && (
                    <button 
                      onClick={() => onDeleteToken(token.id)}
                      className="text-[#b9cbb9]/50 hover:text-[#ff4b4b] p-1 transition-colors"
                      title="Revoke Token"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  )}
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
                  4-DIGIT SECURITY PIN
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={newStaffPin}
                  onChange={(e) => setNewStaffPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="e.g. 1234"
                  className="w-full bg-[#0e0e0e] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono-code text-sm tracking-widest focus:border-[#00ff85] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono-code text-xs text-[#b9cbb9] mb-1">
                  ASSIGNED ROLE
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) =>
                    setNewStaffRole(e.target.value as StaffRole)
                  }
                  className="w-full bg-[#0e0e0e] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-inter text-sm focus:border-[#00ff85] focus:outline-none"
                >
                  <option value="SCANNER">Scanner (Door Staff)</option>
                  <option value="SUPERVISOR">Supervisor / Floor Lead</option>
                  <option value="WAIT STAFF">Wait Staff</option>
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
