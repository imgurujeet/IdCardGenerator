import QRCode from 'qrcode';
import { CardLayout, TemplateDocument, TemplateElement } from '../../../types/template';
import { interpolateString, mmToPx } from '../../../lib/utils';

export interface RenderOptions {
  dpi?: number;                 // default 300 for print, 96 for screen
  recordData?: Record<string, any>; // dataset record
  side?: 'front' | 'back';
}

/**
 * Shared high-fidelity Canvas rendering engine.
 * Renders any TemplateDocument layout onto an HTML5 Canvas.
 */
export async function renderCardToCanvas(
  doc: TemplateDocument,
  options: RenderOptions = {}
): Promise<HTMLCanvasElement> {
  const dpi = options.dpi || 300;
  const record = options.recordData || {};
  const side = options.side || 'front';

  const layout: CardLayout =
    side === 'back' && doc.layouts.back ? doc.layouts.back : doc.layouts.front;

  const widthPx = Math.round(mmToPx(doc.dimensions.width, dpi));
  const heightPx = Math.round(mmToPx(doc.dimensions.height, dpi));

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D canvas rendering context.');
  }

  // High quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw Background Color
  if (layout.backgroundColor) {
    ctx.fillStyle = layout.backgroundColor;
    ctx.fillRect(0, 0, widthPx, heightPx);
  }

  // Draw Background Image
  if (layout.backgroundImageUrl) {
    try {
      ctx.save();
      if (layout.backgroundOpacity !== undefined) {
        ctx.globalAlpha = layout.backgroundOpacity;
      }
      const bgImg = await loadImage(layout.backgroundImageUrl);
      ctx.drawImage(bgImg, 0, 0, widthPx, heightPx);
      ctx.restore();
    } catch (e) {
      console.warn('Failed to load background image:', e);
    }
  }

  // 2. Sort elements by zIndex
  const sortedElements = [...layout.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  // 3. Render each element
  for (const elem of sortedElements) {
    if (elem.visible === false) continue;
    await renderElement(ctx, elem, record, dpi);
  }

  return canvas;
}

async function renderElement(
  ctx: CanvasRenderingContext2D,
  elem: TemplateElement,
  record: Record<string, any>,
  dpi: number
) {
  const x = mmToPx(elem.x, dpi);
  const y = mmToPx(elem.y, dpi);
  const w = mmToPx(elem.width, dpi);
  const h = mmToPx(elem.height, dpi);

  ctx.save();
  ctx.globalAlpha = elem.opacity ?? 1;

  // Handle rotation
  if (elem.rotation && elem.rotation !== 0) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((elem.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  switch (elem.type) {
    case 'shape': {
      if (elem.shapeType === 'rectangle') {
        const radius = elem.borderRadius ? mmToPx(elem.borderRadius, dpi) : 0;
        ctx.beginPath();
        if (radius > 0 && ctx.roundRect) {
          ctx.roundRect(x, y, w, h, radius);
        } else {
          ctx.rect(x, y, w, h);
        }
        if (elem.fillColor) {
          ctx.fillStyle = elem.fillColor;
          ctx.fill();
        }
        if (elem.strokeColor && elem.strokeWidth) {
          ctx.strokeStyle = elem.strokeColor;
          ctx.lineWidth = mmToPx(elem.strokeWidth, dpi);
          ctx.stroke();
        }
      } else if (elem.shapeType === 'circle') {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const r = Math.min(w, h) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        if (elem.fillColor) {
          ctx.fillStyle = elem.fillColor;
          ctx.fill();
        }
        if (elem.strokeColor && elem.strokeWidth) {
          ctx.strokeStyle = elem.strokeColor;
          ctx.lineWidth = mmToPx(elem.strokeWidth, dpi);
          ctx.stroke();
        }
      }
      break;
    }

    case 'text':
    case 'dynamic-text': {
      let rawText = elem.content || '';
      if (elem.type === 'dynamic-text') {
        if (elem.fieldKey && record[elem.fieldKey] !== undefined) {
          rawText = String(record[elem.fieldKey]);
        } else {
          rawText = interpolateString(rawText, record, elem.fallback || '');
        }
      }

      if (elem.textTransform === 'uppercase') rawText = rawText.toUpperCase();
      if (elem.textTransform === 'lowercase') rawText = rawText.toLowerCase();

      // Convert mm font size to pixels for canvas
      const fontSizePx = mmToPx(elem.fontSize, dpi);
      const fontStyle = elem.fontStyle === 'italic' ? 'italic' : 'normal';
      const fontWeight =
        elem.fontWeight === 'bold'
          ? '700'
          : elem.fontWeight === 'semibold'
          ? '600'
          : elem.fontWeight === 'medium'
          ? '500'
          : '400';

      ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px "${elem.fontFamily || 'Inter'}", sans-serif`;
      ctx.fillStyle = elem.color || '#000000';
      ctx.textBaseline = 'top';

      let textX = x;
      if (elem.textAlign === 'center') {
        ctx.textAlign = 'center';
        textX = x + w / 2;
      } else if (elem.textAlign === 'right') {
        ctx.textAlign = 'right';
        textX = x + w;
      } else {
        ctx.textAlign = 'left';
      }

      // Photoshop-like text shadow
      if (elem.textShadow) {
        ctx.shadowColor = elem.textShadow.color || 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = mmToPx(elem.textShadow.blur, dpi);
        ctx.shadowOffsetX = mmToPx(elem.textShadow.offsetX, dpi);
        ctx.shadowOffsetY = mmToPx(elem.textShadow.offsetY, dpi);
      }

      // Handle multi-line
      const lines = rawText.split('\n');
      const lineHeightPx = fontSizePx * (elem.lineHeight || 1.25);
      lines.forEach((line, idx) => {
        const lineY = y + idx * lineHeightPx;

        // Draw text stroke if configured
        if (elem.textStrokeColor && elem.textStrokeWidth) {
          ctx.strokeStyle = elem.textStrokeColor;
          ctx.lineWidth = mmToPx(elem.textStrokeWidth, dpi);
          ctx.strokeText(line, textX, lineY);
        }

        ctx.fillText(line, textX, lineY);

        // Draw Underline if enabled
        if (elem.underline) {
          const textMetrics = ctx.measureText(line);
          const textW = textMetrics.width;
          let lineStartX = textX;
          if (elem.textAlign === 'center') {
            lineStartX = textX - textW / 2;
          } else if (elem.textAlign === 'right') {
            lineStartX = textX - textW;
          }
          const underlineY = lineY + fontSizePx * 1.1;
          ctx.beginPath();
          ctx.strokeStyle = elem.color || '#000000';
          ctx.lineWidth = Math.max(1, fontSizePx * 0.08);
          ctx.moveTo(lineStartX, underlineY);
          ctx.lineTo(lineStartX + textW, underlineY);
          ctx.stroke();
        }
      });
      break;
    }

    case 'portrait':
    case 'image':
    case 'logo': {
      let src = elem.src;
      if (elem.fieldKey && record[elem.fieldKey]) {
        src = record[elem.fieldKey];
      }

      if (!src) {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${Math.max(12, mmToPx(3, dpi))}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(elem.name, x + w / 2, y + h / 2);
      } else {
        try {
          const img = await loadImage(src);
          const radius = elem.borderRadius ? mmToPx(elem.borderRadius, dpi) : 0;

          ctx.save();
          if (radius > 0 && ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, radius);
            ctx.clip();
          }

          // Cover or contain fit
          drawImageProp(ctx, img, x, y, w, h, elem.objectFit === 'contain' ? 'contain' : 'cover');
          ctx.restore();

          if (elem.borderColor && elem.borderWidth) {
            ctx.strokeStyle = elem.borderColor;
            ctx.lineWidth = mmToPx(elem.borderWidth, dpi);
            if (radius > 0 && ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, radius);
              ctx.stroke();
            } else {
              ctx.strokeRect(x, y, w, h);
            }
          }
        } catch (e) {
          console.warn('Failed to render image:', e);
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(x, y, w, h);
        }
      }
      break;
    }

    case 'qr-code': {
      let qrContent = elem.dataContent || '';
      if (elem.fieldKey && record[elem.fieldKey]) {
        qrContent = interpolateString(qrContent, record, String(record[elem.fieldKey]));
      } else {
        qrContent = interpolateString(qrContent, record, 'VERIFY-RECORD');
      }

      try {
        const qrDataUrl = await QRCode.toDataURL(qrContent, {
          margin: 1,
          width: Math.round(w),
          color: {
            dark: elem.color || '#000000',
            light: elem.backgroundColor || '#ffffff',
          },
        });
        const qrImg = await loadImage(qrDataUrl);
        ctx.drawImage(qrImg, x, y, w, h);
      } catch (e) {
        console.warn('Failed to generate QR code:', e);
      }
      break;
    }

    case 'barcode': {
      let codeVal = elem.dataContent || '';
      if (elem.fieldKey && record[elem.fieldKey]) {
        codeVal = String(record[elem.fieldKey]);
      }

      ctx.fillStyle = elem.backgroundColor || '#ffffff';
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = elem.color || '#000000';
      const numBars = 35;
      const barWidth = w / (numBars * 1.5);
      for (let i = 0; i < numBars; i++) {
        const isThick = (i % 3 === 0 || i % 7 === 0);
        const bx = x + i * (barWidth * 1.5);
        const bw = isThick ? barWidth * 1.8 : barWidth * 0.9;
        ctx.fillRect(bx, y + 2, bw, h - 8);
      }

      ctx.fillStyle = elem.color || '#000000';
      ctx.font = `${Math.max(9, mmToPx(2.2, dpi))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(codeVal, x + w / 2, y + h - 1);
      break;
    }
  }

  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function drawImageProp(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  fit: 'cover' | 'contain' = 'cover'
) {
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  let nw = w;
  let nh = h;
  let nx = x;
  let ny = y;

  const ratio = imgW / imgH;
  const targetRatio = w / h;

  if (fit === 'cover') {
    if (ratio > targetRatio) {
      nw = h * ratio;
      nx = x - (nw - w) / 2;
    } else {
      nh = w / ratio;
      ny = y - (nh - h) / 2;
    }
  } else {
    if (ratio > targetRatio) {
      nh = w / ratio;
      ny = y + (h - nh) / 2;
    } else {
      nw = h * ratio;
      nx = x + (w - nw) / 2;
    }
  }

  ctx.drawImage(img, nx, ny, nw, nh);
}
