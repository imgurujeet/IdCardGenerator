import React from 'react';
import {
  Sliders,
  Trash2,
  Copy,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Sparkles,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

const STANDARD_FIELDS = [
  { key: 'student_name', label: 'Candidate / Student Name' },
  { key: 'roll_no', label: 'Roll Number' },
  { key: 'session', label: 'Academic Session (e.g. 2024-26)' },
  { key: 'father_name', label: "Father's Name (F. Name)" },
  { key: 'dob', label: 'Date of Birth (D.O.B)' },
  { key: 'blood_group', label: 'Blood Group' },
  { key: 'address', label: 'Village / Town Address' },
  { key: 'police_station', label: 'Police Station (PS)' },
  { key: 'district', label: 'District & Pincode' },
  { key: 'mobile', label: 'Mobile / Phone Number' },
  { key: 'photo_url', label: 'Candidate Portrait Photo' },
  { key: 'student_id', label: 'Registration / ID Number' },
  { key: 'grade', label: 'Class / Course' },
  { key: 'section', label: 'Section' },
  { key: 'emergency_contact', label: 'Emergency Contact' },
];

export const PropertiesSidebar: React.FC = () => {
  const {
    document: doc,
    activeSide,
    selectedElementId,
    customFonts,
    updateElement,
    deleteElement,
    duplicateElement,
  } = useEditorStore();

  if (!doc) return null;

  const currentLayout = activeSide === 'back' && doc.layouts.back ? doc.layouts.back : doc.layouts.front;
  const selectedElem = currentLayout.elements.find((e) => e.id === selectedElementId);

  if (!selectedElem) {
    return (
      <aside className="w-80 bg-white border-l border-surface-200 flex flex-col shrink-0 select-none p-6 text-center justify-center items-center text-surface-400">
        <Sliders className="w-8 h-8 mb-2 text-surface-300 stroke-[1.5]" />
        <p className="text-xs font-medium text-surface-600 mb-1">No Element Selected</p>
        <p className="text-[11px] text-surface-400 max-w-[200px]">
          Click any element on the card canvas or in the layers list to adjust its properties, shadow, and fonts.
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-white border-l border-surface-200 flex flex-col shrink-0 select-none overflow-y-auto z-10">
      {/* Header */}
      <div className="h-12 border-b border-surface-200 px-4 flex items-center justify-between shrink-0 bg-surface-50">
        <div className="flex items-center gap-2 truncate">
          <span className="text-xs font-semibold text-surface-900 truncate">{selectedElem.name}</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-200 text-surface-600">
            {selectedElem.type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateElement(selectedElem.id, { locked: !selectedElem.locked })}
            title={selectedElem.locked ? 'Unlock Element' : 'Lock Element'}
            className="p-1.5 rounded hover:bg-surface-200 text-surface-600"
          >
            {selectedElem.locked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => duplicateElement(selectedElem.id)}
            title="Duplicate"
            className="p-1.5 rounded hover:bg-surface-200 text-surface-600"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteElement(selectedElem.id)}
            title="Delete"
            className="p-1.5 rounded hover:bg-red-50 text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5 text-xs">
        {/* Dynamic Data Binding */}
        {(selectedElem.type === 'dynamic-text' || selectedElem.type === 'portrait' || selectedElem.type === 'qr-code' || selectedElem.type === 'barcode') && (
          <div className="p-3 bg-brand-50/50 rounded-lg border border-brand-200">
            <span className="font-semibold text-brand-900 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Dynamic Field Binding
            </span>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-surface-600 block mb-1">Target Record Field</label>
                <select
                  value={selectedElem.fieldKey || ''}
                  onChange={(e) => updateElement(selectedElem.id, { fieldKey: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-surface-300 rounded text-xs text-surface-900 focus:border-brand-500 outline-none"
                >
                  <option value="">-- No Binding (Static) --</option>
                  {STANDARD_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label} ({`{{${f.key}}}`})
                    </option>
                  ))}
                </select>
              </div>

              {selectedElem.type === 'dynamic-text' && (
                <div>
                  <label className="text-[11px] text-surface-600 block mb-1">Fallback if Missing</label>
                  <input
                    type="text"
                    value={selectedElem.fallback || ''}
                    onChange={(e) => updateElement(selectedElem.id, { fallback: e.target.value })}
                    placeholder="e.g. N/A"
                    className="w-full px-2 py-1.5 bg-white border border-surface-300 rounded text-xs text-surface-900 focus:border-brand-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Position & Dimensions */}
        <div>
          <span className="font-semibold text-surface-900 block mb-2 uppercase tracking-wider text-[11px]">
            Position & Dimensions (mm)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-surface-500 block mb-0.5">X Position</label>
              <div className="flex items-center border border-surface-300 rounded px-2 py-1 bg-surface-50">
                <input
                  type="number"
                  step="0.5"
                  value={selectedElem.x}
                  onChange={(e) => updateElement(selectedElem.id, { x: Number(e.target.value) })}
                  className="w-full bg-transparent outline-none font-mono text-xs"
                />
                <span className="text-[10px] text-surface-400">mm</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-surface-500 block mb-0.5">Y Position</label>
              <div className="flex items-center border border-surface-300 rounded px-2 py-1 bg-surface-50">
                <input
                  type="number"
                  step="0.5"
                  value={selectedElem.y}
                  onChange={(e) => updateElement(selectedElem.id, { y: Number(e.target.value) })}
                  className="w-full bg-transparent outline-none font-mono text-xs"
                />
                <span className="text-[10px] text-surface-400">mm</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-surface-500 block mb-0.5">Width</label>
              <div className="flex items-center border border-surface-300 rounded px-2 py-1 bg-surface-50">
                <input
                  type="number"
                  step="0.5"
                  value={selectedElem.width}
                  onChange={(e) => updateElement(selectedElem.id, { width: Number(e.target.value) })}
                  className="w-full bg-transparent outline-none font-mono text-xs"
                />
                <span className="text-[10px] text-surface-400">mm</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-surface-500 block mb-0.5">Height</label>
              <div className="flex items-center border border-surface-300 rounded px-2 py-1 bg-surface-50">
                <input
                  type="number"
                  step="0.5"
                  value={selectedElem.height}
                  onChange={(e) => updateElement(selectedElem.id, { height: Number(e.target.value) })}
                  className="w-full bg-transparent outline-none font-mono text-xs"
                />
                <span className="text-[10px] text-surface-400">mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Text Typography & Photoshop Styling */}
        {(selectedElem.type === 'text' || selectedElem.type === 'dynamic-text') && (
          <div className="space-y-3 pt-2 border-t border-surface-200">
            <span className="font-semibold text-surface-900 block uppercase tracking-wider text-[11px]">
              Typography & Photoshop Styling
            </span>

            <div>
              <label className="text-[10px] text-surface-500 block mb-1">Text Template Content</label>
              <textarea
                rows={2}
                value={selectedElem.content || ''}
                onChange={(e) => updateElement(selectedElem.id, { content: e.target.value })}
                className="w-full p-2 border border-surface-300 rounded text-xs font-mono bg-white outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-surface-500 block mb-1">Font Family</label>
                <select
                  value={selectedElem.fontFamily || 'Inter'}
                  onChange={(e) => updateElement(selectedElem.id, { fontFamily: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-surface-300 rounded text-xs outline-none focus:border-brand-500 font-medium"
                >
                  {customFonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-surface-500 block mb-1">Font Size</label>
                <div className="flex items-center border border-surface-300 rounded px-2 py-1 bg-surface-50">
                  <input
                    type="number"
                    step="0.2"
                    value={selectedElem.fontSize || 4}
                    onChange={(e) => updateElement(selectedElem.id, { fontSize: Number(e.target.value) })}
                    className="w-full bg-transparent outline-none font-mono text-xs"
                  />
                  <span className="text-[10px] text-surface-400">mm</span>
                </div>
              </div>
            </div>

            {/* Formatting Row: Bold, Italic, Underline, Alignment, Color */}
            <div className="flex items-center justify-between">
              <div className="flex items-center border border-surface-300 rounded p-0.5 bg-surface-50">
                <button
                  onClick={() =>
                    updateElement(selectedElem.id, {
                      fontWeight: selectedElem.fontWeight === 'bold' ? 'normal' : 'bold',
                    })
                  }
                  title="Bold"
                  className={`p-1.5 rounded ${selectedElem.fontWeight === 'bold' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-600'}`}
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    updateElement(selectedElem.id, {
                      fontStyle: selectedElem.fontStyle === 'italic' ? 'normal' : 'italic',
                    })
                  }
                  title="Italic"
                  className={`p-1.5 rounded ${selectedElem.fontStyle === 'italic' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-600'}`}
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    updateElement(selectedElem.id, {
                      underline: !selectedElem.underline,
                    })
                  }
                  title="Underline"
                  className={`p-1.5 rounded ${selectedElem.underline ? 'bg-white shadow-sm text-brand-600' : 'text-surface-600'}`}
                >
                  <UnderlineIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center border border-surface-300 rounded p-0.5 bg-surface-50">
                <button
                  onClick={() => updateElement(selectedElem.id, { textAlign: 'left' })}
                  className={`p-1.5 rounded ${selectedElem.textAlign === 'left' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-600'}`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateElement(selectedElem.id, { textAlign: 'center' })}
                  className={`p-1.5 rounded ${selectedElem.textAlign === 'center' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-600'}`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateElement(selectedElem.id, { textAlign: 'right' })}
                  className={`p-1.5 rounded ${selectedElem.textAlign === 'right' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-600'}`}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Text Color */}
              <div className="flex items-center gap-1.5 border border-surface-300 rounded px-2 py-1 bg-surface-50">
                <input
                  type="color"
                  value={selectedElem.color || '#000000'}
                  onChange={(e) => updateElement(selectedElem.id, { color: e.target.value })}
                  className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                />
                <span className="font-mono text-[10px] uppercase text-surface-600">{selectedElem.color || '#000'}</span>
              </div>
            </div>

            {/* Photoshop Text Shadow Section */}
            <div className="p-3 bg-surface-50 rounded-lg border border-surface-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-surface-800 text-[11px] flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedElem.textShadow)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateElement(selectedElem.id, {
                          textShadow: { color: 'rgba(0,0,0,0.6)', blur: 1.5, offsetX: 0.8, offsetY: 0.8 },
                        });
                      } else {
                        updateElement(selectedElem.id, { textShadow: undefined });
                      }
                    }}
                    className="rounded text-brand-600"
                  />
                  <span>Drop Shadow</span>
                </label>
                {selectedElem.textShadow && (
                  <input
                    type="color"
                    value={selectedElem.textShadow.color.startsWith('#') ? selectedElem.textShadow.color : '#000000'}
                    onChange={(e) =>
                      updateElement(selectedElem.id, {
                        textShadow: { ...selectedElem.textShadow!, color: e.target.value },
                      })
                    }
                    className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                  />
                )}
              </div>

              {selectedElem.textShadow && (
                <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
                  <div>
                    <label className="text-surface-500 block mb-0.5">Blur (mm)</label>
                    <input
                      type="number"
                      step="0.2"
                      value={selectedElem.textShadow.blur}
                      onChange={(e) =>
                        updateElement(selectedElem.id, {
                          textShadow: { ...selectedElem.textShadow!, blur: Number(e.target.value) },
                        })
                      }
                      className="w-full px-1.5 py-0.5 border border-surface-300 rounded bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-surface-500 block mb-0.5">Offset X</label>
                    <input
                      type="number"
                      step="0.2"
                      value={selectedElem.textShadow.offsetX}
                      onChange={(e) =>
                        updateElement(selectedElem.id, {
                          textShadow: { ...selectedElem.textShadow!, offsetX: Number(e.target.value) },
                        })
                      }
                      className="w-full px-1.5 py-0.5 border border-surface-300 rounded bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-surface-500 block mb-0.5">Offset Y</label>
                    <input
                      type="number"
                      step="0.2"
                      value={selectedElem.textShadow.offsetY}
                      onChange={(e) =>
                        updateElement(selectedElem.id, {
                          textShadow: { ...selectedElem.textShadow!, offsetY: Number(e.target.value) },
                        })
                      }
                      className="w-full px-1.5 py-0.5 border border-surface-300 rounded bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shape Properties */}
        {selectedElem.type === 'shape' && (
          <div className="space-y-3 pt-2 border-t border-surface-200">
            <span className="font-semibold text-surface-900 block uppercase tracking-wider text-[11px]">
              Fill & Outline
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-surface-500 block mb-1">Fill Color</label>
                <div className="flex items-center gap-2 border border-surface-300 rounded px-2 py-1.5 bg-surface-50">
                  <input
                    type="color"
                    value={selectedElem.fillColor || '#ffffff'}
                    onChange={(e) => updateElement(selectedElem.id, { fillColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="font-mono text-xs">{selectedElem.fillColor || '#fff'}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-surface-500 block mb-1">Stroke Color</label>
                <div className="flex items-center gap-2 border border-surface-300 rounded px-2 py-1.5 bg-surface-50">
                  <input
                    type="color"
                    value={selectedElem.strokeColor || '#000000'}
                    onChange={(e) => updateElement(selectedElem.id, { strokeColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="font-mono text-xs">{selectedElem.strokeColor || '#000'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image / Portrait Properties */}
        {(selectedElem.type === 'portrait' || selectedElem.type === 'image' || selectedElem.type === 'logo') && (
          <div className="space-y-3 pt-2 border-t border-surface-200">
            <span className="font-semibold text-surface-900 block uppercase tracking-wider text-[11px]">
              Image Frame & Fit
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-surface-500 block mb-1">Object Fit</label>
                <select
                  value={selectedElem.objectFit || 'cover'}
                  onChange={(e) => updateElement(selectedElem.id, { objectFit: e.target.value as any })}
                  className="w-full px-2 py-1.5 bg-white border border-surface-300 rounded text-xs outline-none focus:border-brand-500"
                >
                  <option value="cover">Cover (Fill Frame)</option>
                  <option value="contain">Contain (Full Image)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-surface-500 block mb-1">Corner Radius</label>
                <div className="flex items-center border border-surface-300 rounded px-2 py-1 bg-surface-50">
                  <input
                    type="number"
                    step="0.5"
                    value={selectedElem.borderRadius || 0}
                    onChange={(e) => updateElement(selectedElem.id, { borderRadius: Number(e.target.value) })}
                    className="w-full bg-transparent outline-none font-mono text-xs"
                  />
                  <span className="text-[10px] text-surface-400">mm</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
