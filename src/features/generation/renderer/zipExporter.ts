import JSZip from 'jszip';
import { TemplateDocument } from '../../../types/template';
import { renderCardToCanvas } from './canvasRenderer';
import { generateSingleCardPdf } from './pdfExporter';

export async function generateIndividualCardsZip(
  doc: TemplateDocument,
  records: Record<string, any>[],
  format: 'png' | 'pdf' = 'png',
  includeBack: boolean = false,
  onProgress?: (completed: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(`IDCards_${doc.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`) || zip;

  const total = records.length;

  for (let i = 0; i < total; i++) {
    const record = records[i];
    const identifier =
      record['student_id'] ||
      record['employee_id'] ||
      record['identifier'] ||
      `CARD-${(i + 1).toString().padStart(4, '0')}`;
    const safeName = (record['student_name'] || record['employee_name'] || record['full_name'] || 'ID')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    if (format === 'pdf') {
      const pdfBytes = await generateSingleCardPdf(doc, record, includeBack);
      folder.file(`${identifier}_${safeName}.pdf`, pdfBytes);
    } else {
      // PNG Format
      const frontCanvas = await renderCardToCanvas(doc, { dpi: 300, recordData: record, side: 'front' });
      const frontBlob = await new Promise<Blob | null>((resolve) =>
        frontCanvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (frontBlob) {
        folder.file(`${identifier}_${safeName}_front.png`, frontBlob);
      }

      if (includeBack && doc.layouts.back) {
        const backCanvas = await renderCardToCanvas(doc, { dpi: 300, recordData: record, side: 'back' });
        const backBlob = await new Promise<Blob | null>((resolve) =>
          backCanvas.toBlob((b) => resolve(b), 'image/png')
        );
        if (backBlob) {
          folder.file(`${identifier}_${safeName}_back.png`, backBlob);
        }
      }
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}
