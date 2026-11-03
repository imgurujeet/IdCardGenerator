import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import {
  mmToPx,
  pxToMm,
  resolveElementText,
  getRecordFieldValue,
  calculateAutoFitFontSizeMm,
  wrapTextToLines,
  createTextMeasureFn,
} from '../../../lib/utils';
import { TemplateElement } from '../../../types/template';
import {
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlignCenter,
  Maximize2,
  Plus,
  RotateCw,
  FlipHorizontal,
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
    addTextBoxBelow,
    setZoom,
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    elemX: number;
    elemY: number;
    elemW: number;
    elemH: number;
    centerScreenX?: number;
    centerScreenY?: number;
  } | null>(null);

  // Photoshop-style Ctrl/Alt + Mouse Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Zoom if Ctrl, Meta (Cmd on Mac), or Alt key is held down
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        e.stopPropagation();

        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        const currentZoom = useEditorStore.getState().zoom;
        const newZoom = Math.max(0.5, Math.min(3.5, Number((currentZoom + delta).toFixed(2))));
        setZoom(newZoom);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [setZoom]);

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

      if (dragHandle === 'rotate') {
        const cx = dragStart.centerScreenX ?? dragStart.x;
        const cy = dragStart.centerScreenY ?? dragStart.y;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        if (deg < 0) deg += 360;
        if (deg >= 360) deg -= 360;

        // Holding Shift snaps to 15-degree increments (like Photoshop)
        if (e.shiftKey) {
          deg = Math.round(deg / 15) * 15;
        } else {
          deg = Math.round(deg);
        }

        updateElement(selectedElem.id, { rotation: deg });
        return;
      }

      if (dragHandle === 'move') {
        newX = dragStart.elemX + deltaX_mm;
        newY = dragStart.elemY + deltaY_mm;

        if (gridSnap) {
          newX = Math.round(newX / gridSizeMm) * gridSizeMm;
          newY = Math.round(newY / gridSizeMm) * gridSizeMm;
        }

        updateElement(selectedElem.id, { x: Number(newX.toFixed(2)), y: Number(newY.toFixed(2)) });
      } else if (dragHandle === 'e') {
        // Drag right edge horizontally (Alt = stretch from center)
        if (e.altKey) {
          newW = Math.max(3, dragStart.elemW + deltaX_mm * 2);
          newX = dragStart.elemX - deltaX_mm;
          if (gridSnap) {
            newW = Math.round(newW / gridSizeMm) * gridSizeMm;
            newX = Math.round(newX / gridSizeMm) * gridSizeMm;
          }
          updateElement(selectedElem.id, { x: Number(newX.toFixed(2)), width: Number(newW.toFixed(2)) });
        } else {
          newW = Math.max(3, dragStart.elemW + deltaX_mm);
          if (gridSnap) newW = Math.round(newW / gridSizeMm) * gridSizeMm;
          updateElement(selectedElem.id, { width: Number(newW.toFixed(2)) });
        }
      } else if (dragHandle === 'w') {
        // Drag left edge horizontally (Alt = stretch from center)
        if (e.altKey) {
          newW = Math.max(3, dragStart.elemW - deltaX_mm * 2);
          newX = dragStart.elemX + deltaX_mm;
          if (gridSnap) {
            newX = Math.round(newX / gridSizeMm) * gridSizeMm;
            newW = Math.round(newW / gridSizeMm) * gridSizeMm;
          }
          updateElement(selectedElem.id, { x: Number(newX.toFixed(2)), width: Number(newW.toFixed(2)) });
        } else {
          newW = Math.max(3, dragStart.elemW - deltaX_mm);
          newX = dragStart.elemX + deltaX_mm;
          if (gridSnap) {
            newX = Math.round(newX / gridSizeMm) * gridSizeMm;
            newW = Math.round(newW / gridSizeMm) * gridSizeMm;
          }
          updateElement(selectedElem.id, { x: Number(newX.toFixed(2)), width: Number(newW.toFixed(2)) });
        }
      } else if (dragHandle === 's') {
        // Drag bottom edge vertically (Alt = stretch from center)
        if (e.altKey) {
          newH = Math.max(3, dragStart.elemH + deltaY_mm * 2);
          newY = dragStart.elemY - deltaY_mm;
          if (gridSnap) {
            newH = Math.round(newH / gridSizeMm) * gridSizeMm;
            newY = Math.round(newY / gridSizeMm) * gridSizeMm;
          }
          updateElement(selectedElem.id, { y: Number(newY.toFixed(2)), height: Number(newH.toFixed(2)) });
        } else {
          newH = Math.max(3, dragStart.elemH + deltaY_mm);
          if (gridSnap) newH = Math.round(newH / gridSizeMm) * gridSizeMm;
          updateElement(selectedElem.id, { height: Number(newH.toFixed(2)) });
        }
      } else if (dragHandle === 'n') {
        // Drag top edge vertically (Alt = stretch from center)
        if (e.altKey) {
          newH = Math.max(3, dragStart.elemH - deltaY_mm * 2);
          newY = dragStart.elemY + deltaY_mm;
          if (gridSnap) {
            newH = Math.round(newH / gridSizeMm) * gridSizeMm;
            newY = Math.round(newY / gridSizeMm) * gridSizeMm;
          }
          updateElement(selectedElem.id, { y: Number(newY.toFixed(2)), height: Number(newH.toFixed(2)) });
        } else {
          newY = dragStart.elemY + deltaY_mm;
          newH = Math.max(3, dragStart.elemH - deltaY_mm);
          if (gridSnap) {
            newY = Math.round(newY / gridSizeMm) * gridSizeMm;
            newH = Math.round(newH / gridSizeMm) * gridSizeMm;
          }
          updateElement(selectedElem.id, { y: Number(newY.toFixed(2)), height: Number(newH.toFixed(2)) });
        }
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
    if (elem.locked) return;

    let centerScreenX = e.clientX;
    let centerScreenY = e.clientY;
    if (cardRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect();
      centerScreenX = cardRect.left + mmToPx(elem.x + elem.width / 2, screenDpi);
      centerScreenY = cardRect.top + mmToPx(elem.y + elem.height / 2, screenDpi);
    }

    setIsDragging(true);
    setDragHandle(handle);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elemX: elem.x,
      elemY: elem.y,
      elemW: elem.width,
      elemH: elem.height,
      centerScreenX,
      centerScreenY,
    });
  };

  return (
    <div
      ref={containerRef}
      onClick={() => setSelectedElementId(null)}
      onContextMenu={(e) => {
        // Disable intrusive right click context menu per user request
        e.preventDefault();
      }}
      className="flex-1 overflow-auto bg-surface-100 flex items-center justify-center p-8 select-none relative"
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* Physical Card Container */}
      <div
        ref={cardRef}
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

            const containerTransforms: string[] = [];
            if (elem.rotation) containerTransforms.push(`rotate(${elem.rotation}deg)`);
            if (elem.flipX || elem.flipY) {
              containerTransforms.push(`scale(${elem.flipX ? -1 : 1}, ${elem.flipY ? -1 : 1})`);
            }

            return (
              <div
                key={elem.id}
                onMouseDown={(e) => startDrag(e, 'move', elem)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedElementId(elem.id);
                }}
                className={`absolute cursor-move group transition-[outline] ${isSelected ? 'outline outline-2 outline-brand-600' : 'hover:outline hover:outline-1 hover:outline-brand-400'
                  }`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${w}px`,
                  height: `${h}px`,
                  transform: containerTransforms.length > 0 ? containerTransforms.join(' ') : undefined,
                  opacity: elem.opacity ?? 1,
                  zIndex: elem.zIndex,
                }}
              >
                {/* Element Content Render */}
                {renderEditorElement(elem, currentRecord, screenDpi)}

                {/* 8 Resize Handles & Photoshop Rotation Knob for Selected Element */}
                {isSelected && !elem.locked && (
                  <>
                    {/* Photoshop-Style Rotation Handle with Stalk Line */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-brand-500 pointer-events-none" />
                    <div
                      onMouseDown={(e) => startDrag(e, 'rotate', elem)}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-brand-600 rounded-full cursor-grab active:cursor-grabbing z-50 shadow-md hover:scale-125 transition-transform flex items-center justify-center group"
                      title={`Rotate (${elem.rotation || 0}°) — Drag to rotate, Shift to snap 15°`}
                    >
                      <RotateCw className="w-2.5 h-2.5 text-brand-600 pointer-events-none" />
                      {isDragging && dragHandle === 'rotate' && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface-900 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                          {elem.rotation || 0}°
                        </div>
                      )}
                    </div>

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

                    {/* Edge Midpoint Handles (Alt = Stretch symmetrically) */}
                    <div
                      onMouseDown={(e) => startDrag(e, 'e', elem)}
                      className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-brand-600 border border-white rounded-full cursor-ew-resize z-50 shadow-sm hover:scale-125 transition-transform"
                      title="Adjust Width (Hold Alt for symmetric stretch)"
                    />
                    <div
                      onMouseDown={(e) => startDrag(e, 'w', elem)}
                      className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-brand-600 border border-white rounded-full cursor-ew-resize z-50 shadow-sm hover:scale-125 transition-transform"
                      title="Adjust Width (Hold Alt for symmetric stretch)"
                    />
                    <div
                      onMouseDown={(e) => startDrag(e, 'n', elem)}
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-600 border border-white rounded-full cursor-ns-resize z-50 shadow-sm hover:scale-125 transition-transform"
                      title="Adjust Height (Hold Alt for symmetric stretch)"
                    />
                    <div
                      onMouseDown={(e) => startDrag(e, 's', elem)}
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-600 border border-white rounded-full cursor-ns-resize z-50 shadow-sm hover:scale-125 transition-transform"
                      title="Adjust Height (Hold Alt for symmetric stretch)"
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

                      {/* Rotate 90° button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextRot = ((elem.rotation || 0) + 90) % 360;
                          updateElement(elem.id, { rotation: nextRot });
                        }}
                        title="Rotate 90° Clockwise"
                        className="px-1.5 py-0.5 rounded hover:bg-surface-800 text-surface-200 hover:text-white flex items-center gap-1 text-[10px] font-medium"
                      >
                        <RotateCw className="w-3 h-3 text-amber-400" />
                        <span>90°</span>
                      </button>

                      {/* Flip Horizontal */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateElement(elem.id, { flipX: !elem.flipX });
                        }}
                        title="Flip Layer Horizontally"
                        className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] font-medium transition-colors ${elem.flipX
                            ? 'bg-brand-600 text-white font-bold'
                            : 'hover:bg-surface-800 text-surface-200 hover:text-white'
                          }`}
                      >
                        <FlipHorizontal className="w-3 h-3" />
                        <span>Flip</span>
                      </button>

                      {/* Auto-Fit & Stretch Controls for Text */}
                      {(elem.type === 'text' || elem.type === 'dynamic-text') && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateElement(elem.id, { autoFit: elem.autoFit === false ? true : false });
                            }}
                            title="Toggle Auto-Fit Text to Box"
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${elem.autoFit !== false
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                                : 'hover:bg-surface-800 text-surface-400'
                              }`}
                          >
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            <span>Auto-Fit {elem.autoFit !== false ? 'ON' : 'OFF'}</span>
                          </button>

                          {/* Horizontal Stretch Quick Buttons */}
                          <div className="flex items-center border-l border-surface-700 pl-1.5 gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const current = elem.scaleX ?? 100;
                                updateElement(elem.id, { scaleX: Math.max(50, current - 10) });
                              }}
                              title="Condense Text Width (-10%)"
                              className="px-1 py-0.5 rounded hover:bg-surface-800 text-purple-300 hover:text-white font-mono text-[10px] font-bold"
                            >
                              T↔ -
                            </button>
                            <span className="text-[9px] font-mono text-purple-300 font-bold px-0.5">
                              {elem.scaleX ?? 100}%
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const current = elem.scaleX ?? 100;
                                updateElement(elem.id, { scaleX: Math.min(250, current + 10) });
                              }}
                              title="Stretch Text Width (+10%)"
                              className="px-1 py-0.5 rounded hover:bg-surface-800 text-purple-300 hover:text-white font-mono text-[10px] font-bold"
                            >
                              T↔ +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addTextBoxBelow(elem.id);
                            }}
                            title="Add a new blank text box directly below this text"
                            className="px-1.5 py-0.5 rounded bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1 text-[10px] font-semibold shadow-xs transition-colors"
                          >
                            <Plus className="w-3 h-3 text-white" />
                            <span>+ Text Below</span>
                          </button>
                        </>
                      )}

                      {/* Full Width Fit */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const fullW = Number((doc.dimensions.width - 4).toFixed(2));
                          updateElement(elem.id, { x: 2, width: fullW });
                        }}
                        title="Set Full Name Banner Width (centered)"
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

      const scaleX = (elem.scaleX ?? 100) / 100;
      const scaleY = (elem.scaleY ?? 100) / 100;
      const skewX = elem.skewX ?? 0;
      const skewY = elem.skewY ?? 0;

      // Automatically auto-fit font size based on bounding box width & height (factoring in horizontal stretch)
      let effectiveFontSizeMm = elem.fontSize;
      if (elem.autoFit !== false && (elem.autoFit || elem.type === 'dynamic-text' || elem.fieldKey)) {
        const effectiveFitWidthMm = scaleX > 0 ? elem.width / scaleX : elem.width;
        effectiveFontSizeMm = calculateAutoFitFontSizeMm(
          rawText,
          effectiveFitWidthMm,
          elem.height,
          elem.fontSize,
          elem.fontFamily || 'Inter',
          elem.fontWeight || 'bold',
          elem.minFontSize || 2.0
        );
      }

      const fontSizePx = mmToPx(effectiveFontSizeMm, dpi);
      const lineHeightValue = elem.lineHeight || 1.25;

      const textShadowStyle = elem.textShadow
        ? `${mmToPx(elem.textShadow.offsetX, dpi)}px ${mmToPx(elem.textShadow.offsetY, dpi)}px ${mmToPx(elem.textShadow.blur, dpi)}px ${elem.textShadow.color}`
        : undefined;

      const vAlignClass = elem.verticalAlign === 'top' ? 'justify-start' : elem.verticalAlign === 'bottom' ? 'justify-end' : 'justify-center';

      const weightMap: Record<string, number> = {
        thin: 100,
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
        black: 900,
      };
      const numericWeight = weightMap[String(elem.fontWeight)] || (typeof elem.fontWeight === 'number' ? elem.fontWeight : 400);

      const boxWidthPx = mmToPx(elem.width, dpi);
      // Use original configured font size (not auto-fitted) to determine single-line intent.
      // This must match what calculateAutoFitFontSizeMm uses internally (baseFontSizeMm * 1.4).
      const isSingleLine = elem.height < (elem.fontSize * 1.4) || elem.maxLines === 1;
      const fontSpec = `${elem.fontStyle || 'normal'} ${elem.smallCaps ? 'small-caps ' : ''}${numericWeight} ${fontSizePx}px "${elem.fontFamily || 'Inter'}", sans-serif`;
      const measureFn = createTextMeasureFn(fontSpec);
      const wrappedLines = isSingleLine ? [rawText] : wrapTextToLines(rawText, boxWidthPx, measureFn);

      const fauxBoldWidth = elem.fauxBold ? Math.max(0.12, elem.fontSize * 0.035) : 0;
      const effectiveStrokeWidth = (elem.textStrokeWidth || 0) + fauxBoldWidth;
      const effectiveStrokeColor = elem.textStrokeColor || (elem.fauxBold ? (elem.color && elem.color !== 'transparent' ? elem.color : '#000000') : undefined);
      const strokeStyle = effectiveStrokeColor && effectiveStrokeWidth > 0
        ? `${mmToPx(effectiveStrokeWidth, dpi)}px ${effectiveStrokeColor}`
        : undefined;

      const textDecorations: string[] = [];
      if (elem.underline) textDecorations.push('underline');
      if (elem.strikethrough) textDecorations.push('line-through');
      const textDecoration = textDecorations.length > 0 ? textDecorations.join(' ') : undefined;

      const transforms: string[] = [];
      if (scaleX !== 1 || scaleY !== 1) {
        transforms.push(`scale(${scaleX}, ${scaleY})`);
      }
      if (skewX !== 0) {
        transforms.push(`skewX(${skewX}deg)`);
      }
      if (skewY !== 0) {
        transforms.push(`skewY(${skewY}deg)`);
      }
      if (elem.baselineShift) {
        transforms.push(`translateY(-${mmToPx(elem.baselineShift, dpi)}px)`);
      }
      const textTransformMatrix = transforms.length > 0 ? transforms.join(' ') : undefined;

      const originX = elem.textAlign === 'center' ? 'center' : elem.textAlign === 'right' ? 'right' : 'left';
      const originY = elem.verticalAlign === 'top' ? 'top' : elem.verticalAlign === 'bottom' ? 'bottom' : 'center';

      const isTransparentFill = elem.color === 'transparent';

      return (
        <div
          className={`w-full h-full flex flex-col ${vAlignClass} overflow-hidden pointer-events-none select-none`}
          style={{
            color: isTransparentFill ? 'transparent' : elem.color || '#000000',
            WebkitTextFillColor: isTransparentFill ? 'transparent' : undefined,
            fontFamily: `"${elem.fontFamily || 'Inter'}", sans-serif`,
            fontSize: `${fontSizePx}px`,
            lineHeight: lineHeightValue,
            letterSpacing: elem.letterSpacing ? `${elem.letterSpacing}px` : undefined,
            fontWeight: numericWeight,
            fontStyle: elem.fontStyle || 'normal',
            fontVariant: elem.smallCaps ? 'small-caps' : undefined,
            textAlign: elem.textAlign || 'left',
            textDecoration: textDecoration,
            textShadow: textShadowStyle,
            WebkitTextStroke: strokeStyle,
            transform: textTransformMatrix,
            transformOrigin: textTransformMatrix ? `${originX} ${originY}` : undefined,
          }}
        >
          {wrappedLines.map((line, i) => (
            <div key={i} style={{ width: '100%', wordBreak: 'break-word' }}>{line || '\u00A0'}</div>
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
