export type CardOrientation = 'landscape' | 'portrait';
export type CardUnit = 'mm' | 'in' | 'px';

export interface CardDimensions {
  width: number;         // physical mm
  height: number;        // physical mm
  unit: CardUnit;        // default 'mm'
  dpi: number;           // default 300
  cornerRadius?: number; // mm
}

export type ElementType =
  | 'text'
  | 'dynamic-text'
  | 'image'
  | 'portrait'
  | 'logo'
  | 'background'
  | 'shape'
  | 'qr-code'
  | 'barcode';

export interface TextShadowConfig {
  color: string;
  blur: number;      // mm or px
  offsetX: number;   // mm or px
  offsetY: number;   // mm or px
}

export interface BaseElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;            // mm
  y: number;            // mm
  width: number;        // mm
  height: number;       // mm
  rotation: number;     // degrees (0-360)
  opacity: number;      // 0.0 - 1.0
  locked: boolean;
  visible: boolean;
  zIndex: number;
}

export interface TextElement extends BaseElement {
  type: 'text' | 'dynamic-text';
  content: string;               // e.g. "STUDENT ID CARD" or dynamic "{{student_name}}"
  fieldKey?: string;             // bound record field
  fallback?: string;             // fallback text if record value is missing
  fontFamily: string;
  fontSize: number;              // pt or mm
  fontWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  color: string;                 // hex
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  underline?: boolean;
  textShadow?: TextShadowConfig;
  textStrokeColor?: string;
  textStrokeWidth?: number;      // mm
  autoFit?: boolean;
  minFontSize?: number;          // mm
  maxFontSize?: number;          // mm
}

export interface ImageElement extends BaseElement {
  type: 'image' | 'portrait' | 'logo' | 'background';
  src: string;
  fieldKey?: string;             // bound dynamic photo field
  objectFit: 'contain' | 'cover' | 'fill';
  borderRadius?: number;         // mm
  borderColor?: string;
  borderWidth?: number;          // mm
  grayscale?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'line';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;          // mm
  borderRadius?: number;         // mm
}

export interface CodeElement extends BaseElement {
  type: 'qr-code' | 'barcode';
  dataContent: string;           // e.g. "https://verify.org/id/{{student_id}}"
  fieldKey?: string;
  barcodeFormat?: 'CODE128' | 'EAN13' | 'QR';
  color: string;
  backgroundColor: string;
}

export type TemplateElement = TextElement | ImageElement | ShapeElement | CodeElement;

export interface CardLayout {
  backgroundColor: string;
  backgroundImageUrl?: string;
  backgroundOpacity?: number;    // 0.0 - 1.0
  elements: TemplateElement[];
}

export interface TemplateDocument {
  schemaVersion: number;
  id: string;
  name: string;
  category: 'school' | 'college' | 'corporate' | 'event' | 'hospital' | 'club' | 'custom';
  orientation: CardOrientation;
  dimensions: CardDimensions;
  layouts: {
    front: CardLayout;
    back?: CardLayout;
  };
  defaultFieldMappings: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// Preset Dimensions
export const CARD_PRESETS: Record<string, { name: string; width: number; height: number; description: string }> = {
  CR80_PORTRAIT: {
    name: 'CR80 Portrait (Standard ID)',
    width: 53.98,
    height: 85.60,
    description: 'Standard credit/PVC card size: 2.125" x 3.370" vertical',
  },
  CR80_LANDSCAPE: {
    name: 'CR80 Landscape (Standard ID)',
    width: 85.60,
    height: 53.98,
    description: 'Standard credit/PVC card size: 3.370" x 2.125" horizontal',
  },
  EVENT_BADGE: {
    name: 'Event Badge (Large)',
    width: 101.60,
    height: 152.40,
    description: 'Conference & Event Pass: 4" x 6" vertical',
  },
  SQUARE_BADGE: {
    name: 'Square VIP Pass',
    width: 80.00,
    height: 80.00,
    description: 'Square pass: 80mm x 80mm',
  },
};
