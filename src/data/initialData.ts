import { ScanRecord, StaffMember, VenueToken, HourlyStat, AppSettings } from '../types';

export const INITIAL_SETTINGS: AppSettings = {
  minAge: 18,
  venueName: 'AETHER HOSPITALITY & LOUNGE',
  autoPurgeHours: 24,
  audioFeedback: true,
  hapticFeedback: true,
  scannerStyle: 'cyber-bracket',
  torchEnabled: false,
  staffName: 'Sarah Jenkins',
  staffId: '#4928'
};

export const INITIAL_SCANS: ScanRecord[] = [
  {
    id: 'scan-1',
    timestamp: '22:45:12',
    date: '2026-08-28',
    documentType: 'NZDL',
    documentLabel: 'NZDL',
    dob: '12.04.2007',
    calculatedAge: 17,
    status: 'DENIED',
    statusReason: 'Underage (17 years old)',
    isManual: false,
    documentNumber: 'DL-9842103-NZ',
    gender: 'M',
    staffName: 'Sarah Jenkins'
  },
  {
    id: 'scan-2',
    timestamp: '22:43:05',
    date: '2026-08-28',
    documentType: 'NZ_Passport',
    documentLabel: 'NZ Passport',
    dob: '05.08.1999',
    calculatedAge: 24,
    status: 'PERMITTED',
    statusReason: 'Verified Legal Adult',
    isManual: false,
    documentNumber: 'PA-541289-NZ',
    gender: 'F',
    staffName: 'Sarah Jenkins'
  },
  {
    id: 'scan-3',
    timestamp: '22:40:18',
    date: '2026-08-28',
    documentType: 'Intl_ID',
    documentLabel: 'Intl ID (Manual)',
    dob: '23.10.2005',
    calculatedAge: 18,
    status: 'CHECK_DATE',
    statusReason: 'Recent Birthday / Secondary check required',
    isManual: true,
    documentNumber: 'ID-UK-882194',
    gender: 'M',
    staffName: 'Mike Torres'
  },
  {
    id: 'scan-4',
    timestamp: '22:38:55',
    date: '2026-08-28',
    documentType: 'R18_Card',
    documentLabel: '18+ Card',
    dob: '14.02.1993',
    calculatedAge: 31,
    status: 'PERMITTED',
    statusReason: 'Kiwi Access 18+ Verified',
    isManual: false,
    documentNumber: 'KA-3940192',
    gender: 'F',
    staffName: 'Sarah Jenkins'
  },
  {
    id: 'scan-5',
    timestamp: '22:30:44',
    date: '2026-08-28',
    documentType: 'Other',
    documentLabel: 'Fake ID Flag',
    dob: '--.--.----',
    calculatedAge: null,
    status: 'FAKE_FLAG',
    statusReason: 'Security hologram mismatch / Font anomaly',
    isManual: false,
    documentNumber: 'SUSPECT-DOC',
    staffName: 'Sarah Jenkins'
  },
  {
    id: 'scan-6',
    timestamp: '22:15:30',
    date: '2026-08-28',
    documentType: 'NZDL',
    documentLabel: 'NZDL',
    dob: '18.11.2001',
    calculatedAge: 24,
    status: 'PERMITTED',
    statusReason: 'Verified Legal Adult',
    isManual: false,
    documentNumber: 'DL-4301982-NZ',
    gender: 'M',
    staffName: 'Mike Torres'
  },
  {
    id: 'scan-7',
    timestamp: '22:04:19',
    date: '2026-08-28',
    documentType: 'NZDL',
    documentLabel: 'NZDL',
    dob: '03.01.2008',
    calculatedAge: 16,
    status: 'DENIED',
    statusReason: 'Underage (16 years old)',
    isManual: false,
    documentNumber: 'DL-7719203-NZ',
    gender: 'F',
    staffName: 'Sarah Jenkins'
  },
  {
    id: 'scan-8',
    timestamp: '21:52:40',
    date: '2026-08-28',
    documentType: 'Intl_Passport',
    documentLabel: 'AUS Passport',
    dob: '19.07.1996',
    calculatedAge: 28,
    status: 'PERMITTED',
    statusReason: 'Verified Legal Adult',
    isManual: false,
    documentNumber: 'PA-AU-99120',
    gender: 'M',
    staffName: 'Elena Rostova'
  }
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: '#4928',
    name: 'Sarah Jenkins',
    role: 'ADMIN',
    status: 'ACTIVE_NOW',
    lastActive: 'Active Now',
    scansCount: 412,
    email: 'sarah.j@aetherhospitality.co.nz'
  },
  {
    id: '#8372',
    name: 'Mike Torres',
    role: 'SCANNER',
    status: 'LAST_2H',
    lastActive: '2h ago',
    scansCount: 285,
    email: 'mike.t@aetherhospitality.co.nz'
  },
  {
    id: '#1105',
    name: 'Elena Rostova',
    role: 'SCANNER',
    status: 'LAST_YESTERDAY',
    lastActive: 'Yesterday',
    scansCount: 145,
    email: 'elena.r@aetherhospitality.co.nz'
  }
];

export const INITIAL_TOKENS: VenueToken[] = [
  {
    id: 'tok-1',
    name: 'Main Entrance - Door 1',
    status: 'ACTIVE',
    syncedTime: '2M AGO',
    deviceId: 'DEV-POS-001'
  },
  {
    id: 'tok-2',
    name: 'VIP Lounge Scanner',
    status: 'IDLE',
    syncedTime: '1H AGO',
    deviceId: 'DEV-TAB-004'
  },
  {
    id: 'tok-3',
    name: 'Garden Terrace Entry',
    status: 'ACTIVE',
    syncedTime: '15M AGO',
    deviceId: 'DEV-MOB-012'
  }
];

export const INITIAL_HOURLY: HourlyStat[] = [
  { hour: '8PM', scans: 24, permitted: 22, denied: 2 },
  { hour: '9PM', scans: 150, permitted: 146, denied: 4 },
  { hour: '10PM', scans: 380, permitted: 374, denied: 6 },
  { hour: '11PM', scans: 420, permitted: 411, denied: 9 },
  { hour: '12AM', scans: 280, permitted: 275, denied: 5 },
  { hour: '1AM', scans: 65, permitted: 63, denied: 2 }
];
