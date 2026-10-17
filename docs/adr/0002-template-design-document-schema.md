# ADR 0002: Canonical Physical Template Design Document Schema

## Status
Accepted

## Context
Printed ID cards have precise real-world physical requirements (e.g. CR80 standard credit-card format: 85.60mm x 53.98mm). Storing designs in arbitrary screen pixels leads to distortion across screens, print scales, and export formats.

## Decision
1. Design documents store canonical measurements in **millimeters (`mm`)**.
2. Conversion to rendering pixels is handled dynamically by the rendering layer based on target context:
   - Screen editor: `mm * (screenDpi / 25.4) * zoomLevel`
   - High-resolution print export: `mm * (300 / 25.4)` (300 DPI)
   - PDF generation: `mm * (72 / 25.4)` (72 PostScript points per inch for vector coordinates)
3. Schema is strictly typed and validated using Zod (`TemplateDocumentSchema`).
4. Both Front and Back card layouts are stored as first-class layouts within the single document.

## Consequences
- **Positive**: 100% fidelity between on-screen preview and printed cards.
- **Positive**: Direct compatibility with professional printing presses and standard PVC card printers.
