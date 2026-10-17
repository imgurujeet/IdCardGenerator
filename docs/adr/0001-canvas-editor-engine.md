# ADR 0001: Canvas Editor Engine & Adapter Pattern

## Status
Accepted

## Context
The platform requires an interactive, high-precision visual editor where users can drag, resize, rotate, align, snap to grid, and layer elements (text, images, shapes, barcodes, QR codes). The editor must remain performant, modular, and upgradeable without entangling the canvas rendering engine directly into UI component trees.

## Decision
1. We use **Fabric.js** (or Konva / direct Canvas adapter) encapsulated behind a clean, decoupled **Editor Adapter Interface** (`ICanvasAdapter`).
2. UI controls communicate solely through standard domain actions (e.g., `addElement`, `updateElementProperties`, `setZoom`, `undo`, `redo`).
3. Elements are maintained in a canonical, serializable Zustand store adhering to `TemplateDocumentSchema`.
4. The canvas engine is treated strictly as an interactive viewport for the underlying state document.

## Consequences
- **Positive**: Canvas engine upgrades or switches do not affect toolbars, property inspectors, or export engines.
- **Positive**: Seamless synchronization between editor state, undo/redo snapshots, and database persistence.
- **Negative**: Requires maintaining an adapter abstraction layer, which takes initial engineering effort.
