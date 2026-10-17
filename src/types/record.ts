export type RecordStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface RecordFilterOptions {
  search?: string;
  status?: RecordStatus | 'all';
  source?: 'all' | 'manual' | 'form_submission' | 'csv_import';
  page?: number;
  pageSize?: number;
}

export interface CSVColumnMapping {
  csvHeader: string;
  targetFieldKey: string;
  required: boolean;
}

export interface CSVImportPreview {
  headers: string[];
  totalRows: number;
  sampleRows: Record<string, string>[];
}

export interface CSVImportResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; identifier?: string; reason: string }>;
}
