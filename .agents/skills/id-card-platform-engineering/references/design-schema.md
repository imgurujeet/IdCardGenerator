# Design Schema Reference

## Template Document Specification

```typescript
export type CardOrientation = 'landscape' | 'portrait';
export type CardUnit = 'mm' | 'in' | 'px';

export interface CardDimensions {
  width: number;       // in physical units (default mm)
  height: number;      // in physical units (default mm)
  unit: CardUnit;      // canonical 'mm'
  dpi: number;         // default 300 for print, 96/dynamic for screen
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

export interface BaseElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;          // mm from top-left
  y: number;          // mm from top-left
  width: number;      // mm
  height: number;     // mm
  rotation: number;   // degrees 0-360
  opacity: number;    // 0.0 - 1.0
  locked: boolean;
  visible: boolean;
  zIndex: number;
}

export interface TextElement extends BaseElement {
  type: 'text' | 'dynamic-text';
  content: string;               // e.g. "STUDENT ID CARD" or dynamic "{{student_name}}"
  fieldKey?: string;             // bound field if dynamic, e.g. "student_name"
  fallback?: string;             // fallback if value is null
  fontFamily: string;
  fontSize: number;              // pt or mm
  fontWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;                 // hex or rgba
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  autoFit?: boolean;             // scale font size down to fit box
}

export interface ImageElement extends BaseElement {
  type: 'image' | 'portrait' | 'logo' | 'background';
  src: string;                   // storage URL, public asset URL, or placeholder
  fieldKey?: string;             // bound field if portrait, e.g. "photo_url"
  objectFit: 'contain' | 'cover' | 'fill';
  borderRadius?: number;         // mm or %
  borderColor?: string;
  borderWidth?: number;
  grayscale?: boolean;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'line';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  borderRadius?: number;
}

export interface CodeElement extends BaseElement {
  type: 'qr-code' | 'barcode';
  dataContent: string;           // template or static e.g. "{{verify_url}}" or "{{student_id}}"
  fieldKey?: string;
  barcodeFormat?: 'CODE128' | 'EAN13' | 'QR';
  color: string;
  backgroundColor: string;
}

export type TemplateElement = TextElement | ImageElement | ShapeElement | CodeElement;

export interface CardLayout {
  elements: TemplateElement[];
  backgroundColor: string;
  backgroundImageUrl?: string;
  gridSnapEnabled?: boolean;
}

export interface TemplateDocument {
  schemaVersion: number;         // 1
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
```

## Standard Preset Dimensions
- **CR80 (Standard Credit / ID-1)**: `85.60mm x 53.98mm` (landscape) or `53.98mm x 85.60mm` (portrait) - 3.370" x 2.125"
- **CR79 (Adhesive back)**: `83.90mm x 52.10mm`
- **Oversized / Event Badge**: `102.00mm x 76.00mm` (4" x 3") or `140.00mm x 88.00mm` (5.5" x 3.5")
