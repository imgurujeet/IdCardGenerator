import { z } from 'zod';

export const CardDimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(['mm', 'in', 'px']).default('mm'),
  dpi: z.number().int().positive().default(300),
  cornerRadius: z.number().nonnegative().optional(),
});

export const BaseElementSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  zIndex: z.number().int().default(1),
});

export const TextShadowSchema = z.object({
  color: z.string().default('#000000'),
  blur: z.number().nonnegative().default(2),
  offsetX: z.number().default(1),
  offsetY: z.number().default(1),
});

export const TextElementSchema = BaseElementSchema.extend({
  type: z.enum(['text', 'dynamic-text']),
  content: z.string(),
  fieldKey: z.string().optional(),
  fallback: z.string().optional(),
  fontFamily: z.string().default('Inter'),
  fontSize: z.number().positive().default(10),
  fontWeight: z.enum(['normal', 'medium', 'semibold', 'bold']).default('normal'),
  fontStyle: z.enum(['normal', 'italic']).default('normal'),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
  verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
  color: z.string().default('#000000'),
  letterSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
  underline: z.boolean().optional(),
  textShadow: TextShadowSchema.optional(),
  textStrokeColor: z.string().optional(),
  textStrokeWidth: z.number().nonnegative().optional(),
  autoFit: z.boolean().optional(),
  minFontSize: z.number().positive().optional(),
  maxFontSize: z.number().positive().optional(),
  maxLines: z.number().int().positive().optional(),
  dateFormat: z.string().optional(),
});

export const ImageElementSchema = BaseElementSchema.extend({
  type: z.enum(['image', 'portrait', 'logo', 'background']),
  src: z.string(),
  fieldKey: z.string().optional(),
  objectFit: z.enum(['contain', 'cover', 'fill']).default('cover'),
  borderRadius: z.number().nonnegative().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().nonnegative().optional(),
  grayscale: z.boolean().optional(),
  shadowColor: z.string().optional(),
  shadowBlur: z.number().nonnegative().optional(),
});

export const ShapeElementSchema = BaseElementSchema.extend({
  type: z.literal('shape'),
  shapeType: z.enum(['rectangle', 'circle', 'line']),
  fillColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
  borderRadius: z.number().nonnegative().optional(),
});

export const CodeElementSchema = BaseElementSchema.extend({
  type: z.enum(['qr-code', 'barcode']),
  dataContent: z.string(),
  fieldKey: z.string().optional(),
  barcodeFormat: z.enum(['CODE128', 'EAN13', 'QR']).default('QR'),
  color: z.string().default('#000000'),
  backgroundColor: z.string().default('#ffffff'),
});

export const TemplateElementSchema = z.discriminatedUnion('type', [
  TextElementSchema,
  ImageElementSchema,
  ShapeElementSchema,
  CodeElementSchema,
]);

export const CardLayoutSchema = z.object({
  backgroundColor: z.string().default('#ffffff'),
  backgroundImageUrl: z.string().optional(),
  backgroundOpacity: z.number().min(0).max(1).optional(),
  elements: z.array(z.any()),
});

export const TemplateDocumentSchema = z.object({
  schemaVersion: z.number().int().min(1),
  id: z.string().min(1),
  name: z.string().min(1, 'Template name is required'),
  category: z.enum(['school', 'college', 'corporate', 'event', 'hospital', 'club', 'custom']),
  orientation: z.enum(['landscape', 'portrait']),
  dimensions: CardDimensionsSchema,
  layouts: z.object({
    front: CardLayoutSchema,
    back: CardLayoutSchema.optional(),
  }),
  defaultFieldMappings: z.record(z.string(), z.string()).default({}),
  createdAt: z.string(),
  updatedAt: z.string(),
});
