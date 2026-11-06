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
import { INITIAL_STAFF, INITIAL_TOKENS, DEFAULT_SETTINGS } from '../data/initialData';

export const INITIAL_SETTINGS: AppSettings = DEFAULT_SETTINGS;

const LOCAL_STORAGE_KEYS = {
  SCANS: 'ct_scans_records',
  SETTINGS: 'ct_app_settings',
  STAFF: 'ct_staff_roster',
  TOKENS: 'ct_venue_tokens',
  STATS: 'ct_hourly_stats',
};

// Helper for safe localStorage loading
function getCachedData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`Failed reading localStorage[${key}]:`, err);
  }
  return fallback;
}

function saveCachedData<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Failed writing localStorage[${key}]:`, err);
  }
}

// ----------------- SCANS HOOK -----------------
export function useFirebaseScans(autoPurgeHours: number = 24) {
  const [scans, setScans] = useState<ScanRecord[]>(() => 
    getCachedData<ScanRecord[]>(LOCAL_STORAGE_KEYS.SCANS, [])
  );

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'scans'), orderBy('timestamp', 'desc'), limit(500));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScanRecord));
            setScans(records);
            saveCachedData(LOCAL_STORAGE_KEYS.SCANS, records);

            // Auto purge expired scans based on threshold
            const purgeThresholdMs = autoPurgeHours * 60 * 60 * 1000;
            const now = Date.now();
            const expired = records.filter(r => r.createdAt && (now - r.createdAt > purgeThresholdMs));
            if (expired.length > 0) {
              const batch = writeBatch(db);
              expired.forEach(exp => {
                batch.delete(doc(db, 'scans', exp.id));
              });
              batch.commit().catch(() => {});
            }
          }
        },
        (error) => {
          console.warn('Firestore scans listener running offline (using local cache):', error.message);
        }
      );
    } catch (err) {
      console.warn('Firestore scans connection skipped, using local offline storage:', err);
    }
    return () => unsubscribe();
  }, [autoPurgeHours]);

  const addScan = async (record: ScanRecord) => {
    const recordWithEpoch: ScanRecord = {
      ...record,
      createdAt: record.createdAt || Date.now(),
    };
    // 1. Immediate local state update
    setScans((prev) => {
      const next = [recordWithEpoch, ...prev.filter(s => s.id !== record.id)].slice(0, 500);
      saveCachedData(LOCAL_STORAGE_KEYS.SCANS, next);
      return next;
    });

    // 2. Background Firestore sync
    try {
      await setDoc(doc(db, 'scans', record.id), recordWithEpoch);
    } catch (err) {
      console.warn('Scan saved locally. Firestore sync error:', err);
    }
  };

  const deleteScan = async (id: string) => {
    setScans((prev) => {
      const next = prev.filter(s => s.id !== id);
      saveCachedData(LOCAL_STORAGE_KEYS.SCANS, next);
      return next;
    });

    try {
      await deleteDoc(doc(db, 'scans', id));
    } catch (err) {
      console.warn('Scan deleted locally. Firestore delete error:', err);
    }
  };

  const purgeScans = async () => {
    setScans([]);
    saveCachedData(LOCAL_STORAGE_KEYS.SCANS, []);

    try {
      const batch = writeBatch(db);
      scans.forEach(scan => {
        batch.delete(doc(db, 'scans', scan.id));
      });
      await batch.commit();
    } catch (err) {
      console.warn('Scans purged locally. Firestore purge error:', err);
    }
  };

  return { scans, addScan, deleteScan, purgeScans };
}

// ----------------- SETTINGS HOOK -----------------
export function useFirebaseSettings() {
  const [settings, setSettings] = useState<AppSettings>(() =>
    getCachedData<AppSettings>(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  );

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(
        doc(db, 'config', 'settings'),
        (docSnap) => {
          if (docSnap.exists()) {
            const remoteSettings = { ...DEFAULT_SETTINGS, ...docSnap.data() as AppSettings };
            setSettings(remoteSettings);
            saveCachedData(LOCAL_STORAGE_KEYS.SETTINGS, remoteSettings);
          } else {
            setDoc(doc(db, 'config', 'settings'), DEFAULT_SETTINGS).catch(() => {});
          }
        },
        (error) => {
          console.warn('Firestore settings listener running offline:', error.message);
        }
      );
    } catch (err) {
      console.warn('Firestore settings offline:', err);
    }
    return () => unsubscribe();
  }, []);

  const updateSettings = async (updated: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updated };
      saveCachedData(LOCAL_STORAGE_KEYS.SETTINGS, next);
      return next;
    });

    try {
      await updateDoc(doc(db, 'config', 'settings'), updated);
    } catch (err) {
      console.warn('Settings updated locally. Firestore sync error:', err);
    }
  };

  const adjustPatronCount = async (delta: number) => {
    let nextCount = 0;
    setSettings((prev) => {
      nextCount = Math.max(0, (prev.currentPatronCount || 0) + delta);
      const next = { ...prev, currentPatronCount: nextCount };
      saveCachedData(LOCAL_STORAGE_KEYS.SETTINGS, next);
      return next;
    });

    try {
      await updateDoc(doc(db, 'config', 'settings'), {
        currentPatronCount: nextCount
      });
    } catch (err) {
      console.warn('Patron count updated locally:', err);
    }
  };

  return { settings, updateSettings, adjustPatronCount };
}

// ----------------- STAFF HOOK -----------------
export function useFirebaseStaff() {
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    const cached = getCachedData<StaffMember[]>(LOCAL_STORAGE_KEYS.STAFF, []);
    return cached && cached.length > 0 ? cached : INITIAL_STAFF;
  });

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(
        collection(db, 'staff'),
        (snapshot) => {
          if (!snapshot.empty) {
            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
            setStaffList(records);
            saveCachedData(LOCAL_STORAGE_KEYS.STAFF, records);
          } else {
            // Seed initial staff to Firestore
            INITIAL_STAFF.forEach(staff => {
              setDoc(doc(db, 'staff', staff.id), staff).catch(() => {});
            });
            saveCachedData(LOCAL_STORAGE_KEYS.STAFF, INITIAL_STAFF);
          }
        },
        (error) => {
          console.warn('Firestore staff onSnapshot warning (using local staff list):', error.message);
        }
      );
    } catch (err) {
      console.warn('Firestore staff listener error:', err);
    }
    return () => unsubscribe();
  }, []);

  const addStaff = async (member: StaffMember) => {
    // 1. Immediate state & localStorage update
    setStaffList((prev) => {
      const next = [member, ...prev.filter(s => s.id !== member.id)];
      saveCachedData(LOCAL_STORAGE_KEYS.STAFF, next);
      return next;
    });

    // 2. Background Firestore sync
    try {
      await setDoc(doc(db, 'staff', member.id), member);
    } catch (err) {
      console.warn('Staff member saved locally. Firestore sync error:', err);
    }
  };

  const deleteStaff = async (id: string) => {
    setStaffList((prev) => {
      const next = prev.filter(s => s.id !== id);
      saveCachedData(LOCAL_STORAGE_KEYS.STAFF, next);
      return next;
    });

    try {
      await deleteDoc(doc(db, 'staff', id));
    } catch (err) {
      console.warn('Staff deleted locally. Firestore delete error:', err);
    }
  };

  const incrementStaffScanCount = async (id: string) => {
    setStaffList((prev) => {
      const next = prev.map(s => 
        s.id === id ? { ...s, scansCount: (s.scansCount || 0) + 1, lastActive: 'Just now' } : s
      );
      saveCachedData(LOCAL_STORAGE_KEYS.STAFF, next);
      return next;
    });

    try {
      await updateDoc(doc(db, 'staff', id), {
        scansCount: increment(1),
        lastActive: 'Just now',
      });
    } catch (err) {
      console.warn('Increment staff scans locally:', err);
    }
  };

  return { staffList, addStaff, deleteStaff, incrementStaffScanCount };
}

// ----------------- VENUE TOKENS HOOK -----------------
export function useFirebaseTokens() {
  const [tokens, setTokens] = useState<VenueToken[]>(() => {
    const cached = getCachedData<VenueToken[]>(LOCAL_STORAGE_KEYS.TOKENS, []);
    return cached && cached.length > 0 ? cached : INITIAL_TOKENS;
  });

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(
        collection(db, 'tokens'),
        (snapshot) => {
          if (!snapshot.empty) {
            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VenueToken));
            setTokens(records);
            saveCachedData(LOCAL_STORAGE_KEYS.TOKENS, records);
          } else {
            INITIAL_TOKENS.forEach(tok => {
              setDoc(doc(db, 'tokens', tok.id), tok).catch(() => {});
            });
            saveCachedData(LOCAL_STORAGE_KEYS.TOKENS, INITIAL_TOKENS);
          }
        },
        (error) => {
          console.warn('Firestore tokens warning (using local tokens):', error.message);
        }
      );
    } catch (err) {
      console.warn('Firestore tokens error:', err);
    }
    return () => unsubscribe();
  }, []);

  const addToken = async (token: VenueToken) => {
    setTokens((prev) => {
      const next = [token, ...prev.filter(t => t.id !== token.id)];
      saveCachedData(LOCAL_STORAGE_KEYS.TOKENS, next);
      return next;
    });

    try {
      await setDoc(doc(db, 'tokens', token.id), token);
    } catch (err) {
      console.warn('Token saved locally. Firestore error:', err);
    }
  };

  const deleteToken = async (id: string) => {
    setTokens((prev) => {
      const next = prev.filter(t => t.id !== id);
      saveCachedData(LOCAL_STORAGE_KEYS.TOKENS, next);
      return next;
    });

    try {
      await deleteDoc(doc(db, 'tokens', id));
    } catch (err) {
      console.warn('Token deleted locally. Firestore error:', err);
    }
  };

  return { tokens, addToken, deleteToken };
}

// ----------------- HOURLY STATS HOOK -----------------
const DEFAULT_HOURS = ['8PM', '9PM', '10PM', '11PM', '12AM', '1AM'];

export function useFirebaseHourlyStats() {
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>(() => {
    const cached = getCachedData<HourlyStat[]>(LOCAL_STORAGE_KEYS.STATS, []);
    if (cached && cached.length > 0) return cached;
    return DEFAULT_HOURS.map(hour => ({ hour, scans: 0, permitted: 0, denied: 0 }));
  });
  
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(
        collection(db, 'hourlyStats'),
        (snapshot) => {
          if (!snapshot.empty) {
            const statsMap = new Map(snapshot.docs.map(doc => [doc.id, doc.data() as HourlyStat]));
            const orderedStats = DEFAULT_HOURS.map(hour => statsMap.get(hour) || {
              hour,
              scans: 0,
              permitted: 0,
              denied: 0
            });
            setHourlyStats(orderedStats);
            saveCachedData(LOCAL_STORAGE_KEYS.STATS, orderedStats);
          }
        },
        (error) => {
          console.warn('Hourly stats listener running offline:', error.message);
        }
      );
    } catch (err) {
      console.warn('Hourly stats connection skipped:', err);
    }
    return () => unsubscribe();
  }, []);

  const updateHourStat = async (hourKey: string, permittedIncr: number, deniedIncr: number) => {
    setHourlyStats((prev) => {
      const next = prev.map(item => {
        if (item.hour === hourKey) {
          return {
            ...item,
            scans: item.scans + permittedIncr + deniedIncr,
            permitted: item.permitted + permittedIncr,
            denied: item.denied + deniedIncr,
          };
        }
        return item;
      });
      saveCachedData(LOCAL_STORAGE_KEYS.STATS, next);
      return next;
    });

    try {
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
    } catch (err) {
      console.warn('Hourly stat saved locally:', err);
    }
  };
  
  const resetStats = async () => {
    const reset = DEFAULT_HOURS.map(hour => ({ hour, scans: 0, permitted: 0, denied: 0 }));
    setHourlyStats(reset);
    saveCachedData(LOCAL_STORAGE_KEYS.STATS, reset);

    try {
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
    } catch (err) {
      console.warn('Hourly stats reset locally:', err);
    }
  };

  return { hourlyStats, updateHourStat, resetStats };
}
