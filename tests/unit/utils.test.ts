import { describe, it, expect } from 'vitest';
import { mmToPx, pxToMm, mmToPt, ptToMm, interpolateString } from '../../src/lib/utils';

describe('Unit Conversion Utilities', () => {
  it('converts mm to pixels accurately at 96 DPI', () => {
    // 25.4 mm = 1 inch = 96 px at 96 DPI
    expect(mmToPx(25.4, 96)).toBeCloseTo(96, 4);
    expect(pxToMm(96, 96)).toBeCloseTo(25.4, 4);
  });

  it('converts mm to points for vector PDF-lib coordinates (72 points/inch)', () => {
    // 25.4 mm = 1 inch = 72 pt
    expect(mmToPt(25.4)).toBeCloseTo(72, 4);
    expect(ptToMm(72)).toBeCloseTo(25.4, 4);
  });

  it('interpolates dynamic variables in template strings', () => {
    const data = {
      student_name: 'Eleanor Vance',
      student_id: 'OA-2026-101',
      grade: 'Grade 11',
    };

    const template = 'Student: {{student_name}} ({{student_id}}) - Class: {{grade}}';
    const result = interpolateString(template, data);
    expect(result).toBe('Student: Eleanor Vance (OA-2026-101) - Class: Grade 11');
  });

  it('uses fallback if record field is missing or empty', () => {
    const data = { student_name: 'Eleanor Vance' };
    const template = 'Blood: {{blood_group}}';
    const result = interpolateString(template, data, 'N/A');
    expect(result).toBe('Blood: N/A');
  });
});
