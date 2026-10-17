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

// Dynamic field interpolator: replaces {{field_name}} with record[field_name]
export function interpolateString(template: string, data: Record<string, any>, fallback: string = ''): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, key) => {
    const val = data[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val);
    }
    return fallback;
  });
}
