import React, { useEffect, useState } from 'react';
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
  Plus,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { resolveElementText } from '../../../lib/utils';
import { formService } from '../../../services/form.service';
import { organizationService } from '../../../services/organization.service';
import { FormFieldType } from '../../../types/form';

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
    availableSampleRecords,
    sampleRecordIndex,
    updateElement,
    deleteElement,
    duplicateElement,
  } = useEditorStore();

  const [formFields, setFormFields] = useState<Array<{ key: string; label: string }>>(STANDARD_FIELDS);

  // In-Editor Form Field Creator
  const [showAddFieldDrawer, setShowAddFieldDrawer] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState<FormFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const handleAddNewField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) return;
    const key = (newFieldKey || newFieldLabel).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!key) return;

    if (!formFields.some((f) => f.key === key)) {
      setFormFields((prev) => [...prev, { key, label: newFieldLabel.trim() }]);
    }

    if (selectedElem) {
      const current = (selectedElem as any).content || '';
      const tag = `{{${key}}}`;
      const updated = current ? `${current} ${tag}` : tag;
      updateElement(selectedElem.id, {
        content: updated,
        type: 'dynamic-text',
        fieldKey: (selectedElem as any).fieldKey || key,
      });
    }

    setNewFieldLabel('');
    setNewFieldKey('');
    setNewFieldType('text');
    setNewFieldOptions('');
    setShowAddFieldDrawer(false);
  };

  useEffect(() => {
    async function loadFormFields() {
      try {
        const orgId = organizationService.getActiveOrgId();
        const forms = await formService.getForms(orgId);
        const discovered = new Map<string, string>();

        // 1. Standard fields
        STANDARD_FIELDS.forEach((f) => discovered.set(f.key, f.label));

        // 2. Discover from forms
        forms.forEach((form) => {
          if (Array.isArray(form.fields_schema)) {
            form.fields_schema.forEach((f) => {
              if (f.key && !discovered.has(f.key)) {
                discovered.set(f.key, f.label || f.key);
              }
            });
          }
        });

        // 3. Discover from loaded sample records
        if (availableSampleRecords && availableSampleRecords.length > 0) {
          availableSampleRecords.forEach((rec) => {
            Object.keys(rec).forEach((k) => {
              if (!discovered.has(k) && k !== 'id' && k !== 'organization_id' && k !== 'created_at') {
                discovered.set(k, k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
              }
            });
          });
        }

        setFormFields(Array.from(discovered.entries()).map(([key, label]) => ({ key, label })));
      } catch (err) {
        setFormFields(STANDARD_FIELDS);
      }
    }
    loadFormFields();
  }, [availableSampleRecords]);

  if (!doc) return null;

  const currentLayout = activeSide === 'back' && doc.layouts.back ? doc.layouts.back : doc.layouts.front;
  const selectedElem = currentLayout.elements.find((e) => e.id === selectedElementId);
  const currentRecord = availableSampleRecords[sampleRecordIndex] || {};

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
        {(selectedElem.type === 'dynamic-text' || selectedElem.type === 'text' || selectedElem.type === 'portrait' || selectedElem.type === 'qr-code' || selectedElem.type === 'barcode') && (
          <div className="p-3 bg-brand-50/50 rounded-lg border border-brand-200">
            <span className="font-semibold text-brand-900 flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" /> Form Data Binding
              </span>
              <span className="text-[9px] uppercase tracking-wider text-brand-600 bg-brand-100/70 px-1.5 py-0.5 rounded font-mono">
                {selectedElem.type}
              </span>
            </span>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-surface-600 block mb-1">Target Form Field</label>
                <select
                  value={selectedElem.fieldKey || ''}
                  onChange={(e) => {
                    const newKey = e.target.value;
                    const updates: Record<string, any> = { fieldKey: newKey };
                    if (selectedElem.type === 'text' && newKey) {
                      updates.type = 'dynamic-text';
                    }
                    if (newKey && 'content' in selectedElem && (!selectedElem.content || selectedElem.content === selectedElem.name)) {
                      updates.content = `{{${newKey}}}`;
                    }
                    updateElement(selectedElem.id, updates);
                  }}
                  className="w-full px-2 py-1.5 bg-white border border-surface-300 rounded text-xs text-surface-900 focus:border-brand-500 outline-none"
                >
                  <option value="">-- No Direct Binding (Static) --</option>
                  {formFields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label} ({`{{${f.key}}}`})
                    </option>
                  ))}
                </select>
              </div>

              {(selectedElem.type === 'dynamic-text' || selectedElem.type === 'text') && (
                <div>
                  <label className="text-[11px] text-surface-600 block mb-1">Fallback if Missing</label>
                  <input
                    type="text"
                    value={selectedElem.fallback || ''}
                    onChange={(e) => updateElement(selectedElem.id, { fallback: e.target.value })}
                    placeholder="e.g. N/A or 141"
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] text-surface-500 font-medium">Text Content / Template</label>
                <span className="text-[10px] text-brand-600 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Form Dynamic Tags
                </span>
              </div>
              <textarea
                rows={2}
                value={selectedElem.content || ''}
                onChange={(e) => updateElement(selectedElem.id, { content: e.target.value })}
                placeholder="e.g. Roll No- {{roll_no}} or {{student_name}}"
                className="w-full p-2 border border-surface-300 rounded text-xs font-mono bg-white outline-none focus:border-brand-500"
              />

              {/* Dynamic Tag Quick-Insert Chips & In-Editor Field Addition */}
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-surface-500 font-medium">Click to insert form placeholder:</span>
                  <button
                    type="button"
                    onClick={() => setShowAddFieldDrawer(!showAddFieldDrawer)}
                    className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showAddFieldDrawer ? 'Close Field Form' : 'New Form Field'}</span>
                  </button>
                </div>

                {/* Collapsible Add Field Drawer */}
                {showAddFieldDrawer && (
                  <div className="p-2.5 bg-brand-50/60 rounded-lg border border-brand-200 space-y-2 animate-in fade-in duration-100">
                    <span className="text-[10px] font-bold text-brand-900 block">Create Extra Form Field</span>
                    <div>
                      <input
                        type="text"
                        placeholder="Label (e.g. Session, Blood Group, PIN)"
                        value={newFieldLabel}
                        onChange={(e) => {
                          setNewFieldLabel(e.target.value);
                          setNewFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));
                        }}
                        className="w-full px-2 py-1 text-xs border border-brand-300 rounded bg-white outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={newFieldType}
                        onChange={(e) => {
                          const t = e.target.value as FormFieldType;
                          setNewFieldType(t);
                          if (t === 'select' && !newFieldOptions) {
                            newFieldOptions || setNewFieldOptions('A+, B+, O+, AB+');
                          }
                        }}
                        className="w-full px-1.5 py-1 text-xs border border-brand-300 rounded bg-white font-medium outline-none"
                      >
                        <option value="text">Text Field</option>
                        <option value="number">Number (Roll No)</option>
                        <option value="select">Dropdown Choice</option>
                        <option value="india_address">India Address (API + State/District)</option>
                        <option value="india_pincode">India PIN Code (API)</option>
                        <option value="india_state">India State (36 States/UTs)</option>
                        <option value="india_district">India District (Cascading)</option>
                        <option value="date">Date of Birth</option>
                        <option value="textarea">Multi-line Address</option>
                        <option value="image_upload">Portrait Photo</option>
                        <option value="phone">Phone / WhatsApp</option>
                      </select>

                      <input
                        type="text"
                        placeholder="key_name"
                        value={newFieldKey}
                        onChange={(e) => setNewFieldKey(e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono border border-brand-300 rounded bg-white outline-none"
                      />
                    </div>

                    {newFieldType === 'select' && (
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="Options: A+, B+, O+, AB+ (comma separated)"
                          value={newFieldOptions}
                          onChange={(e) => setNewFieldOptions(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-brand-300 rounded bg-white outline-none"
                        />
                        <div className="flex gap-1 text-[9px]">
                          <button
                            type="button"
                            onClick={() => setNewFieldOptions('A+, A-, B+, B-, O+, O-, AB+, AB-')}
                            className="px-1.5 py-0.5 bg-white border border-brand-200 rounded text-brand-700"
                          >
                            Blood Groups
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewFieldOptions('2024-2026, 2023-2025, 2025-2027')}
                            className="px-1.5 py-0.5 bg-white border border-brand-200 rounded text-brand-700"
                          >
                            Sessions
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddNewField}
                      disabled={!newFieldLabel.trim()}
                      className="w-full py-1 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                    >
                      Add & Insert Tag {newFieldKey ? `{{${newFieldKey}}}` : ''}
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {formFields.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        const current = selectedElem.content || '';
                        const tag = `{{${f.key}}}`;
                        const updated = current ? `${current} ${tag}` : tag;
                        updateElement(selectedElem.id, {
                          content: updated,
                          type: 'dynamic-text',
                          fieldKey: selectedElem.fieldKey || f.key,
                        });
                      }}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded text-[10px] font-mono border border-brand-200 transition-colors"
                      title={`Insert {{${f.key}}}`}
                    >
                      +{`{{${f.key}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Card Output Preview */}
              <div className="mt-2 p-2 bg-surface-50 rounded border border-surface-200 text-[11px]">
                <span className="text-surface-400 text-[10px] block mb-0.5 font-medium">Live Card Output:</span>
                <span className="font-semibold text-surface-800 break-words font-mono">
                  {resolveElementText(selectedElem, currentRecord) || <span className="text-surface-400 italic font-normal">Empty</span>}
                </span>
              </div>
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
