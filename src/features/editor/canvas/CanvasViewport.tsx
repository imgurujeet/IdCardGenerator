import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { mmToPx, pxToMm, resolveElementText, getRecordFieldValue, calculateAutoFitFontSizeMm } from '../../../lib/utils';
import { TemplateElement } from '../../../types/template';
import {
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowUp,
  ArrowDown,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Sparkles,
  Type,
  Image as ImageIcon,
  QrCode,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlignCenter,
  Maximize2,
} from 'lucide-react';

export const CanvasViewport: React.FC = () => {
  const {
    document: doc,
    activeSide,
    selectedElementId,
    zoom,
    gridSnap,
    gridSizeMm,
    sampleRecordIndex,
    availableSampleRecords,
    setSelectedElementId,
    updateElement,
    deleteElement,
    duplicateElement,
    reorderElement,
    addElement,
    setZoom,
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; elemX: number; elemY: number; elemW: number; elemH: number } | null>(null);

  // Floating right-click context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    element: TemplateElement | null;
  } | null>(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClose);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-100 text-surface-400">
        No template loaded
      </div>
    );
  }

  const currentLayout = activeSide === 'back' && doc.layouts.back ? doc.layouts.back : doc.layouts.front;
  const currentRecord = availableSampleRecords[sampleRecordIndex] || {};

  // Display DPI on screen
  const screenDpi = 96 * zoom;
  const cardWidthPx = mmToPx(doc.dimensions.width, screenDpi);
  const cardHeightPx = mmToPx(doc.dimensions.height, screenDpi);
  const cornerRadiusPx = doc.dimensions.cornerRadius ? mmToPx(doc.dimensions.cornerRadius, screenDpi) : 0;

  const selectedElem = currentLayout.elements.find((e) => e.id === selectedElementId);

  // Keyboard navigation & fine-tuned precision nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (!selectedElem || selectedElem.locked) {
        if (e.key === 'Escape') setSelectedElementId(null);
        return;
      }

      // Step sizes: Shift = 1.0mm, normal = 0.2mm (or gridSizeMm if snapped)
      const step = e.shiftKey ? 1.0 : (gridSnap ? gridSizeMm : 0.2);

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.altKey || e.ctrlKey) {
          updateElement(selectedElem.id, { width: Math.max(3, Number((selectedElem.width - step).toFixed(2))) });
        } else {
          updateElement(selectedElem.id, { x: Number((selectedElem.x - step).toFixed(2)) });
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.altKey || e.ctrlKey) {
          updateElement(selectedElem.id, { width: Number((selectedElem.width + step).toFixed(2)) });
        } else {
          updateElement(selectedElem.id, { x: Number((selectedElem.x + step).toFixed(2)) });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (e.altKey || e.ctrlKey) {
          updateElement(selectedElem.id, { height: Math.max(3, Number((selectedElem.height - step).toFixed(2))) });
        } else {
          updateElement(selectedElem.id, { y: Number((selectedElem.y - step).toFixed(2)) });
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (e.altKey || e.ctrlKey) {
          updateElement(selectedElem.id, { height: Number((selectedElem.height + step).toFixed(2)) });
        } else {
          updateElement(selectedElem.id, { y: Number((selectedElem.y + step).toFixed(2)) });
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteElement(selectedElem.id);
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElem, gridSnap, gridSizeMm, updateElement, deleteElement, setSelectedElementId]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStart || !selectedElem) return;

      const deltaX_px = e.clientX - dragStart.x;
      const deltaY_px = e.clientY - dragStart.y;

      const deltaX_mm = pxToMm(deltaX_px, screenDpi);
      const deltaY_mm = pxToMm(deltaY_px, screenDpi);

      let newX = dragStart.elemX;
      let newY = dragStart.elemY;
      let newW = dragStart.elemW;
      let newH = dragStart.elemH;

      if (dragHandle === 'move') {
        newX = dragStart.elemX + deltaX_mm;
        newY = dragStart.elemY + deltaY_mm;

        if (gridSnap) {
          newX = Math.round(newX / gridSizeMm) * gridSizeMm;
          newY = Math.round(newY / gridSizeMm) * gridSizeMm;
        }

        updateElement(selectedElem.id, { x: Number(newX.toFixed(2)), y: Number(newY.toFixed(2)) });
      } else if (dragHandle === 'e') {
        // Drag right edge horizontally to widen/narrow chosen area
        newW = Math.max(3, dragStart.elemW + deltaX_mm);
        if (gridSnap) newW = Math.round(newW / gridSizeMm) * gridSizeMm;
        updateElement(selectedElem.id, { width: Number(newW.toFixed(2)) });
      } else if (dragHandle === 'w') {
        // Drag left edge horizontally
        newW = Math.max(3, dragStart.elemW - deltaX_mm);
        newX = dragStart.elemX + deltaX_mm;
        if (gridSnap) {
          newX = Math.round(newX / gridSizeMm) * gridSizeMm;
          newW = Math.round(newW / gridSizeMm) * gridSizeMm;
        }
        updateElement(selectedElem.id, { x: Number(newX.toFixed(2)), width: Number(newW.toFixed(2)) });
      } else if (dragHandle === 's') {
        // Drag bottom edge vertically
        newH = Math.max(3, dragStart.elemH + deltaY_mm);
        if (gridSnap) newH = Math.round(newH / gridSizeMm) * gridSizeMm;
        updateElement(selectedElem.id, { height: Number(newH.toFixed(2)) });
      } else if (dragHandle === 'n') {
        // Drag top edge vertically
        newY = dragStart.elemY + deltaY_mm;
        newH = Math.max(3, dragStart.elemH - deltaY_mm);
        if (gridSnap) {
          newY = Math.round(newY / gridSizeMm) * gridSizeMm;
          newH = Math.round(newH / gridSizeMm) * gridSizeMm;
        }
        updateElement(selectedElem.id, { y: Number(newY.toFixed(2)), height: Number(newH.toFixed(2)) });
      } else if (dragHandle === 'se') {
        newW = Math.max(3, dragStart.elemW + deltaX_mm);
        newH = Math.max(3, dragStart.elemH + deltaY_mm);
        if (gridSnap) {
          newW = Math.round(newW / gridSizeMm) * gridSizeMm;
          newH = Math.round(newH / gridSizeMm) * gridSizeMm;
        }
        updateElement(selectedElem.id, { width: Number(newW.toFixed(2)), height: Number(newH.toFixed(2)) });
      } else if (dragHandle === 'sw') {
        newW = Math.max(3, dragStart.elemW - deltaX_mm);
        newX = dragStart.elemX + deltaX_mm;
        newH = Math.max(3, dragStart.elemH + deltaY_mm);
        if (gridSnap) {
          newX = Math.round(newX / gridSizeMm) * gridSizeMm;
          newW = Math.round(newW / gridSizeMm) * gridSizeMm;
          newH = Math.round(newH / gridSizeMm) * gridSizeMm;
        }
        updateElement(selectedElem.id, {
          x: Number(newX.toFixed(2)),
          width: Number(newW.toFixed(2)),
          height: Number(newH.toFixed(2)),
        });
      } else if (dragHandle === 'ne') {
        newW = Math.max(3, dragStart.elemW + deltaX_mm);
        newY = dragStart.elemY + deltaY_mm;
        newH = Math.max(3, dragStart.elemH - deltaY_mm);
        if (gridSnap) {
          newY = Math.round(newY / gridSizeMm) * gridSizeMm;
          newW = Math.round(newW / gridSizeMm) * gridSizeMm;
          newH = Math.round(newH / gridSizeMm) * gridSizeMm;
        }
        updateElement(selectedElem.id, {
          y: Number(newY.toFixed(2)),
          width: Number(newW.toFixed(2)),
          height: Number(newH.toFixed(2)),
        });
      } else if (dragHandle === 'nw') {
        newX = dragStart.elemX + deltaX_mm;
        newY = dragStart.elemY + deltaY_mm;
        newW = Math.max(3, dragStart.elemW - deltaX_mm);
        newH = Math.max(3, dragStart.elemH - deltaY_mm);
        if (gridSnap) {
          newX = Math.round(newX / gridSizeMm) * gridSizeMm;
          newY = Math.round(newY / gridSizeMm) * gridSizeMm;
          newW = Math.round(newW / gridSizeMm) * gridSizeMm;
          newH = Math.round(newH / gridSizeMm) * gridSizeMm;
        }
        updateElement(selectedElem.id, {
          x: Number(newX.toFixed(2)),
          y: Number(newY.toFixed(2)),
          width: Number(newW.toFixed(2)),
          height: Number(newH.toFixed(2)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragHandle(null);
      setDragStart(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, dragHandle, selectedElem, screenDpi, gridSnap, gridSizeMm, updateElement]);

  const startDrag = (e: React.MouseEvent, handle: string, elem: TemplateElement) => {
    e.stopPropagation();
    // Only respond to left mouse button (e.button === 0)
    if (e.button !== 0) return;

    setSelectedElementId(elem.id);
    setContextMenu(null);
    if (elem.locked) return;

    setIsDragging(true);
    setDragHandle(handle);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elemX: elem.x,
      elemY: elem.y,
      elemW: elem.width,
      elemH: elem.height,
    });
  };

  return (
    <div
      ref={containerRef}
      onClick={() => {
        setSelectedElementId(null);
        setContextMenu(null);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          element: null,
        });
      }}
      className="flex-1 overflow-auto bg-surface-100 flex items-center justify-center p-8 select-none relative"
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* Physical Card Container */}
      <div
        className="relative bg-white shadow-card transition-shadow border border-surface-300"
        style={{
          width: `${cardWidthPx}px`,
          height: `${cardHeightPx}px`,
          borderRadius: `${cornerRadiusPx}px`,
          backgroundColor: currentLayout.backgroundColor || '#ffffff',
          overflow: 'hidden',
        }}
      >
        {/* Render Background Image */}
        {currentLayout.backgroundImageUrl && (
          <img
            src={currentLayout.backgroundImageUrl}
            alt="Card Background"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: currentLayout.backgroundOpacity ?? 1 }}
          />
        )}

        {/* Card Elements */}
        {currentLayout.elements
          .filter((e) => e.visible !== false)
          .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
          .map((elem) => {
            const isSelected = elem.id === selectedElementId;
            const x = mmToPx(elem.x, screenDpi);
            const y = mmToPx(elem.y, screenDpi);
            const w = mmToPx(elem.width, screenDpi);
            const h = mmToPx(elem.height, screenDpi);

            return (
              <div
                key={elem.id}
                onMouseDown={(e) => startDrag(e, 'move', elem)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedElementId(elem.id);
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    element: elem,
                  });
                }}
                className={`absolute cursor-move group transition-[outline] ${
                  isSelected ? 'outline outline-2 outline-brand-600' : 'hover:outline hover:outline-1 hover:outline-brand-400'
                }`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${w}px`,
                  height: `${h}px`,
                  transform: elem.rotation ? `rotate(${elem.rotation}deg)` : undefined,
                  opacity: elem.opacity ?? 1,
                  zIndex: elem.zIndex,
                }}
              >
                {/* Element Content Render */}
                {renderEditorElement(elem, currentRecord, screenDpi)}

                {/* 8 Resize Handles for Selected Element */}
                {isSelected && !elem.locked && (
                  <>
                    {/* Corners */}
                    <div
                      onMouseDown={(e) => startDrag(e, 'nw', elem)}
                      className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-brand-600 border border-white rounded-full cursor-nwse-resize z-50 shadow-sm"
                      title="Resize Top-Left"
                    />
                    <div
                      onMouseDown={(e) => startDrag(e, 'ne', elem)}
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-brand-600 border border-white rounded-full cursor-nesw-resize z-50 shadow-sm"
                      title="Resize Top-Right"
                    />
                    <div
                      onMouseDown={(e) => startDrag(e, 'se', elem)}
                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-brand-600 border border-white rounded-full cursor-nwse-resize z-50 shadow-sm"
                      title="Resize Bottom-Right"
                    />
                    <div
                      onMouseDown={(e) => startDrag(e, 'sw', elem)}
                      className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-brand-600 border border-white rounded-full cursor-nesw-resize z-50 shadow-sm"
                      title="Resize Bottom-Left"
                    />

                    {/* Edge Midpoint Handles (Crucial for adjusting text area width & height independently) */}
                    <div
                      onMouseDown={(e) => startDrag(e, 'e', elem)}
                      className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-brand-600 border border-white rounded-full cursor-ew-resize z-50 shadow-sm hover:scale-125 transition-transform"
                      title="Choose Width / Adjust Right Edge"
                    />
                    <div
                      onMouseDown={(e) => startDrag(e, 'w', elem)}
                      className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-brand-600 border border-white rounded-full cursor-ew-resize z-50 shadow-sm hover:scale-125 transition-transform"
                      title="Choose Width / Adjust Left Edge"
                    />
                    <div
                      onMouseDown={(e) => startDrag(e, 'n', elem)}
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-600 border border-white rounded-full cursor-ns-resize z-50 shadow-sm hover:scale-125 transition-transform"
                      title="Choose Height / Adjust Top Edge"
                    />
                    <div
                      onMouseDown={(e) => startDrag(e, 's', elem)}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-600 border border-white rounded-full cursor-ns-resize z-50 shadow-sm hover:scale-125 transition-transform"
                      title="Choose Height / Adjust Bottom Edge"
                    />

                    {/* Quick Floating Adjustment Micro-Bar */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute -top-9 left-1/2 -translate-x-1/2 bg-surface-900/95 backdrop-blur-xs text-white rounded-lg shadow-xl px-2 py-1 flex items-center gap-1.5 z-[60] border border-surface-700 pointer-events-auto whitespace-nowrap text-[11px]"
                    >
                      {/* Center X */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const centeredX = Math.max(0, Number(((doc.dimensions.width - elem.width) / 2).toFixed(2)));
                          updateElement(elem.id, { x: centeredX });
                        }}
                        title="Center Horizontally on Card"
                        className="px-1.5 py-0.5 rounded hover:bg-surface-800 text-surface-200 hover:text-white flex items-center gap-1 text-[10px] font-medium"
                      >
                        <AlignCenter className="w-3 h-3 text-brand-400" />
                        <span>Center</span>
                      </button>

                      {/* Auto-Fit Toggle for Text */}
                      {(elem.type === 'text' || elem.type === 'dynamic-text') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateElement(elem.id, { autoFit: elem.autoFit === false ? true : false });
                          }}
                          title="Toggle Auto-Fit Text to Box"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                            elem.autoFit !== false
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                              : 'hover:bg-surface-800 text-surface-400'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span>Auto-Fit {elem.autoFit !== false ? 'ON' : 'OFF'}</span>
                        </button>
                      )}

                      {/* Full Width Fit */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const fullW = Number((doc.dimensions.width - 4).toFixed(2));
                          updateElement(elem.id, { x: 2, width: fullW });
                        }}
                        title="Set Full Name Banner Width (50mm centered)"
                        className="px-1.5 py-0.5 rounded hover:bg-surface-800 text-surface-200 hover:text-white flex items-center gap-1 text-[10px] font-medium"
                      >
                        <Maximize2 className="w-3 h-3 text-indigo-400" />
                        <span>Full Width</span>
                      </button>

                      {/* Precision Nudge Buttons */}
                      <div className="flex items-center border-l border-surface-700 pl-1.5 gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateElement(elem.id, { x: Number((elem.x - 0.5).toFixed(2)) });
                          }}
                          title="Nudge Left 0.5mm"
                          className="p-1 rounded hover:bg-surface-800 text-surface-300"
                        >
                          <ArrowLeftIcon className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateElement(elem.id, { x: Number((elem.x + 0.5).toFixed(2)) });
                          }}
                          title="Nudge Right 0.5mm"
                          className="p-1 rounded hover:bg-surface-800 text-surface-300"
                        >
                          <ArrowRightIcon className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateElement(elem.id, { y: Number((elem.y - 0.5).toFixed(2)) });
                          }}
                          title="Nudge Up 0.5mm"
                          className="p-1 rounded hover:bg-surface-800 text-surface-300"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateElement(elem.id, { y: Number((elem.y + 0.5).toFixed(2)) });
                          }}
                          title="Nudge Down 0.5mm"
                          className="p-1 rounded hover:bg-surface-800 text-surface-300"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Coordinates Overlay */}
                      <span className="text-[9px] font-mono text-surface-400 pl-1 border-l border-surface-700">
                        {elem.x},{elem.y} • {elem.width}×{elem.height}mm
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>

      {/* Floating Right-Click Context Menu */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed z-[999] bg-surface-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-surface-700/80 p-1.5 min-w-[220px] text-xs font-medium animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${Math.min(contextMenu.x, window.innerWidth - 240)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 340)}px`,
          }}
        >
          {contextMenu.element ? (
            <div className="space-y-1">
              {/* Header */}
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-surface-400 border-b border-surface-800 flex items-center justify-between">
                <span className="truncate max-w-[130px] text-surface-200">{contextMenu.element.name}</span>
                <span className="text-[9px] uppercase tracking-wider font-mono text-brand-400 px-1.5 py-0.5 bg-brand-950/60 rounded">
                  {contextMenu.element.type}
                </span>
              </div>

              {/* Layer Ordering */}
              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    reorderElement(contextMenu.element!.id, 'top');
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
                >
                  <ArrowUpToLine className="w-3.5 h-3.5 text-brand-400" />
                  <span>Bring to Front</span>
                </button>
                <button
                  onClick={() => {
                    reorderElement(contextMenu.element!.id, 'up');
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-surface-400" />
                  <span>Bring Forward</span>
                </button>
                <button
                  onClick={() => {
                    reorderElement(contextMenu.element!.id, 'down');
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-surface-400" />
                  <span>Send Backward</span>
                </button>
                <button
                  onClick={() => {
                    reorderElement(contextMenu.element!.id, 'bottom');
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 text-surface-400" />
                  <span>Send to Back</span>
                </button>
              </div>

              <div className="border-t border-surface-800 my-1" />

              {/* Alignment */}
              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    const centeredX = Math.max(0, Number(((doc.dimensions.width - contextMenu.element!.width) / 2).toFixed(2)));
                    updateElement(contextMenu.element!.id, { x: centeredX });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
                >
                  <AlignCenter className="w-3.5 h-3.5 text-surface-400" />
                  <span>Center Horizontally</span>
                </button>
                <button
                  onClick={() => {
                    const centeredY = Math.max(0, Number(((doc.dimensions.height - contextMenu.element!.height) / 2).toFixed(2)));
                    updateElement(contextMenu.element!.id, { y: centeredY });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
                >
                  <AlignCenter className="w-3.5 h-3.5 text-surface-400 rotate-90" />
                  <span>Center Vertically</span>
                </button>
              </div>

              <div className="border-t border-surface-800 my-1" />

              {/* Actions */}
              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    duplicateElement(contextMenu.element!.id);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-surface-400" />
                  <span>Duplicate Element</span>
                </button>
                <button
                  onClick={() => {
                    updateElement(contextMenu.element!.id, { locked: !contextMenu.element!.locked });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
                >
                  {contextMenu.element.locked ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Unlock Element</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-surface-400" />
                      <span>Lock Element</span>
                    </>
                  )}
                </button>
              </div>

              <div className="border-t border-surface-800 my-1" />

              {/* Delete */}
              <button
                onClick={() => {
                  deleteElement(contextMenu.element!.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Delete Element</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-surface-400 border-b border-surface-800">
                Quick Insert
              </div>
              <button
                onClick={() => {
                  addElement({
                    type: 'dynamic-text',
                    name: 'Roll No',
                    content: 'Roll No- {{roll_no}}',
                    fieldKey: 'roll_no',
                    fallback: '141',
                    fontSize: 4.8,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    width: 32,
                    height: 5.5,
                  });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                <span>Insert Roll Number</span>
              </button>
              <button
                onClick={() => {
                  addElement({
                    type: 'dynamic-text',
                    name: 'Student Name',
                    content: '{{student_name}}',
                    fieldKey: 'student_name',
                    fallback: 'ABHISHEK KUMAR',
                    fontSize: 6.8,
                    fontWeight: 'bold',
                    color: '#dc2626',
                    width: 48,
                    height: 6,
                  });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Insert Student Name</span>
              </button>
              <button
                onClick={() => {
                  addElement({
                    type: 'text',
                    name: 'Static Label',
                    content: 'Label Text',
                    fontSize: 4,
                    width: 30,
                    height: 5,
                  });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
              >
                <Type className="w-3.5 h-3.5 text-surface-400" />
                <span>Insert Static Text</span>
              </button>
              <button
                onClick={() => {
                  addElement({
                    type: 'portrait',
                    name: 'Candidate Photo',
                    fieldKey: 'photo_url',
                    width: 26,
                    height: 32,
                    borderRadius: 2,
                  });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Insert Student Photo</span>
              </button>
              <button
                onClick={() => {
                  addElement({
                    type: 'qr-code',
                    name: 'Verification QR',
                    dataContent: '{{student_id}}',
                    fieldKey: 'student_id',
                    width: 18,
                    height: 18,
                    color: '#000000',
                    backgroundColor: '#ffffff',
                  });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-800 text-surface-200 transition-colors text-left"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Insert QR Code</span>
              </button>

              <div className="border-t border-surface-800 my-1" />

              <div className="flex items-center gap-1 px-1">
                <button
                  onClick={() => {
                    setZoom(Math.min(zoom + 0.25, 4));
                    setContextMenu(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded hover:bg-surface-800 text-surface-300 text-[11px]"
                >
                  <ZoomIn className="w-3 h-3" /> Zoom In
                </button>
                <button
                  onClick={() => {
                    setZoom(Math.max(zoom - 0.25, 0.5));
                    setContextMenu(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded hover:bg-surface-800 text-surface-300 text-[11px]"
                >
                  <ZoomOut className="w-3 h-3" /> Zoom Out
                </button>
                <button
                  onClick={() => {
                    setZoom(1.5);
                    setContextMenu(null);
                  }}
                  className="p-1 rounded hover:bg-surface-800 text-surface-400"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function renderEditorElement(elem: TemplateElement, record: Record<string, any>, dpi: number) {
  switch (elem.type) {
    case 'shape':
      if (elem.shapeType === 'rectangle') {
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: elem.fillColor || 'transparent',
              borderColor: elem.strokeColor || 'transparent',
              borderWidth: elem.strokeWidth ? `${mmToPx(elem.strokeWidth, dpi)}px` : 0,
              borderStyle: elem.strokeWidth ? 'solid' : 'none',
              borderRadius: elem.borderRadius ? `${mmToPx(elem.borderRadius, dpi)}px` : 0,
            }}
          />
        );
      }
      if (elem.shapeType === 'circle') {
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: elem.fillColor || 'transparent',
              borderColor: elem.strokeColor || 'transparent',
              borderWidth: elem.strokeWidth ? `${mmToPx(elem.strokeWidth, dpi)}px` : 0,
              borderStyle: elem.strokeWidth ? 'solid' : 'none',
            }}
          />
        );
      }
      return null;

    case 'text':
    case 'dynamic-text': {
      let rawText = resolveElementText(elem, record);

      if (elem.textTransform === 'uppercase') rawText = rawText.toUpperCase();
      if (elem.textTransform === 'lowercase') rawText = rawText.toLowerCase();

      // Automatically auto-fit font size based on bounding box width & height
      let effectiveFontSizeMm = elem.fontSize;
      if (elem.autoFit !== false && (elem.autoFit || elem.type === 'dynamic-text' || elem.fieldKey)) {
        effectiveFontSizeMm = calculateAutoFitFontSizeMm(
          rawText,
          elem.width,
          elem.height,
          elem.fontSize,
          elem.fontFamily || 'Inter',
          elem.fontWeight || 'bold',
          elem.minFontSize || 2.0
        );
      }

      const fontSizePx = mmToPx(effectiveFontSizeMm, dpi);

      const textShadowStyle = elem.textShadow
        ? `${mmToPx(elem.textShadow.offsetX, dpi)}px ${mmToPx(elem.textShadow.offsetY, dpi)}px ${mmToPx(elem.textShadow.blur, dpi)}px ${elem.textShadow.color}`
        : undefined;

      const strokeStyle = elem.textStrokeColor && elem.textStrokeWidth
        ? `${mmToPx(elem.textStrokeWidth, dpi)}px ${elem.textStrokeColor}`
        : undefined;

      const vAlignClass = elem.verticalAlign === 'top' ? 'justify-start' : elem.verticalAlign === 'bottom' ? 'justify-end' : 'justify-center';

      return (
        <div
          className={`w-full h-full flex flex-col ${vAlignClass} leading-tight overflow-hidden break-words pointer-events-none`}
          style={{
            color: elem.color || '#000000',
            fontFamily: `"${elem.fontFamily || 'Inter'}", sans-serif`,
            fontSize: `${fontSizePx}px`,
            fontWeight: elem.fontWeight === 'bold' ? 700 : elem.fontWeight === 'semibold' ? 600 : elem.fontWeight === 'medium' ? 500 : 400,
            fontStyle: elem.fontStyle || 'normal',
            textAlign: elem.textAlign || 'left',
            textDecoration: elem.underline ? 'underline' : undefined,
            textShadow: textShadowStyle,
            WebkitTextStroke: strokeStyle,
          }}
        >
          {rawText.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      );
    }

    case 'portrait':
    case 'image':
    case 'logo': {
      let src = elem.src;
      if (elem.type === 'portrait' || (elem.name && elem.name.toLowerCase().includes('photo'))) {
        src = getRecordFieldValue(record, elem.fieldKey || 'photo_url') || elem.src;
      } else if (elem.fieldKey) {
        src = getRecordFieldValue(record, elem.fieldKey) || elem.src;
      }

      const radiusPx = elem.borderRadius ? mmToPx(elem.borderRadius, dpi) : 0;

      if (!src) {
        return (
          <div
            className="w-full h-full bg-surface-200 border border-surface-300 flex items-center justify-center text-[10px] text-surface-500 font-medium overflow-hidden"
            style={{ borderRadius: `${radiusPx}px` }}
          >
            {elem.name}
          </div>
        );
      }

      const effectiveBorderWidth = elem.borderWidth ?? (elem as any).strokeWidth;
      const effectiveBorderColor = elem.borderColor ?? (elem as any).strokeColor ?? '#000000';

      return (
        <img
          src={src}
          alt={elem.name}
          className="w-full h-full pointer-events-none"
          style={{
            objectFit: elem.objectFit || 'cover',
            borderRadius: `${radiusPx}px`,
            border: effectiveBorderWidth ? `${mmToPx(effectiveBorderWidth, dpi)}px solid ${effectiveBorderColor}` : undefined,
            boxShadow: elem.shadowColor && elem.shadowBlur ? `0px 2px ${mmToPx(elem.shadowBlur, dpi)}px ${elem.shadowColor}` : undefined,
          }}
        />
      );
    }

    case 'qr-code':
      return (
        <div
          className="w-full h-full border border-surface-300 flex flex-col items-center justify-center p-1 bg-white pointer-events-none shadow-sm"
          style={{ backgroundColor: elem.backgroundColor || '#ffffff' }}
        >
          <div className="w-full h-full border border-dashed border-surface-400 flex items-center justify-center text-[9px] font-mono text-surface-700">
            [QR CODE]
          </div>
        </div>
      );

    case 'barcode': {
      let codeVal = elem.dataContent || 'CODE128';
      if (elem.fieldKey && record[elem.fieldKey]) {
        codeVal = String(record[elem.fieldKey]);
      }
      return (
        <div
          className="w-full h-full bg-white flex flex-col items-center justify-between p-1 border border-surface-200 pointer-events-none"
          style={{ backgroundColor: elem.backgroundColor || '#ffffff' }}
        >
          <div className="w-full flex-1 flex items-center justify-between px-1">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className="h-full bg-black"
                style={{ width: i % 3 === 0 ? '3px' : '1.5px' }}
              />
            ))}
          </div>
          <span className="text-[8px] font-mono tracking-wider text-surface-900">{codeVal}</span>
        </div>
      );
    }

    default:
      return null;
  }
}
