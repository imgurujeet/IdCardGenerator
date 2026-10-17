export type GenerationOutputMode = 'single_pdf' | 'bulk_zip' | 'print_sheet';

export interface PrintSheetLayout {
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  columns: number;           // e.g. 2
  rows: number;              // e.g. 4 or 5
  marginMm: number;          // e.g. 10mm
  spacingMm: number;         // e.g. 4mm
  includeCropMarks: boolean;
  duplexMode: 'simplex' | 'duplex_flip_short' | 'duplex_flip_long';
}

export interface GenerationConfig {
  templateVersionId: string;
  outputMode: GenerationOutputMode;
  recordIds: string[];
  includeBackLayout: boolean;
  printLayout?: PrintSheetLayout;
  dpi: number;               // 300 for print quality
}

export interface GenerationProgress {
  total: number;
  completed: number;
  percentage: number;
  currentStep: string;
}
