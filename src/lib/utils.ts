import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Physical mm to screen pixel conversion
// 1 inch = 25.4 mm
export function mmToPx(mm: number, dpi: number = 96): number {
  return (mm * dpi) / 25.4;
}

export function pxToMm(px: number, dpi: number = 96): number {
  return (px * 25.4) / dpi;
}

export function ptToMm(pt: number): number {
  // 1 pt = 1/72 inch = 25.4 / 72 mm ≈ 0.352778 mm
  return pt * (25.4 / 72);
}

export function mmToPt(mm: number): number {
  return mm * (72 / 25.4);
}

// Generate unique ID
export function generateId(prefix: string = 'elem'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
}

// Format date
export function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// Trigger file download in browser
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function getDefaultSampleValue(key: string): string {
  const cleanKey = key.trim().toLowerCase();
  if (cleanKey.includes('roll')) return '101';
  if (cleanKey.includes('father')) return 'Dilip Kumar';
  if (cleanKey.includes('name')) return 'Rohan Sharma';
  if (cleanKey.includes('blood')) return 'B+';
  if (cleanKey.includes('session')) return '2024-2026';
  if (cleanKey.includes('course') || cleanKey.includes('trade')) return 'D.El.Ed';
  if (cleanKey.includes('pin')) return '803221';
  if (cleanKey.includes('dob') || cleanKey.includes('birth')) return '15-08-2003';
  if (cleanKey.includes('mobile') || cleanKey.includes('phone')) return '+91 98765 43210';
  if (cleanKey.includes('state')) return 'Bihar';
  if (cleanKey.includes('district')) return 'Patna';
  if (cleanKey.includes('address') || cleanKey.includes('village')) return 'Barh, Patna, Bihar';
  if (cleanKey.includes('reg') || cleanKey.includes('id')) return 'REG-2024-089';
  return cleanKey.replace(/_/g, ' ').toUpperCase();
}

// Smart field lookup resolving direct keys, nested data, and common aliases
export function getRecordFieldValue(data: Record<string, any>, key: string): any {
  if (!data || typeof data !== 'object') return undefined;

  const target = data.data && typeof data.data === 'object' ? { ...data.data, ...data } : data;

  // 1. Direct match
  if (target[key] !== undefined && target[key] !== null && String(target[key]).trim() !== '') {
    return target[key];
  }

  // 2. Case-insensitive search
  const lowerKey = key.toLowerCase();
  for (const k of Object.keys(target)) {
    if (k.toLowerCase() === lowerKey && target[k] !== undefined && target[k] !== null && String(target[k]).trim() !== '') {
      return target[k];
    }
  }

  // 3. Known domain aliases across front & back of ID cards
  const aliasMap: Record<string, string[]> = {
    student_name: ['candidate_name', 'full_name', 'name', 'studentname', 'fullname'],
    full_name: ['student_name', 'candidate_name', 'name', 'fullname'],
    roll_no: ['student_roll', 'roll', 'rollno', 'student_id', 'admission_no', 'identifier'],
    student_roll: ['roll_no', 'roll', 'rollno', 'student_id', 'admission_no', 'identifier'],
    father_name: ['Father_name', 'fathername', 'fathers_name', 'guardian_name'],
    Father_name: ['father_name', 'fathername', 'fathers_name', 'guardian_name'],
    mother_name: ['Mother_name', 'mothername', 'mothers_name'],
    mobile: ['Mobile_number', 'mobile_number', 'phone', 'contact', 'mobile_no', 'phone_number'],
    Mobile_number: ['mobile', 'mobile_number', 'phone', 'contact', 'mobile_no', 'phone_number'],
    photo_url: ['photo', 'image', 'picture', 'avatar', 'portrait'],
    address: ['full_address', 'complete_address', 'fulladdress', 'village'],
    full_address: ['address', 'complete_address', 'fulladdress', 'village'],
    police_station: ['ps', 'police_stn', 'policestation', 'thana'],
    district: ['city', 'district_pin', 'dist', 'location'],
    city: ['district', 'district_pin', 'dist'],
    pincode: ['pin', 'postal_code', 'pin_code'],
    blood_group: ['blood', 'bloodgroup'],
    session: ['academic_session', 'batch', 'year'],
    dob: ['date_of_birth', 'birth_date', 'd_o_b'],
  };

  const aliases = aliasMap[key] || aliasMap[lowerKey] || [];
  for (const alias of aliases) {
    if (target[alias] !== undefined && target[alias] !== null && String(target[alias]).trim() !== '') {
      return target[alias];
    }
  }

  return undefined;
}

// Dynamic field interpolator: replaces {{field_name}} with record[field_name]
export function interpolateString(template: string, data: Record<string, any>, fallback: string = ''): string {
  if (!template) return '';
  const hasRealData = data && Object.keys(data).length > 0;
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const val = getRecordFieldValue(data, key);
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val);
    }
    // When a real record is active, do not inject arbitrary fake defaults; return fallback or empty
    if (hasRealData) {
      return fallback;
    }
    return fallback || getDefaultSampleValue(key);
  });
}

// Unified text resolution logic for preview and high-res print export
export function resolveElementText(
  elem: {
    type?: string;
    content?: string;
    fieldKey?: string;
    fallback?: string;
    name?: string;
  },
  record: Record<string, any> = {}
): string {
  let rawText = elem.content || '';

  // 1. If text contains template tags like {{roll_no}}, interpolate them with record values
  if (rawText.includes('{{')) {
    rawText = interpolateString(rawText, record, elem.fallback || '');
  } else if (elem.type === 'dynamic-text' || elem.fieldKey) {
    // 2. If it's a dynamic element or has a fieldKey bound
    if (elem.fieldKey) {
      const val = getRecordFieldValue(record, elem.fieldKey);

      const displayVal =
        val !== undefined && val !== null && String(val).trim() !== ''
          ? String(val)
          : (elem.fallback || '');

      if (rawText.trim() && rawText !== elem.name) {
        // If content has a label prefix (e.g. "Roll No: " or "Roll No-")
        if (rawText.endsWith(':') || rawText.endsWith('-') || rawText.endsWith(' ') || rawText.includes(':') || rawText.includes('-')) {
          const sep = rawText.endsWith(' ') ? '' : ' ';
          rawText = `${rawText}${sep}${displayVal}`;
        } else {
          rawText = displayVal;
        }
      } else {
        rawText = displayVal;
      }
    } else if (elem.fallback && !rawText.trim()) {
      rawText = elem.fallback;
    }
  }

  return rawText;
}

// RFC4122 compliant UUID v4 generator
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extract clean display name for records and file naming
 */
export function getRecordDisplayName(record: Record<string, any> = {}): string {
  if (!record || typeof record !== 'object') return 'Student';
  const name =
    getRecordFieldValue(record, 'student_name') ||
    getRecordFieldValue(record, 'candidate_name') ||
    getRecordFieldValue(record, 'full_name') ||
    getRecordFieldValue(record, 'name') ||
    record.full_name ||
    record.name ||
    'Student';

  return String(name).trim() || 'Student';
}

/**
 * Extract clean display roll number or identifier for records and file naming
 */
export function getRecordDisplayRoll(record: Record<string, any> = {}, fallbackIndex?: number): string {
  if (!record || typeof record !== 'object') {
    return fallbackIndex !== undefined ? `CARD-${(fallbackIndex + 1).toString().padStart(3, '0')}` : 'CARD';
  }
  const roll =
    getRecordFieldValue(record, 'roll_no') ||
    getRecordFieldValue(record, 'student_roll') ||
    getRecordFieldValue(record, 'roll') ||
    getRecordFieldValue(record, 'student_id') ||
    getRecordFieldValue(record, 'admission_no') ||
    getRecordFieldValue(record, 'identifier') ||
    record.identifier ||
    (fallbackIndex !== undefined ? `CARD-${(fallbackIndex + 1).toString().padStart(3, '0')}` : 'CARD');

  return String(roll).trim() || 'CARD';
}

/**
 * Format clean filename safe string (replaces spaces and invalid characters with _)
 */
export function sanitizeFilenamePart(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

/**
 * Accurately calculate the optimal auto-fitted font size (in mm)
 * so text stays strictly within the bounding box (width & height).
 */
export function calculateAutoFitFontSizeMm(
  text: string,
  boxWidthMm: number,
  boxHeightMm: number,
  baseFontSizeMm: number,
  fontFamily: string = 'Inter',
  fontWeight: string = 'bold',
  minFontSizeMm: number = 2.0
): number {
  if (!text || boxWidthMm <= 0 || boxHeightMm <= 0 || baseFontSizeMm <= 0) {
    return baseFontSizeMm;
  }

  // Exact measurement via HTML5 offscreen canvas if DOM environment is present
  if (typeof document !== 'undefined') {
    try {
      const testScale = 100; // 100px test size for high sub-pixel precision
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const fw = fontWeight === 'bold' ? '700' : fontWeight === 'semibold' ? '600' : fontWeight === 'medium' ? '500' : '400';
        ctx.font = `${fw} ${testScale}px "${fontFamily}", sans-serif`;
        const lines = text.split('\n');

        let maxLineWidthPx = 0;
        for (const line of lines) {
          const w = ctx.measureText(line).width;
          if (w > maxLineWidthPx) maxLineWidthPx = w;
        }

        // Available box in px at test scale
        const textWidthAtBaseMm = (maxLineWidthPx * baseFontSizeMm) / testScale;
        let scale = 1.0;
        if (textWidthAtBaseMm > boxWidthMm) {
          scale = boxWidthMm / textWidthAtBaseMm;
        }

        // Check height constraint
        const totalHeightAtBaseMm = lines.length * (baseFontSizeMm * 1.25);
        if (totalHeightAtBaseMm > boxHeightMm) {
          const hScale = boxHeightMm / totalHeightAtBaseMm;
          scale = Math.min(scale, hScale);
        }

        // Apply a safe 0.96 factor so text never overflows or clips borders
        const fittedMm = baseFontSizeMm * scale * 0.96;
        return Math.max(minFontSizeMm, Math.min(baseFontSizeMm, Number(fittedMm.toFixed(2))));
      }
    } catch {
      // Fallback to mathematical approximation below
    }
  }

  // Pure mathematical fallback (average sans-serif character width is ~0.62x font size)
  const lines = text.split('\n');
  const maxLineLen = Math.max(...lines.map((l) => l.length), 1);
  const approxWidthMm = maxLineLen * (baseFontSizeMm * 0.62);
  let scale = 1.0;
  if (approxWidthMm > boxWidthMm) {
    scale = boxWidthMm / approxWidthMm;
  }
  const totalHeightMm = lines.length * (baseFontSizeMm * 1.25);
  if (totalHeightMm > boxHeightMm) {
    scale = Math.min(scale, boxHeightMm / totalHeightMm);
  }
  const fittedMm = baseFontSizeMm * scale * 0.96;
  return Math.max(minFontSizeMm, Math.min(baseFontSizeMm, Number(fittedMm.toFixed(2))));
}


