export type DocumentType = 
  | 'NZDL' 
  | 'NZ_Passport' 
  | 'R18_Card' 
  | 'Intl_Passport' 
  | 'Intl_ID' 
  | 'Other';

export type ScanStatus = 
  | 'PERMITTED' 
  | 'DENIED' 
  | 'CHECK_DATE' 
  | 'FAKE_FLAG';

export interface ScanRecord {
  id: string;
  timestamp: string;
  date: string;
  documentType: DocumentType;
  documentLabel: string;
  dob: string; // DD.MM.YYYY
  calculatedAge: number | null;
  status: ScanStatus;
  statusReason?: string;
  isManual: boolean;
  notes?: string;
  documentNumber?: string;
  gender?: 'M' | 'F' | 'X';
  staffName?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'ADMIN' | 'SCANNER' | 'SUPERVISOR';
  status: 'ACTIVE_NOW' | 'LAST_2H' | 'LAST_YESTERDAY' | 'OFFLINE';
  lastActive: string;
  scansCount: number;
  email?: string;
}

export interface VenueToken {
  id: string;
  name: string;
  status: 'ACTIVE' | 'IDLE' | 'OFFLINE';
  syncedTime: string;
  deviceId: string;
}

export interface HourlyStat {
  hour: string;
  scans: number;
  permitted: number;
  denied: number;
}

export interface AppSettings {
  minAge: number;
  venueName: string;
  autoPurgeHours: number;
  audioFeedback: boolean;
  hapticFeedback: boolean;
  scannerStyle: 'cyber-bracket' | 'minimal-rounded' | 'glass-sleek';
  torchEnabled: boolean;
  staffName: string;
  staffId: string;
}

export type ActiveTab = 'scanner' | 'history' | 'manual' | 'stats' | 'settings' | 'staff' | 'sync';
