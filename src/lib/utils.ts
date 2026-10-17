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

// Dynamic field interpolator: replaces {{field_name}} with record[field_name]
export function interpolateString(template: string, data: Record<string, any>, fallback: string = ''): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    let val = data[key];
    if (val === undefined && data.data && typeof data.data === 'object') {
      val = data.data[key];
    }
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val);
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
      let val = record[elem.fieldKey];
      if (val === undefined && record.data && typeof record.data === 'object') {
        val = record.data[elem.fieldKey];
      }

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
          rawText = `${rawText}: ${displayVal}`;
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

