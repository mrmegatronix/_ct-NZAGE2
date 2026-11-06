import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  writeBatch, 
  increment 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ScanRecord, StaffMember, VenueToken, AppSettings, HourlyStat } from '../types';

export const INITIAL_SETTINGS: AppSettings = {
  minAge: 18,
  venueName: 'COASTERS TAVERN',
  autoPurgeHours: 24,
  audioFeedback: true,
  hapticFeedback: true,
  scannerStyle: 'cyber-bracket',
  torchEnabled: false,
  staffName: 'Admin Operator',
  staffId: '#0001'
};

export function useFirebaseScans(autoPurgeHours: number = 24) {
  const [scans, setScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'scans'), orderBy('timestamp', 'desc'), limit(500));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScanRecord));
      setScans(records);

      // Auto purge expired scans based on autoPurgeHours threshold
      const purgeThresholdMs = autoPurgeHours * 60 * 60 * 1000;
      const now = Date.now();
      const expired = records.filter(r => r.createdAt && (now - r.createdAt > purgeThresholdMs));
      if (expired.length > 0) {
        const batch = writeBatch(db);
        expired.forEach(exp => {
          batch.delete(doc(db, 'scans', exp.id));
        });
        batch.commit().catch(console.error);
      }
    });
    return () => unsubscribe();
  }, [autoPurgeHours]);

  const addScan = async (record: ScanRecord) => {
    const recordWithEpoch = {
      ...record,
      createdAt: record.createdAt || Date.now(),
    };
    await setDoc(doc(db, 'scans', record.id), recordWithEpoch);
  };

  const deleteScan = async (id: string) => {
    await deleteDoc(doc(db, 'scans', id));
  };

  const purgeScans = async () => {
    if (scans.length === 0) return;
    const batch = writeBatch(db);
    scans.forEach(scan => {
      batch.delete(doc(db, 'scans', scan.id));
    });
    await batch.commit();
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

  const deleteStaff = async (id: string) => {
    await deleteDoc(doc(db, 'staff', id));
  };

  const incrementStaffScanCount = async (id: string) => {
    try {
      await updateDoc(doc(db, 'staff', id), {
        scansCount: increment(1),
        lastActive: 'Just now',
        status: 'ACTIVE_NOW'
      });
    } catch {
      // Ignore if staff document not found
    }
  };

  return { staffList, addStaff, deleteStaff, incrementStaffScanCount };
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

  const deleteToken = async (id: string) => {
    await deleteDoc(doc(db, 'tokens', id));
  };

  return { tokens, addToken, deleteToken };
}

const DEFAULT_HOURS = ['8PM', '9PM', '10PM', '11PM', '12AM', '1AM'];

export function useFirebaseHourlyStats() {
    const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([]);
    
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'hourlyStats'), (snapshot) => {
            if (snapshot.empty) {
                // Initialize default hourly stats if collection is empty
                const initialStats: HourlyStat[] = DEFAULT_HOURS.map(hour => ({
                  hour,
                  scans: 0,
                  permitted: 0,
                  denied: 0
                }));
                initialStats.forEach(stat => setDoc(doc(db, 'hourlyStats', stat.hour), stat));
                setHourlyStats(initialStats);
            } else {
                const statsMap = new Map(snapshot.docs.map(doc => [doc.id, doc.data() as HourlyStat]));
                const orderedStats = DEFAULT_HOURS.map(hour => statsMap.get(hour) || {
                  hour,
                  scans: 0,
                  permitted: 0,
                  denied: 0
                });
                setHourlyStats(orderedStats);
            }
        });
        return () => unsubscribe();
    }, []);

    const updateHourStat = async (hourKey: string, permittedIncr: number, deniedIncr: number) => {
        await setDoc(
          doc(db, 'hourlyStats', hourKey),
          {
            hour: hourKey,
            scans: increment(permittedIncr + deniedIncr),
            permitted: increment(permittedIncr),
            denied: increment(deniedIncr),
          },
          { merge: true }
        );
    };
    
    const resetStats = async () => {
        const batch = writeBatch(db);
        for (const hour of DEFAULT_HOURS) {
            batch.set(doc(db, 'hourlyStats', hour), {
              hour,
              scans: 0,
              permitted: 0,
              denied: 0
            });
        }
        await batch.commit();
    };

    return { hourlyStats, updateHourStat, resetStats };
}
