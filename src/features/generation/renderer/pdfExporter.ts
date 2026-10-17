import { PDFDocument } from 'pdf-lib';
import { TemplateDocument } from '../../../types/template';
import { PrintSheetLayout } from '../../../types/generation';
import { mmToPt } from '../../../lib/utils';
import { renderCardToCanvas } from './canvasRenderer';

/**
 * Generate a high-resolution, print-ready PDF for a single ID card.
 */
export async function generateSingleCardPdf(
  doc: TemplateDocument,
  recordData: Record<string, any> = {},
  includeBack: boolean = false
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const widthPt = mmToPt(doc.dimensions.width);
  const heightPt = mmToPt(doc.dimensions.height);

  // 1. Front Side
  const frontCanvas = await renderCardToCanvas(doc, { dpi: 300, recordData, side: 'front' });
  const frontDataUrl = frontCanvas.toDataURL('image/png');
  const frontImageBytes = await fetch(frontDataUrl).then((res) => res.arrayBuffer());
  const frontPdfImage = await pdfDoc.embedPng(frontImageBytes);

  const frontPage = pdfDoc.addPage([widthPt, heightPt]);
  frontPage.drawImage(frontPdfImage, {
    x: 0,
    y: 0,
    width: widthPt,
    height: heightPt,
  });

  // 2. Back Side (if requested & defined)
  if (includeBack && doc.layouts.back) {
    const backCanvas = await renderCardToCanvas(doc, { dpi: 300, recordData, side: 'back' });
    const backDataUrl = backCanvas.toDataURL('image/png');
    const backImageBytes = await fetch(backDataUrl).then((res) => res.arrayBuffer());
    const backPdfImage = await pdfDoc.embedPng(backImageBytes);

    const backPage = pdfDoc.addPage([widthPt, heightPt]);
    backPage.drawImage(backPdfImage, {
      x: 0,
      y: 0,
      width: widthPt,
      height: heightPt,
    });
  }

  return await pdfDoc.save();
}

/**
 * Generate a multi-up Print Sheet PDF (e.g. A4 sheet containing 8 or 10 ID cards)
 * with exact margins, spacing, and duplex alignment.
 */
export async function generatePrintSheetPdf(
  doc: TemplateDocument,
  records: Record<string, any>[],
  layout: PrintSheetLayout = {
    pageSize: 'A4',
    orientation: 'portrait',
    columns: 2,
    rows: 4,
    marginMm: 10,
    spacingMm: 4,
    includeCropMarks: true,
    duplexMode: 'simplex',
  },
  includeBack: boolean = false,
  onProgress?: (completed: number, total: number) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // A4 dimensions in mm: 210 x 297 mm
  const pageW_mm = layout.pageSize === 'A4' ? 210 : 215.9;
  const pageH_mm = layout.pageSize === 'A4' ? 297 : 279.4;

  const pageW_pt = mmToPt(layout.orientation === 'portrait' ? pageW_mm : pageH_mm);
  const pageH_pt = mmToPt(layout.orientation === 'portrait' ? pageH_mm : pageW_mm);

  const cardW_pt = mmToPt(doc.dimensions.width);
  const cardH_pt = mmToPt(doc.dimensions.height);

  const marginPt = mmToPt(layout.marginMm);
  const spacingPt = mmToPt(layout.spacingMm);

  const cardsPerPage = layout.columns * layout.rows;
  const totalCards = records.length;

  for (let i = 0; i < totalCards; i += cardsPerPage) {
    const chunk = records.slice(i, i + cardsPerPage);
    const frontPage = pdfDoc.addPage([pageW_pt, pageH_pt]);

    // Front Layout Grid
    for (let index = 0; index < chunk.length; index++) {
      const record = chunk[index];
      const col = index % layout.columns;
      const row = Math.floor(index / layout.columns);

      const x = marginPt + col * (cardW_pt + spacingPt);
      // PDF-lib Y-axis begins from bottom-left
      const y = pageH_pt - marginPt - (row + 1) * cardH_pt - row * spacingPt;

      const canvas = await renderCardToCanvas(doc, { dpi: 300, recordData: record, side: 'front' });
      const imgBytes = await fetch(canvas.toDataURL('image/png')).then((r) => r.arrayBuffer());
      const pdfImage = await pdfDoc.embedPng(imgBytes);

      frontPage.drawImage(pdfImage, { x, y, width: cardW_pt, height: cardH_pt });

      if (onProgress) {
        onProgress(Math.min(i + index + 1, totalCards), totalCards);
      }
    }

    // Back Page (if duplex requested)
    if (includeBack && doc.layouts.back) {
      const backPage = pdfDoc.addPage([pageW_pt, pageH_pt]);

      for (let index = 0; index < chunk.length; index++) {
        const record = chunk[index];
        // Flip columns horizontally for duplex printing alignment
        const originalCol = index % layout.columns;
        const col = layout.columns - 1 - originalCol;
        const row = Math.floor(index / layout.columns);

        const x = marginPt + col * (cardW_pt + spacingPt);
        const y = pageH_pt - marginPt - (row + 1) * cardH_pt - row * spacingPt;

        const canvas = await renderCardToCanvas(doc, { dpi: 300, recordData: record, side: 'back' });
        const imgBytes = await fetch(canvas.toDataURL('image/png')).then((r) => r.arrayBuffer());
        const pdfImage = await pdfDoc.embedPng(imgBytes);

        backPage.drawImage(pdfImage, { x, y, width: cardW_pt, height: cardH_pt });
      }
    }
  }

  return await pdfDoc.save();
}
