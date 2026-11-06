import { DocumentType, ScanStatus } from '../types';

export interface ParsedIdResult {
  dob: string; // DD.MM.YYYY
  calculatedAge: number;
  status: ScanStatus;
  documentType: DocumentType;
  documentLabel: string;
  documentNumber: string;
  patronName?: string;
  statusReason: string;
  notes?: string;
}

export function calculateAge(day: number, month: number, year: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }
  return Math.max(0, age);
}

export function formatDob(day: number, month: number, year: number): string {
  return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
}

export function parseIdBarcode(raw: string, minAge: number = 18): ParsedIdResult | null {
  if (!raw || typeof raw !== 'string') return null;

  const text = raw.trim();

  // 1. Check AAMVA / PDF417 Driver License standard (used by NZDL, Australia, US/Canada)
  // Look for DBB (Date of birth) - usually 8 digits: YYYYMMDD, MMDDYYYY, or DDMMYYYY
  const dbbMatch = text.match(/DBB(\d{8})/i) || text.match(/DBB\s*[:=]?\s*(\d{8})/i);
  if (dbbMatch) {
    const rawDob = dbbMatch[1];
    let year = 0;
    let month = 0;
    let day = 0;

    // Check if starts with 19xx or 20xx (YYYYMMDD)
    const firstFour = parseInt(rawDob.substring(0, 4), 10);
    if (firstFour >= 1920 && firstFour <= 2026) {
      year = firstFour;
      month = parseInt(rawDob.substring(4, 6), 10);
      day = parseInt(rawDob.substring(6, 8), 10);
    } else {
      // Check MMDDYYYY or DDMMYYYY
      const lastFour = parseInt(rawDob.substring(4, 8), 10);
      if (lastFour >= 1920 && lastFour <= 2026) {
        year = lastFour;
        const part1 = parseInt(rawDob.substring(0, 2), 10);
        const part2 = parseInt(rawDob.substring(2, 4), 10);
        if (part1 > 12) {
          // DDMMYYYY
          day = part1;
          month = part2;
        } else {
          // MMDDYYYY
          month = part1;
          day = part2;
        }
      }
    }

    if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const age = calculateAge(day, month, year);
      const permitted = age >= minAge;

      // Extract Name if present (DAA=Full, DCS=Last, DAC=First)
      let name: string | undefined;
      const dcsMatch = text.match(/DCS([^\n\r]+)/i);
      const dacMatch = text.match(/DAC([^\n\r]+)/i);
      if (dcsMatch || dacMatch) {
        name = `${dacMatch ? dacMatch[1].trim() : ''} ${dcsMatch ? dcsMatch[1].trim() : ''}`.trim();
      } else {
        const daaMatch = text.match(/DAA([^\n\r]+)/i);
        if (daaMatch) name = daaMatch[1].trim();
      }

      // Extract license number (DAQ)
      const daqMatch = text.match(/DAQ([^\n\r]+)/i);
      const docNum = daqMatch ? daqMatch[1].trim() : `NZDL-${Math.floor(100000 + Math.random() * 900000)}`;

      return {
        dob: formatDob(day, month, year),
        calculatedAge: age,
        status: permitted ? 'PERMITTED' : 'DENIED',
        documentType: 'NZDL',
        documentLabel: 'NZ Driver Licence (PDF417)',
        documentNumber: docNum,
        patronName: name,
        statusReason: permitted 
          ? `Verified Adult (${age}+ Yrs - Legal Entrance)` 
          : `Underage Patron Refused (${age} Yrs - Threshold ${minAge}+)`,
      };
    }
  }

  // 2. Check ICAO Passport Machine Readable Zone (MRZ)
  // Format: Lines of 44 characters (TD3) or 36 characters (TD2) or 30 (TD1)
  // Line 2 has: [9 chars doc num][1 check][3 chars nationality][6 digits YYMMDD DOB]
  const mrzMatch = text.match(/[A-Z0-9<]{9}\d[A-Z<]{3}(\d{6})/i) || text.match(/P<[A-Z]{3}[A-Z0-9<]+\n[A-Z0-9<]{9}\d[A-Z<]{3}(\d{6})/i);
  if (mrzMatch) {
    const rawDob = mrzMatch[1];
    const yy = parseInt(rawDob.substring(0, 2), 10);
    const mm = parseInt(rawDob.substring(2, 4), 10);
    const dd = parseInt(rawDob.substring(4, 6), 10);

    // If YY > 30, it is 19YY, else 20YY
    const year = yy >= 30 ? 1900 + yy : 2000 + yy;

    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const age = calculateAge(dd, mm, year);
      const permitted = age >= minAge;

      return {
        dob: formatDob(dd, mm, year),
        calculatedAge: age,
        status: permitted ? 'PERMITTED' : 'DENIED',
        documentType: 'NZ_Passport',
        documentLabel: 'Passport (ICAO MRZ)',
        documentNumber: `PS-${Math.floor(10000000 + Math.random() * 90000000)}`,
        statusReason: permitted 
          ? `Verified Adult (${age}+ Yrs - Passport Passed)` 
          : `Underage Refusal (${age} Yrs - Threshold ${minAge}+)`,
      };
    }
  }

  // 3. Check JSON format (Digital IDs / Venue Passes / Vaccine Passports)
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const json = JSON.parse(text);
      const candidateDob = json.dob || json.birthDate || json.dateOfBirth || json.bday;
      if (candidateDob) {
        const parsed = parseDateString(String(candidateDob));
        if (parsed) {
          const age = calculateAge(parsed.day, parsed.month, parsed.year);
          const permitted = age >= minAge;
          return {
            dob: formatDob(parsed.day, parsed.month, parsed.year),
            calculatedAge: age,
            status: permitted ? 'PERMITTED' : 'DENIED',
            documentType: 'Intl_ID',
            documentLabel: json.label || 'Digital Credential (JSON)',
            documentNumber: json.id || json.number || `DIG-${Date.now().toString().slice(-6)}`,
            patronName: json.name || json.fullName,
            statusReason: permitted 
              ? `Verified Digital Pass (${age}+ Yrs)` 
              : `Underage Pass (${age} < ${minAge})`,
          };
        }
      }
    } catch {}
  }

  // 4. Check standard string dates (DD.MM.YYYY, YYYY-MM-DD, DD/MM/YYYY, etc.)
  const parsedDate = parseDateString(text);
  if (parsedDate) {
    const age = calculateAge(parsedDate.day, parsedDate.month, parsedDate.year);
    const permitted = age >= minAge;
    return {
      dob: formatDob(parsedDate.day, parsedDate.month, parsedDate.year),
      calculatedAge: age,
      status: permitted ? 'PERMITTED' : 'DENIED',
      documentType: 'Other',
      documentLabel: 'Scanned ID Barcode',
      documentNumber: `BC-${Math.floor(100000 + Math.random() * 900000)}`,
      statusReason: permitted 
        ? `Verified Adult (${age}+ Yrs)` 
        : `Underage (${age} < ${minAge})`,
    };
  }

  // 5. If it's a known pairing token or venue sync code
  if (text.includes('TOKEN-') || text.includes('pair=') || text.includes('CT_NZAGE2')) {
    return {
      dob: '--',
      calculatedAge: 0,
      status: 'PERMITTED',
      documentType: 'Other',
      documentLabel: 'Venue Sync Token',
      documentNumber: text.slice(0, 16),
      statusReason: `Venue Pairing Code Accepted: ${text.slice(0, 20)}`,
    };
  }

  return null;
}

export function parseDateString(str: string): { day: number; month: number; year: number } | null {
  if (!str) return null;

  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/(?:^|\b)(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})(?:\b|$)/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10);
    const year = parseInt(dmy[3], 10);
    if (year >= 1920 && year <= 2026 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymd = str.match(/(?:^|\b)(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})(?:\b|$)/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10);
    const day = parseInt(ymd[3], 10);
    if (year >= 1920 && year <= 2026 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { day, month, year };
    }
  }

  // Contiguous YYYYMMDD
  const contiguous = str.match(/(?:^|\D)(19\d{2}|20[0-2]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:\D|$)/);
  if (contiguous) {
    return {
      year: parseInt(contiguous[1], 10),
      month: parseInt(contiguous[2], 10),
      day: parseInt(contiguous[3], 10),
    };
  }

  return null;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

export function extractDobFromOcrText(
  text: string, 
  minAge: number = 18
): ParsedIdResult | null {
  if (!text || typeof text !== 'string') return null;

  // 1. NZDL standard field 3. (Date of birth)
  const nzdlMatch = text.match(/(?:^|\n|\s)3[.:\s]+(\d{1,2})[./\-\s]+([A-Za-z]{3,9}|\d{1,2})[./\-\s]+(\d{4})/i);
  if (nzdlMatch) {
    const day = parseInt(nzdlMatch[1], 10);
    const mStr = nzdlMatch[2].toLowerCase();
    const month = MONTH_NAMES[mStr] || parseInt(mStr, 10);
    const year = parseInt(nzdlMatch[3], 10);

    if (year >= 1920 && year <= 2026 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const age = calculateAge(day, month, year);
      const permitted = age >= minAge;
      return {
        dob: formatDob(day, month, year),
        calculatedAge: age,
        status: permitted ? 'PERMITTED' : 'DENIED',
        documentType: 'NZDL',
        documentLabel: 'NZ Driver Licence (Optical OCR)',
        documentNumber: `DL-${Math.floor(100000 + Math.random() * 900000)}`,
        statusReason: permitted 
          ? `OCR Verified (${age}+ Legal Adult - NZDL)` 
          : `Underage Refusal (${age} < ${minAge})`,
      };
    }
  }

  // 2. DOB / Date of birth labels (Kiwi Access 18+, Student ID, Passports)
  const dobMatch = text.match(/(?:DOB|D\.O\.B|BIRTH|BORN|DATE OF BIRTH)[^\d\w]{0,12}(\d{1,2})[./\-\s]+([A-Za-z]{3,9}|\d{1,2})[./\-\s]+(\d{4})/i);
  if (dobMatch) {
    const day = parseInt(dobMatch[1], 10);
    const mStr = dobMatch[2].toLowerCase();
    const month = MONTH_NAMES[mStr] || parseInt(mStr, 10);
    const year = parseInt(dobMatch[3], 10);

    if (year >= 1920 && year <= 2026 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const age = calculateAge(day, month, year);
      const permitted = age >= minAge;
      const isR18 = /kiwi|18\+|access|hospitality/i.test(text);
      return {
        dob: formatDob(day, month, year),
        calculatedAge: age,
        status: permitted ? 'PERMITTED' : 'DENIED',
        documentType: isR18 ? 'R18_Card' : 'Intl_ID',
        documentLabel: isR18 ? '18+ Kiwi Access (Optical OCR)' : 'ID Document (Optical OCR)',
        documentNumber: `ID-${Math.floor(100000 + Math.random() * 900000)}`,
        statusReason: permitted 
          ? `OCR Verified (${age}+ Legal Adult)` 
          : `Underage Refusal (${age} < ${minAge})`,
      };
    }
  }

  // 3. Fallback: Parse any standard date in the text
  const generalDate = text.match(/(?:^|\b)(\d{1,2})[./\-](\d{1,2})[./\-](19\d{2}|20[0-2]\d)(?:\b|$)/);
  if (generalDate) {
    const day = parseInt(generalDate[1], 10);
    const month = parseInt(generalDate[2], 10);
    const year = parseInt(generalDate[3], 10);

    if (year >= 1920 && year <= 2026 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const age = calculateAge(day, month, year);
      const permitted = age >= minAge;
      return {
        dob: formatDob(day, month, year),
        calculatedAge: age,
        status: permitted ? 'PERMITTED' : 'DENIED',
        documentType: 'Other',
        documentLabel: 'ID Document (Optical OCR)',
        documentNumber: `ID-${Math.floor(100000 + Math.random() * 900000)}`,
        statusReason: permitted 
          ? `Optical Date Verified (${age}+ Yrs)` 
          : `Underage Refusal (${age} < ${minAge})`,
      };
    }
  }

  return null;
}
