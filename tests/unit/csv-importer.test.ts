import { describe, it, expect } from 'vitest';
import { recordService } from '../../src/services/record.service';
import { CSVColumnMapping } from '../../src/types/record';

describe('CSV Importer Service', () => {
  it('maps and imports CSV rows into records successfully', async () => {
    const rawRows = [
      {
        'Full Name': 'Jordan Lee',
        'Roll Number': 'OA-2026-901',
        Class: 'Grade 10',
        Blood: 'B+',
      },
      {
        'Full Name': 'Maya Patel',
        'Roll Number': 'OA-2026-902',
        Class: 'Grade 11',
        Blood: 'O+',
      },
    ];

    const mappings: CSVColumnMapping[] = [
      { csvHeader: 'Full Name', targetFieldKey: 'student_name', required: true },
      { csvHeader: 'Roll Number', targetFieldKey: 'student_id', required: true },
      { csvHeader: 'Class', targetFieldKey: 'grade', required: false },
      { csvHeader: 'Blood', targetFieldKey: 'blood_group', required: false },
    ];

    const result = await recordService.importCSVRecords('org-0001', rawRows, mappings);

    expect(result.totalProcessed).toBe(2);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('detects and flags rows missing required fields', async () => {
    const rawRows = [
      {
        'Full Name': '', // Empty name!
        'Roll Number': 'OA-2026-903',
      },
    ];

    const mappings: CSVColumnMapping[] = [
      { csvHeader: 'Full Name', targetFieldKey: 'student_name', required: true },
      { csvHeader: 'Roll Number', targetFieldKey: 'student_id', required: true },
    ];

    const result = await recordService.importCSVRecords('org-0001', rawRows, mappings);

    expect(result.totalProcessed).toBe(1);
    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('Missing required field');
  });
});
