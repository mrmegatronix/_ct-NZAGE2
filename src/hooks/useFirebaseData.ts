import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ScanRecord, StaffMember, VenueToken, AppSettings, HourlyStat } from '../types';

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

export function useFirebaseScans() {
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'scans'), orderBy('timestamp', 'desc'), limit(500));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScanRecord));
      setScans(records);
    });
    return () => unsubscribe();
  }, []);

  const addScan = async (record: ScanRecord) => {
    await setDoc(doc(db, 'scans', record.id), record);
  };

  const deleteScan = async (id: string) => {
    await deleteDoc(doc(db, 'scans', id));
  };

  const purgeScans = async () => {
    scans.forEach(scan => deleteScan(scan.id));
  };

  return { scans, addScan, deleteScan, purgeScans };
}

export function useFirebaseSettings() {
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings({ ...INITIAL_SETTINGS, ...docSnap.data() as AppSettings });
      } else {
        setDoc(doc(db, 'config', 'settings'), INITIAL_SETTINGS);
      }
    });
    return () => unsubscribe();
  }, []);

  const updateSettings = async (updated: Partial<AppSettings>) => {
    await updateDoc(doc(db, 'config', 'settings'), updated);
  };

  return { settings, updateSettings };
}

export function useFirebaseStaff() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'staff'), (snapshot) => {
      setStaffList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember)));
    });
    return () => unsubscribe();
  }, []);

  const addStaff = async (member: StaffMember) => {
    await setDoc(doc(db, 'staff', member.id), member);
  };

  return { staffList, addStaff };
}

export function useFirebaseTokens() {
  const [tokens, setTokens] = useState<VenueToken[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tokens'), (snapshot) => {
      setTokens(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VenueToken)));
    });
    return () => unsubscribe();
  }, []);

  const addToken = async (token: VenueToken) => {
    await setDoc(doc(db, 'tokens', token.id), token);
  };

  return { tokens, addToken };
}

export function useFirebaseHourlyStats() {
    const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([]);
    
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'hourlyStats'), (snapshot) => {
            const stats = snapshot.docs.map(doc => ({ ...doc.data() } as HourlyStat));
            setHourlyStats(stats);
        });
        return () => unsubscribe();
    }, []);

    const updateHourStat = async (hourKey: string, permittedIncr: number, deniedIncr: number) => {
        // Implement simple client-side update
        const existing = hourlyStats.find(s => s.hour === hourKey);
        if (existing) {
            await updateDoc(doc(db, 'hourlyStats', hourKey), {
                scans: existing.scans + permittedIncr + deniedIncr,
                permitted: existing.permitted + permittedIncr,
                denied: existing.denied + deniedIncr
            });
        } else {
            await setDoc(doc(db, 'hourlyStats', hourKey), {
                hour: hourKey,
                scans: permittedIncr + deniedIncr,
                permitted: permittedIncr,
                denied: deniedIncr
            });
        }
    };
    
    const resetStats = async () => {
        const resetData = [
          { hour: '8PM', scans: 0, permitted: 0, denied: 0 },
          { hour: '9PM', scans: 0, permitted: 0, denied: 0 },
          { hour: '10PM', scans: 0, permitted: 0, denied: 0 },
          { hour: '11PM', scans: 0, permitted: 0, denied: 0 },
          { hour: '12AM', scans: 0, permitted: 0, denied: 0 },
          { hour: '1AM', scans: 0, permitted: 0, denied: 0 },
        ];
        
        for (const stat of resetData) {
            await setDoc(doc(db, 'hourlyStats', stat.hour), stat);
        }
    };

    return { hourlyStats, updateHourStat, resetStats };
}
