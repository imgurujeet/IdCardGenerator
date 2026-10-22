import JSZip from 'jszip';
import { TemplateDocument } from '../../../types/template';
import { renderCardToCanvas } from './canvasRenderer';
import { generateSingleCardPdf } from './pdfExporter';
import { getRecordDisplayName, getRecordDisplayRoll, sanitizeFilenamePart } from '../../../lib/utils';

/**
 * Generate a single card ZIP bundle containing both Front and Back JPG/PNG images.
 */
export async function generateSingleCardZip(
  doc: TemplateDocument,
  record: Record<string, any>,
  format: 'jpg' | 'png' = 'jpg'
): Promise<Blob> {
  const zip = new JSZip();
  const roll = sanitizeFilenamePart(getRecordDisplayRoll(record)) || 'CARD';
  const safeName = sanitizeFilenamePart(getRecordDisplayName(record)) || 'Student';
  const ext = format === 'jpg' ? 'jpg' : 'png';
  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpg' ? 0.95 : undefined;

  // Front Side
  const frontCanvas = await renderCardToCanvas(doc, { dpi: 300, recordData: record, side: 'front' });
  const frontBlob = await new Promise<Blob | null>((resolve) =>
    frontCanvas.toBlob((b) => resolve(b), mimeType, quality)
  );
  if (frontBlob) {
    zip.file(`${roll}_${safeName}_front.${ext}`, frontBlob);
  }

  // Back Side (if layout exists)
  if (doc.layouts.back) {
    const backCanvas = await renderCardToCanvas(doc, { dpi: 300, recordData: record, side: 'back' });
    const backBlob = await new Promise<Blob | null>((resolve) =>
      backCanvas.toBlob((b) => resolve(b), mimeType, quality)
    );
    if (backBlob) {
      zip.file(`${roll}_${safeName}_back.${ext}`, backBlob);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Generate a bulk ZIP archive for all student records with Front and Back images/documents.
 */
export async function generateIndividualCardsZip(
  doc: TemplateDocument,
  records: Record<string, any>[],
  format: 'jpg' | 'png' | 'pdf' = 'jpg',
  includeBack: boolean = true,
  onProgress?: (completed: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const docName = sanitizeFilenamePart(doc.name) || 'Cards';
  const folder = zip.folder(`IDCards_${docName}`) || zip;

  const total = records.length;

  for (let i = 0; i < total; i++) {
    const record = records[i];
    const roll = sanitizeFilenamePart(getRecordDisplayRoll(record, i)) || `CARD-${(i + 1).toString().padStart(3, '0')}`;
    const safeName = sanitizeFilenamePart(getRecordDisplayName(record)) || `Student_${i + 1}`;

    if (format === 'pdf') {
      const pdfBytes = await generateSingleCardPdf(doc, record, includeBack && !!doc.layouts.back);
      folder.file(`${roll}_${safeName}.pdf`, pdfBytes);
    } else {
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const ext = format === 'jpg' ? 'jpg' : 'png';
      const quality = format === 'jpg' ? 0.95 : undefined;

      // Front Side
      const frontCanvas = await renderCardToCanvas(doc, { dpi: 300, recordData: record, side: 'front' });
      const frontBlob = await new Promise<Blob | null>((resolve) =>
        frontCanvas.toBlob((b) => resolve(b), mimeType, quality)
      );
      if (frontBlob) {
        folder.file(`${roll}_${safeName}_front.${ext}`, frontBlob);
      }

      // Back Side
      if (includeBack && doc.layouts.back) {
        const backCanvas = await renderCardToCanvas(doc, { dpi: 300, recordData: record, side: 'back' });
        const backBlob = await new Promise<Blob | null>((resolve) =>
          backCanvas.toBlob((b) => resolve(b), mimeType, quality)
        );
        if (backBlob) {
          folder.file(`${roll}_${safeName}_back.${ext}`, backBlob);
        }
      }
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

