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

  it('resolves dynamic elements with prefix labels without stripping text', async () => {
    const { resolveElementText } = await import('../../src/lib/utils');
    const record = { roll_no: '141', student_name: 'Abhishek Kumar' };

    // Case 1: Template with placeholder
    expect(
      resolveElementText(
        { type: 'dynamic-text', content: 'Roll No- {{roll_no}}', fieldKey: 'roll_no' },
        record
      )
    ).toBe('Roll No- 141');

    // Case 2: Static label prefix with fieldKey
    expect(
      resolveElementText(
        { type: 'dynamic-text', content: 'Roll No:', fieldKey: 'roll_no' },
        record
      )
    ).toBe('Roll No: 141');

    // Case 3: Pure dynamic variable
    expect(
      resolveElementText(
        { type: 'dynamic-text', content: '{{student_name}}', fieldKey: 'student_name' },
        record
      )
    ).toBe('Abhishek Kumar');

    // Case 4: Fallback used when record value missing
    expect(
      resolveElementText(
        { type: 'dynamic-text', content: 'Roll No- {{roll_no}}', fieldKey: 'roll_no', fallback: '101' },
        {}
      )
    ).toBe('Roll No- 101');

    // Case 5: Direct text typed by user without mustache tags stays default for all cards
    // even if element still has fieldKey from a template
    expect(
      resolveElementText(
        { type: 'dynamic-text', content: 'Session', fieldKey: 'session', name: 'Session' },
        { session: '2026-2028' }
      )
    ).toBe('Session');

    // Case 6: Static text element always renders verbatim
    expect(
      resolveElementText(
        { type: 'text', content: 'Gov. of Bihar' },
        { student_name: 'Anup Sharma' }
      )
    ).toBe('Gov. of Bihar');
  });

  it('formats structured Indian address consistently for ID cards', async () => {
    const { formatStructuredAddress, getRecordFieldValue } = await import('../../src/lib/utils');

    // Case 1: Village address type
    const villData = {
      address_type: 'village',
      village_name: 'Rampur',
      police_station: 'Barh',
      district: 'Patna',
      state: 'Bihar',
      pincode: '803213',
    };
    const formattedVill = formatStructuredAddress(villData);
    expect(formattedVill.villageWard).toBe('Vill- Rampur');
    expect(formattedVill.districtPin).toBe('Patna - 803213');
    expect(getRecordFieldValue(villData, 'village_ward')).toBe('Vill- Rampur');
    expect(getRecordFieldValue(villData, 'district_pin')).toBe('Patna - 803213');

    // Case 2: Ward address type
    const wardData = {
      address_type: 'ward',
      ward_no: '04',
      police_station: 'Kotwali',
      district: 'Gaya',
      state: 'Bihar',
      pincode: '823001',
    };
    const formattedWard = formatStructuredAddress(wardData);
    expect(formattedWard.villageWard).toBe('Ward No.- 04');
    expect(getRecordFieldValue(wardData, 'village_ward')).toBe('Ward No.- 04');

    // Case 3: Strips duplicate prefix if student typed "Vill - Rampur"
    const redundantData = {
      address_type: 'village',
      village_name: 'Vill- Rampur',
      police_station: 'Barh',
    };
    expect(formatStructuredAddress(redundantData).villageWard).toBe('Vill- Rampur');

    // Case 4: PO and PS are same -> formats cleanly as PO+PS- <Name>
    const samePoPsData = {
      address_type: 'village',
      village_name: 'Akbarpur',
      police_station: 'Barh',
      post_office: 'Barh',
      district: 'Patna',
      state: 'Bihar',
      pincode: '803213',
    };
    const formattedSamePoPs = formatStructuredAddress(samePoPsData);
    expect(formattedSamePoPs.poPs).toBe('PO+PS- Barh');
    expect(formattedSamePoPs.fullAddress).toContain('PO+PS- Barh');

    // Case 5: PO and PS are different -> formats as PO- <PO>, PS- <PS>
    const diffPoPsData = {
      address_type: 'village',
      village_name: 'Akbarpur',
      police_station: 'Mokama',
      post_office: 'Barh',
      district: 'Patna',
      state: 'Bihar',
      pincode: '803213',
    };
    const formattedDiff = formatStructuredAddress(diffPoPsData);
    expect(formattedDiff.poPs).toBe('PO- Barh, PS- Mokama');
    expect(formattedDiff.fullAddress).toContain('PO- Barh, PS- Mokama');

    // Case 6: City included when distinct from District
    const cityData = {
      address_type: 'village',
      village_name: 'Akbarpur',
      police_station: 'Barh',
      city: 'Mokama',
      district: 'Patna',
      state: 'Bihar',
      pincode: '803213',
    };
    const formattedCity = formatStructuredAddress(cityData);
    expect(formattedCity.fullAddress).toContain('City- Mokama');

    // Case 7: Blood group defaults to 'NA' when key is present but empty or unselected
    expect(getRecordFieldValue({}, 'blood_group')).toBeUndefined();
    expect(getRecordFieldValue({ blood_group: '' }, 'blood_group')).toBe('NA');
    expect(getRecordFieldValue({ blood_group: 'B+' }, 'blood_group')).toBe('B+');
  });

  it('wraps text cleanly into multiple lines based on bounding box width', async () => {
    const { wrapTextToLines } = await import('../../src/lib/utils');
    const longAddress = 'Vill- Rampur, P.S.- Barh, Dist- Patna, Bihar - 803213';
    // With 120px max width and 6px per char measure function, it should wrap onto multiple lines
    const lines = wrapTextToLines(longAddress, 120, (str) => str.length * 6);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe(longAddress);
  });

  it('calculates auto-fit font size for long text fitting within box bounds', async () => {
    const { calculateAutoFitFontSizeMm } = await import('../../src/lib/utils');
    const longName = 'MUHAMMAD SHOAIB UR RAHMAN AL HUSSEINI';
    // Box: 40mm wide, 5mm high, base font 4mm, min font 2mm
    const fittedSize = calculateAutoFitFontSizeMm(longName, 40, 5, 4.0, 'Inter', 'bold', 2.0);
    expect(fittedSize).toBeLessThanOrEqual(4.0);
    expect(fittedSize).toBeGreaterThanOrEqual(2.0);
  });

  it('correctly parses and formats dates across different format patterns (DOB formatting)', async () => {
    const { formatDateCustom, parseDateString, resolveElementText } = await import('../../src/lib/utils');

    // Parse various date inputs
    expect(parseDateString('2003-03-08')).toEqual({ year: 2003, month: 3, day: 8 });
    expect(parseDateString('08-03-2003')).toEqual({ year: 2003, month: 3, day: 8 });
    expect(parseDateString('08/03/2003')).toEqual({ year: 2003, month: 3, day: 8 });
    expect(parseDateString('08-03-03')).toEqual({ year: 2003, month: 3, day: 8 });

    // Format YYYY-MM-DD to DD-MM-YYYY
    expect(formatDateCustom('2003-03-08', 'DD-MM-YYYY')).toBe('08-03-2003');
    // Format DD-MM-YYYY to YYYY-MM-DD
    expect(formatDateCustom('08-03-2003', 'YYYY-MM-DD')).toBe('2003-03-08');
    // Format to DD/MM/YYYY
    expect(formatDateCustom('2003-03-08', 'DD/MM/YYYY')).toBe('08/03/2003');
    // Format to DD-MM-YY
    expect(formatDateCustom('2003-03-08', 'DD-MM-YY')).toBe('08-03-03');
    // Format to DD MMM YYYY
    expect(formatDateCustom('2003-03-08', 'DD MMM YYYY')).toBe('08 Mar 2003');

    // Test resolveElementText with DOB
    const record = { dob: '2003-03-08' };
    // Default for {{dob}} should be DD-MM-YYYY
    expect(resolveElementText({ content: '{{dob}}' }, record)).toBe('08-03-2003');
    // Custom dateFormat on element
    expect(resolveElementText({ content: '{{dob}}', dateFormat: 'YYYY-MM-DD' }, record)).toBe('2003-03-08');
    expect(resolveElementText({ content: '{{dob}}', dateFormat: 'DD/MM/YYYY' }, record)).toBe('08/03/2003');
    expect(resolveElementText({ content: '{{dob}}', dateFormat: 'DD-MM-YY' }, record)).toBe('08-03-03');
  });
});
