import { StaffMember, VenueToken, AppSettings } from '../types';

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: '#1001',
    name: 'Liam Cooper',
    role: 'ADMIN',
    status: 'ACTIVE_NOW',
    lastActive: 'Just now',
    scansCount: 42,
    email: 'l.cooper@coasterstavern.co.nz',
    pin: '1234',
  },
  {
    id: '#1002',
    name: 'Sarah Jenkins',
    role: 'SUPERVISOR',
    status: 'ACTIVE_NOW',
    lastActive: '12m ago',
    scansCount: 28,
    email: 's.jenkins@coasterstavern.co.nz',
    pin: '2222',
  },
  {
    id: '#1003',
    name: 'Marcus Vance',
    role: 'SCANNER',
    status: 'ACTIVE_NOW',
    lastActive: '5m ago',
    scansCount: 65,
    email: 'm.vance@coasterstavern.co.nz',
    pin: '3333',
  },
  {
    id: '#1004',
    name: 'Chloe Davies',
    role: 'WAIT STAFF',
    status: 'ACTIVE_NOW',
    lastActive: 'Just now',
    scansCount: 19,
    email: 'c.davies@coasterstavern.co.nz',
    pin: '4444',
  },
];

export const INITIAL_TOKENS: VenueToken[] = [
  {
    id: 'tok-main-door',
    name: 'Main Entrance Handheld #1',
    status: 'ACTIVE',
    syncedTime: 'JUST NOW',
    deviceId: 'DEV-IPAD-01',
  },
  {
    id: 'tok-patio-gate',
    name: 'Patio & Garden Bar Scanner',
    status: 'ACTIVE',
    syncedTime: '2M AGO',
    deviceId: 'DEV-MOB-04',
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  minAge: 18,
  venueName: 'COASTERS TAVERN',
  autoPurgeHours: 24,
  audioFeedback: true,
  hapticFeedback: true,
  scannerStyle: 'cyber-bracket',
  torchEnabled: false,
  staffName: 'Liam Cooper',
  staffId: '#1001',
  staffRole: 'ADMIN',
  venueCapacity: 150,
  currentPatronCount: 0,
  autoLockMinutes: 5,
};
