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
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  // Delay removing anchor and revoking object URL to allow Chromium / browser download managers to finish spooling
  setTimeout(() => {
    if (document.body.contains(anchor)) {
      document.body.removeChild(anchor);
    }
    URL.revokeObjectURL(url);
  }, 2500);
}

export function getDefaultSampleValue(key: string): string {
  const cleanKey = key.trim().toLowerCase();
  if (cleanKey.includes('roll')) return '101';
  if (cleanKey.includes('father')) return 'Dilip Kumar';
  if (cleanKey.includes('name')) return 'Rohan Sharma';
  if (cleanKey.includes('blood')) return 'NA';
  if (cleanKey.includes('session')) return '2024-2026';
  if (cleanKey.includes('course') || cleanKey.includes('trade')) return 'D.El.Ed';
  if (cleanKey.includes('pin')) return '803221';
  if (cleanKey.includes('dob') || cleanKey.includes('birth')) return '15-08-2003';
  if (cleanKey.includes('mobile') || cleanKey.includes('phone')) return '+91 98765 43210';
  if (cleanKey.includes('police') || cleanKey.includes('ps') || cleanKey.includes('thana')) return 'Barh';
  if (cleanKey.includes('state')) return 'Bihar';
  if (cleanKey.includes('district')) return 'Patna';
  if (cleanKey.includes('ward')) return 'Ward No.- 04';
  if (cleanKey.includes('village')) return 'Vill- Rampur';
  if (cleanKey.includes('address')) return 'Vill- Rampur';
  if (cleanKey.includes('reg') || cleanKey.includes('id')) return 'REG-2024-089';
  return cleanKey.replace(/_/g, ' ').toUpperCase();
}

export function toCleanTitleCase(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

/**
 * Format and standardize Indian address components to prevent typos and ensure
 * beautiful, consistent alignment across card front/back layouts.
 */
export function formatStructuredAddress(data: Record<string, any>): {
  addressType: string;
  villageWard: string;
  postOffice: string;
  policeStation: string;
  poPs: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  districtPin: string;
  fullAddress: string;
} {
  if (!data || typeof data !== 'object') {
    return {
      addressType: 'village',
      villageWard: '',
      postOffice: '',
      policeStation: '',
      poPs: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
      districtPin: '',
      fullAddress: '',
    };
  }

  const type = data.address_type || data.addr_type || 'village';
  const rawVill = String(
    data.village_ward ||
    data.village_name ||
    data.village ||
    data.ward_no ||
    data.ward ||
    data.street ||
    data.address ||
    ''
  ).trim();

  let formattedVillWard = rawVill;
  if (rawVill) {
    if (type === 'ward') {
      const numOnly = rawVill.replace(/[^\d]/g, '');
      if (numOnly) {
        formattedVillWard = `Ward No.- ${numOnly.padStart(2, '0')}`;
      } else {
        const stripped = rawVill.replace(/^(ward\s*no\.?|ward)[\s:.-]*/i, '').trim();
        formattedVillWard = `Ward No.- ${toCleanTitleCase(stripped) || rawVill}`;
      }
    } else if (type === 'village') {
      const stripped = rawVill.replace(/^(vill(age)?|at)[\s:.-]*/i, '').trim();
      formattedVillWard = `Vill- ${toCleanTitleCase(stripped) || toCleanTitleCase(rawVill)}`;
    } else if (type === 'at') {
      const stripped = rawVill.replace(/^(at|vill(age)?)[\s:.-]*/i, '').trim();
      formattedVillWard = `At- ${toCleanTitleCase(stripped) || toCleanTitleCase(rawVill)}`;
    } else if (type === 'street') {
      const stripped = rawVill.replace(/^(street|mohalla|road)[\s:.-]*/i, '').trim();
      formattedVillWard = `Mohalla- ${toCleanTitleCase(stripped) || toCleanTitleCase(rawVill)}`;
    }
  }

  // Post Office (PO)
  const rawPo = String(data.post_office || data.po || data.postoffice || '').trim();
  const strippedPo = rawPo.replace(/^(p\.?o\.?|post\s*office)[\s:.-]*/i, '').trim();
  const po = toCleanTitleCase(strippedPo || rawPo);

  // Police Station (PS)
  const rawPs = String(data.police_station || data.ps || data.thana || '').trim();
  const strippedPs = rawPs.replace(/^(p\.?s\.?|police\s*station|thana)[\s:.-]*/i, '').trim();
  const ps = toCleanTitleCase(strippedPs || rawPs);

  // Check if PO and PS are same (via explicit toggle or identical text)
  const isSamePoPs =
    Boolean(data.po_same_as_ps) ||
    Boolean(data.same_as_ps) ||
    Boolean(data.same_po_ps) ||
    (po && ps && po.toLowerCase() === ps.toLowerCase());

  let poPs = '';
  if (isSamePoPs && (po || ps)) {
    const common = po || ps;
    poPs = `PO+PS- ${common}`;
  } else if (po && ps) {
    poPs = `PO- ${po}, PS- ${ps}`;
  } else if (po) {
    poPs = `PO- ${po}`;
  } else if (ps) {
    poPs = `P.S.- ${ps}`;
  }

  // City / Town
  const rawCity = String(data.city || data.town || '').trim();
  const strippedCity = rawCity.replace(/^(city|town)[\s:.-]*/i, '').trim();
  const city = toCleanTitleCase(strippedCity || rawCity);

  // District
  const rawDist = String(data.district || '').trim();
  const strippedDist = rawDist.replace(/^(dist\.?|district)[\s:.-]*/i, '').trim();
  const district = toCleanTitleCase(strippedDist || rawDist || city);

  // State
  const rawState = String(data.state || '').trim();
  const state = toCleanTitleCase(rawState);

  // PIN Code
  const pin = String(data.pincode || data.pin || data.postal_code || '').trim().replace(/[^\d]/g, '');

  const districtPin = [district, pin].filter(Boolean).join(' - ');

  // Full address formatting with logical inclusion of PO, PS, City, Dist, State, Pin
  const parts: string[] = [];
  if (formattedVillWard) parts.push(formattedVillWard);
  if (poPs) parts.push(poPs);

  // Include City if provided and distinct from District and PO/PS
  if (
    city &&
    city.toLowerCase() !== district.toLowerCase() &&
    city.toLowerCase() !== (po || '').toLowerCase() &&
    city.toLowerCase() !== (ps || '').toLowerCase()
  ) {
    parts.push(`City- ${city}`);
  }

  if (district) parts.push(`Dist- ${district}`);
  if (state && state.toLowerCase() !== district.toLowerCase()) parts.push(`(${state})`);
  if (pin) parts.push(`- ${pin}`);

  const fullAddress = parts.join(', ').replace(', - ', ' - ');

  return {
    addressType: type,
    villageWard: formattedVillWard,
    postOffice: po,
    policeStation: ps,
    poPs,
    city,
    district,
    state,
    pincode: pin,
    districtPin,
    fullAddress,
  };
}

// Smart field lookup resolving direct keys, nested data, and common aliases
export function getRecordFieldValue(data: Record<string, any>, key: string): any {
  if (!data || typeof data !== 'object') return undefined;

  const target = data.data && typeof data.data === 'object' ? { ...data.data, ...data } : data;

  // 1. Special structured address resolutions
  if (key === 'village_ward' || key === 'village' || key === 'ward_no') {
    const formatted = formatStructuredAddress(target);
    if (formatted.villageWard) return formatted.villageWard;
  }
  if (key === 'district_pin') {
    const formatted = formatStructuredAddress(target);
    if (formatted.districtPin) return formatted.districtPin;
  }
  if (key === 'full_address') {
    const formatted = formatStructuredAddress(target);
    if (formatted.fullAddress) return formatted.fullAddress;
  }
  if (key === 'po_ps' || key === 'pops') {
    const formatted = formatStructuredAddress(target);
    if (formatted.poPs) return formatted.poPs;
  }
  if (key === 'post_office' || key === 'po') {
    const formatted = formatStructuredAddress(target);
    if (formatted.postOffice) return formatted.postOffice;
  }
  if (key === 'police_station' || key === 'ps' || key === 'thana') {
    const formatted = formatStructuredAddress(target);
    if (formatted.policeStation) return formatted.policeStation;
  }
  if (key === 'city') {
    const formatted = formatStructuredAddress(target);
    if (formatted.city) return formatted.city;
  }
  if (key === 'address') {
    // If structured address components are present, return clean village/ward line
    if (target.village_name || target.ward_no || target.village_ward || target.address_type) {
      const formatted = formatStructuredAddress(target);
      if (formatted.villageWard) return formatted.villageWard;
    }
  }

  // Blood group defaults to 'NA' if field is present but empty, or undefined if key is not in record
  const cleanKey = key.trim().toLowerCase();
  if (cleanKey.includes('blood')) {
    const hasKey = 'blood_group' in target || 'blood' in target || 'bloodgroup' in target || key in target;
    if (hasKey) {
      const raw =
        target.blood_group !== undefined ? target.blood_group :
        target.blood !== undefined ? target.blood :
        target.bloodgroup !== undefined ? target.bloodgroup :
        target[key];
      if (
        raw === undefined ||
        raw === null ||
        String(raw).trim() === '' ||
        String(raw).trim().toLowerCase() === 'undefined' ||
        String(raw).trim().toLowerCase() === 'null'
      ) {
        return 'NA';
      }
      return String(raw).trim();
    }
  }

  // 2. Direct match
  if (target[key] !== undefined && target[key] !== null && String(target[key]).trim() !== '') {
    return target[key];
  }

  // 3. Case-insensitive search
  const lowerKey = key.toLowerCase();
  for (const k of Object.keys(target)) {
    if (k.toLowerCase() === lowerKey && target[k] !== undefined && target[k] !== null && String(target[k]).trim() !== '') {
      return target[k];
    }
  }

  // 4. Known domain aliases across front & back of ID cards
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
    address: ['village_ward', 'village_name', 'ward_no', 'full_address', 'complete_address', 'fulladdress', 'village'],
    village_ward: ['address', 'village_name', 'ward_no', 'village'],
    full_address: ['address', 'complete_address', 'fulladdress', 'village'],
    police_station: ['ps', 'police_stn', 'policestation', 'thana'],
    post_office: ['po', 'postoffice', 'post_off'],
    po_ps: ['pops', 'po_plus_ps', 'po_ps_name'],
    district: ['city', 'district_pin', 'dist', 'location'],
    district_pin: ['district', 'pincode'],
    city: ['town', 'location'],
    pincode: ['pin', 'postal_code', 'pin_code'],
    blood_group: ['blood', 'bloodgroup', 'blood_grp', 'bg'],
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

export interface ParsedDateParts {
  year: number;
  month: number;
  day: number;
}

export const DATE_FORMAT_OPTIONS = [
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (e.g. 08-03-2003)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 08/03/2003)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2003-03-08)' },
  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD (e.g. 2003/03/08)' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (e.g. 08.03.2003)' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY (e.g. 08 Mar 2003)' },
  { value: 'DD MMMM YYYY', label: 'DD MMMM YYYY (e.g. 08 March 2003)' },
  { value: 'DD-MM-YY', label: 'DD-MM-YY (e.g. 08-03-03)' },
  { value: 'DD/MM/YY', label: 'DD/MM/YY (e.g. 08/03/03)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 03/08/2003)' },
  { value: 'raw', label: 'Raw / Exact As Entered' },
] as const;

export function parseDateString(val: string): ParsedDateParts | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // 1. Check YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:T.*)?$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // 2. Check DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // 3. Check DD-MM-YY or DD/MM/YY (2 digit year)
  const dmyShortMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (dmyShortMatch) {
    const d = parseInt(dmyShortMatch[1], 10);
    const m = parseInt(dmyShortMatch[2], 10);
    let y = parseInt(dmyShortMatch[3], 10);
    y = y <= 45 ? 2000 + y : 1900 + y;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // 4. Try standard Date.parse if it looks like a date
  if (trimmed.length >= 8 && (trimmed.includes('-') || trimmed.includes('/') || trimmed.includes(' '))) {
    const timestamp = Date.parse(trimmed);
    if (!isNaN(timestamp)) {
      const dObj = new Date(timestamp);
      if (!isNaN(dObj.getTime())) {
        return {
          year: dObj.getFullYear(),
          month: dObj.getMonth() + 1,
          day: dObj.getDate(),
        };
      }
    }
  }

  return null;
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function formatDateCustom(dateInput: string, pattern: string = 'DD-MM-YYYY'): string {
  if (!dateInput || !pattern || pattern === 'raw') return dateInput;
  const parts = parseDateString(dateInput);
  if (!parts) return dateInput;

  const dd = String(parts.day).padStart(2, '0');
  const mm = String(parts.month).padStart(2, '0');
  const yyyy = String(parts.year);
  const yy = yyyy.slice(-2);
  const mmm = MONTH_NAMES_SHORT[parts.month - 1] || mm;
  const mmmm = MONTH_NAMES_FULL[parts.month - 1] || mm;

  switch (pattern) {
    case 'DD-MM-YYYY':
      return `${dd}-${mm}-${yyyy}`;
    case 'DD/MM/YYYY':
      return `${dd}/${mm}/${yyyy}`;
    case 'DD.MM.YYYY':
      return `${dd}.${mm}.${yyyy}`;
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`;
    case 'YYYY/MM/DD':
      return `${yyyy}/${mm}/${dd}`;
    case 'DD-MM-YY':
      return `${dd}-${mm}-${yy}`;
    case 'DD/MM/YY':
      return `${dd}/${mm}/${yy}`;
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`;
    case 'DD MMM YYYY':
      return `${dd} ${mmm} ${yyyy}`;
    case 'DD MMMM YYYY':
      return `${dd} ${mmmm} ${yyyy}`;
    default:
      return pattern
        .replace(/YYYY/g, yyyy)
        .replace(/YY/g, yy)
        .replace(/MMMM/g, mmmm)
        .replace(/MMM/g, mmm)
        .replace(/MM/g, mm)
        .replace(/DD/g, dd);
  }
}

// Dynamic field interpolator: replaces {{field_name}} with record[field_name]
export function interpolateString(
  template: string,
  data: Record<string, any>,
  fallback: string = '',
  dateFormat?: string
): string {
  if (!template) return '';
  const hasRealData = data && Object.keys(data).length > 0;
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const val = getRecordFieldValue(data, key);
    const cleanKey = key.trim().toLowerCase();
    const isDateField = cleanKey.includes('dob') || cleanKey.includes('birth') || cleanKey.includes('date');

    if (val !== undefined && val !== null && String(val).trim() !== '') {
      if (dateFormat || isDateField) {
        return formatDateCustom(String(val), dateFormat || 'DD-MM-YYYY');
      }
      return String(val);
    }
    // When a real record is active, do not inject arbitrary fake defaults; return fallback or empty
    if (hasRealData) {
      return fallback;
    }
    const sample = fallback || getDefaultSampleValue(key);
    if (dateFormat || isDateField) {
      return formatDateCustom(sample, dateFormat || 'DD-MM-YYYY');
    }
    return sample;
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
    dateFormat?: string;
  },
  record: Record<string, any> = {}
): string {
  const rawText = elem.content !== undefined ? elem.content : '';

  // 1. If text contains template mustache tags like {{roll_no}}, interpolate them with record values
  if (rawText.includes('{{')) {
    return interpolateString(rawText, record, elem.fallback || '', elem.dateFormat);
  }

  // 2. If it's explicitly static text (type === 'text'), return content verbatim
  if (elem.type === 'text') {
    return rawText;
  }

  // 3. If it has a fieldKey bound or is dynamic-text
  if (elem.type === 'dynamic-text' || elem.fieldKey) {
    if (elem.fieldKey) {
      const val = getRecordFieldValue(record, elem.fieldKey);
      let displayVal =
        val !== undefined && val !== null && String(val).trim() !== ''
          ? String(val)
          : (elem.fallback || '');

      const cleanKey = elem.fieldKey.trim().toLowerCase();
      const isDateField = cleanKey.includes('dob') || cleanKey.includes('birth') || cleanKey.includes('date');

      if (elem.dateFormat || isDateField) {
        displayVal = formatDateCustom(displayVal, elem.dateFormat || 'DD-MM-YYYY');
      }

      // Check if user entered direct text
      if (rawText.trim()) {
        // If content has a label prefix (e.g. "Roll No: " or "Roll No-")
        if (
          rawText.endsWith(':') ||
          rawText.endsWith('-') ||
          rawText.endsWith(': ') ||
          rawText.endsWith('- ')
        ) {
          const sep = rawText.endsWith(' ') ? '' : ' ';
          return `${rawText}${sep}${displayVal}`;
        }

        // Direct text entered by user without trailing colon/dash and without {{ (e.g. "Session")
        // User explicitly wants this text to stay default/static for all cards!
        return rawText;
      }

      return displayVal;
    } else if (elem.fallback && !rawText.trim()) {
      return elem.fallback;
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

let _measureCanvas: HTMLCanvasElement | null = null;
let _measureCtx: CanvasRenderingContext2D | null = null;

export function getMeasurementContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!_measureCtx) {
    try {
      _measureCanvas = document.createElement('canvas');
      _measureCtx = _measureCanvas.getContext('2d');
    } catch {
      _measureCtx = null;
    }
  }
  return _measureCtx;
}

export function createTextMeasureFn(fontSpec: string): (s: string) => number {
  const ctx = getMeasurementContext();
  if (ctx) {
    ctx.font = fontSpec;
    return (s: string) => ctx.measureText(s).width;
  }
  return (s: string) => s.length * 8;
}

/**
 * Break long text into word-wrapped lines matching container width.
 * Used identically across on-screen canvas editor, live previews, and PDF export.
 */
export function wrapTextToLines(
  text: string,
  maxWidthPx: number,
  measureTextFn?: (str: string) => number
): string[] {
  if (!text) return [''];
  if (maxWidthPx <= 0) return text.split('\n');

  // Fallback measurement if no Canvas context function provided: approx 0.6em per char
  let measure = measureTextFn;
  if (!measure) {
    const ctx = getMeasurementContext();
    if (ctx) {
      measure = (s: string) => ctx.measureText(s).width;
    } else {
      measure = (s: string) => s.length * 8;
    }
  }

  const paragraphs = text.split('\n');
  const allLines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      allLines.push('');
      continue;
    }

    const words = para.split(/\s+/);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!currentLine) {
        if (measure(word) > maxWidthPx) {
          // Break overly long single word (e.g. unbroken URL or long token)
          let chunk = '';
          for (const char of word) {
            if (measure(chunk + char) <= maxWidthPx) {
              chunk += char;
            } else {
              if (chunk) allLines.push(chunk);
              chunk = char;
            }
          }
          if (chunk) currentLine = chunk;
        } else {
          currentLine = word;
        }
      } else {
        const candidate = `${currentLine} ${word}`;
        if (measure(candidate) <= maxWidthPx) {
          currentLine = candidate;
        } else {
          allLines.push(currentLine);
          if (measure(word) > maxWidthPx) {
            let chunk = '';
            for (const char of word) {
              if (measure(chunk + char) <= maxWidthPx) {
                chunk += char;
              } else {
                if (chunk) allLines.push(chunk);
                chunk = char;
              }
            }
            currentLine = chunk;
          } else {
            currentLine = word;
          }
        }
      }
    }

    if (currentLine) {
      allLines.push(currentLine);
    }
  }

  return allLines.length > 0 ? allLines : [''];
}

/**
 * Accurately calculate the optimal auto-fitted font size (in mm)
 * so text stays strictly within the bounding box (width & height),
 * properly wrapping multi-word address and name lines.
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
  const ctx = getMeasurementContext();
  if (ctx) {
    try {
      const fw =
        fontWeight === 'bold' ? '700' : fontWeight === 'semibold' ? '600' : fontWeight === 'medium' ? '500' : '400';

      // Convert box dimensions to px at 96 DPI for testing
      const boxWPx = (boxWidthMm * 96) / 25.4;
      const boxHPx = (boxHeightMm * 96) / 25.4;

      // Is this a single-line label box by height constraint?
      const isSingleLineBox = boxHeightMm < baseFontSizeMm * 1.4;
      // Safety margin: 5% for single-line (font engine variance across DPIs), 3% for multi-line
      const singleLineMargin = 0.95;
      const multiLineMargin = 0.97;

      // Binary search for maximum font size that fits inside width and height
      let bestFontSizeMm = minFontSizeMm;
      let low = minFontSizeMm;
      let high = baseFontSizeMm;
      const epsilon = 0.1; // 0.1mm precision

      for (let iter = 0; iter < 12; iter++) {
        const midMm = (low + high) / 2;
        const midPx = (midMm * 96) / 25.4;
        ctx.font = `${fw} ${midPx}px "${fontFamily}", sans-serif`;

        if (isSingleLineBox) {
          const singleLineW = ctx.measureText(text).width;
          if (singleLineW <= boxWPx * singleLineMargin) {
            bestFontSizeMm = midMm;
            low = midMm; // Fits on single line, try larger
          } else {
            high = midMm; // Too large for single line, try smaller
          }
        } else {
          const lines = wrapTextToLines(text, boxWPx * multiLineMargin, (s) => ctx.measureText(s).width);
          const lineHeightPx = midPx * 1.25;
          const totalHPx = lines.length * lineHeightPx;

          let maxLineWPx = 0;
          for (const line of lines) {
            const w = ctx.measureText(line).width;
            if (w > maxLineWPx) maxLineWPx = w;
          }

          if (maxLineWPx <= boxWPx * multiLineMargin && totalHPx <= boxHPx * multiLineMargin) {
            bestFontSizeMm = midMm;
            low = midMm; // Can try larger
          } else {
            high = midMm; // Too large, try smaller
          }
        }

        if (high - low < epsilon) break;
      }

      return Math.max(minFontSizeMm, Math.min(baseFontSizeMm, Number(bestFontSizeMm.toFixed(2))));
    } catch {
      // Fallback below
    }
  }

  // Pure mathematical fallback
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


