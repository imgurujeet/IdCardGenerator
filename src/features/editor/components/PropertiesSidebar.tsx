import React, { useEffect, useState, useRef } from 'react';
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
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Maximize2,
  Layers,
  MapPin,
  Upload,
  Check,
  Laptop,
  Calendar,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { resolveElementText, DATE_FORMAT_OPTIONS } from '../../../lib/utils';
import {
  ensureFontAvailable,
  STANDARD_SYSTEM_FONTS,
  POPULAR_GOOGLE_FONTS,
  detectLocalSystemFonts,
  loadFontFile,
} from '../../../lib/fontLoader';
import { formService } from '../../../services/form.service';
import { organizationService } from '../../../services/organization.service';
import { FormFieldType } from '../../../types/form';

const STANDARD_FIELDS = [
  // Student / Identity
  { key: 'student_name', label: 'Candidate / Student Name', group: 'identity' },
  { key: 'roll_no', label: 'Roll Number', group: 'identity' },
  { key: 'student_id', label: 'Registration / ID Number', group: 'identity' },
  { key: 'photo_url', label: 'Candidate Portrait Photo', group: 'identity' },
  { key: 'session', label: 'Academic Session (e.g. 2024-26)', group: 'identity' },

  // Structured Address (Options & Standardized)
  { key: 'address', label: 'Village / Ward Address Line', group: 'address' },
  { key: 'village_ward', label: 'Vill / Ward No. (e.g. Vill- Rampur)', group: 'address' },
  { key: 'police_station', label: 'Police Station (PS)', group: 'address' },
  { key: 'district', label: 'District Name', group: 'address' },
  { key: 'district_pin', label: 'District - PIN (e.g. Patna - 803221)', group: 'address' },
  { key: 'state', label: 'State (e.g. Bihar)', group: 'address' },
  { key: 'pincode', label: 'Postal PIN Code (6 Digits)', group: 'address' },
  { key: 'full_address', label: 'Full Combined Address Line', group: 'address' },

  // Personal Details
  { key: 'father_name', label: "Father's Name (F. Name)", group: 'personal' },
  { key: 'mother_name', label: "Mother's Name", group: 'personal' },
  { key: 'dob', label: 'Date of Birth (D.O.B)', group: 'personal' },
  { key: 'blood_group', label: 'Blood Group', group: 'personal' },
  { key: 'mobile', label: 'Mobile / WhatsApp Number', group: 'personal' },
  { key: 'emergency_contact', label: 'Emergency Contact Phone', group: 'personal' },
  { key: 'grade', label: 'Class / Course', group: 'personal' },
  { key: 'section', label: 'Section', group: 'personal' },
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
    reorderElement,
    addCustomFont,
    addTextBoxBelow,
    detectedSystemFonts,
    setDetectedSystemFonts,
  } = useEditorStore();

  const [formFields, setFormFields] = useState<Array<{ key: string; label: string; group?: string }>>(STANDARD_FIELDS);
  const [nudgeStep, setNudgeStep] = useState<number>(0.5);

  // In-Editor Form Field Creator
  const [showAddFieldDrawer, setShowAddFieldDrawer] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState<FormFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Font Management & Dynamic Fonts
  const [showFontDrawer, setShowFontDrawer] = useState(false);
  const [googleFontInput, setGoogleFontInput] = useState('');
  const [customFontNameInput, setCustomFontNameInput] = useState('');
  const [isFontLoading, setIsFontLoading] = useState(false);
  const [fontDetectionStatus, setFontDetectionStatus] = useState<string | null>(null);
  const [fontUploadSuccess, setFontUploadSuccess] = useState<string | null>(null);
  const fontFileInputRef = useRef<HTMLInputElement>(null);

  const handleDetectSystemFonts = async () => {
    setIsFontLoading(true);
    setFontDetectionStatus('Scanning installed PC fonts...');
    try {
      const res = await detectLocalSystemFonts();
      if (res.fonts && res.fonts.length > 0) {
        setDetectedSystemFonts(res.fonts);
        setFontDetectionStatus(`Detected ${res.fonts.length} fonts from your PC!`);
      } else {
        setFontDetectionStatus(res.message || 'Loaded standard system fonts.');
      }
    } catch {
      setFontDetectionStatus('Error reading local fonts.');
    } finally {
      setIsFontLoading(false);
      setTimeout(() => setFontDetectionStatus(null), 4500);
    }
  };

  const handleApplyCustomFontName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fontName = customFontNameInput.trim();
    if (!fontName) return;
    addCustomFont(fontName);
    if (selectedElem) {
      updateElement(selectedElem.id, { fontFamily: fontName });
    }
    setCustomFontNameInput('');
    setFontUploadSuccess(`Custom font "${fontName}" applied!`);
    setTimeout(() => setFontUploadSuccess(null), 3000);
  };

  const handleFontFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { fontName, fontUrl } = await loadFontFile(file);
      addCustomFont(fontName, fontUrl);
      if (selectedElem) {
        updateElement(selectedElem.id, { fontFamily: fontName });
      }
      setFontUploadSuccess(`Font "${fontName}" uploaded & applied!`);
      setTimeout(() => setFontUploadSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to load custom font file:', err);
    }
    e.target.value = '';
  };

  const handleAddGoogleFont = async (nameToAdd?: string) => {
    const fontName = (nameToAdd || googleFontInput).trim();
    if (!fontName) return;
    setIsFontLoading(true);
    try {
      await ensureFontAvailable(fontName);
      addCustomFont(fontName, '');
      if (selectedElem) {
        updateElement(selectedElem.id, { fontFamily: fontName });
      }
      setGoogleFontInput('');
      setFontUploadSuccess(`Google font "${fontName}" applied!`);
      setTimeout(() => setFontUploadSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to load Google font:', err);
    } finally {
      setIsFontLoading(false);
    }
  };

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
        <button
          type="button"
          onClick={() => addTextBoxBelow()}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Blank Text Box</span>
        </button>
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
            type="button"
            onClick={() => addTextBoxBelow(selectedElem.id)}
            title="Add a new blank text box directly below this element"
            className="p-1.5 rounded hover:bg-brand-50 text-brand-600 flex items-center"
          >
            <Plus className="w-3.5 h-3.5 text-brand-600" />
          </button>
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

              {/* Date of Birth / Date Output Format selector */}
              {(selectedElem.type === 'dynamic-text' || selectedElem.type === 'text') &&
                (selectedElem.fieldKey?.toLowerCase().includes('dob') ||
                  selectedElem.fieldKey?.toLowerCase().includes('date') ||
                  selectedElem.fieldKey?.toLowerCase().includes('birth') ||
                  selectedElem.content?.toLowerCase().includes('dob') ||
                  selectedElem.content?.toLowerCase().includes('date') ||
                  selectedElem.dateFormat) && (
                  <div className="pt-2 border-t border-brand-200/80 mt-2">
                    <label className="text-[11px] font-semibold text-brand-900 flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-brand-600" /> Date Output Format
                      </span>
                      <span className="text-[10px] text-brand-700 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-brand-200">
                        {selectedElem.dateFormat || 'DD-MM-YYYY'}
                      </span>
                    </label>
                    <select
                      value={selectedElem.dateFormat || 'DD-MM-YYYY'}
                      onChange={(e) => updateElement(selectedElem.id, { dateFormat: e.target.value })}
                      className="w-full px-2 py-1.5 bg-white border border-brand-300 rounded text-xs font-semibold text-surface-900 focus:border-brand-500 outline-none cursor-pointer"
                    >
                      {DATE_FORMAT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {['DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YY', 'DD MMM YYYY'].map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => updateElement(selectedElem.id, { dateFormat: fmt })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                            (selectedElem.dateFormat || 'DD-MM-YYYY') === fmt
                              ? 'bg-brand-600 text-white border-brand-600 font-bold'
                              : 'bg-white text-surface-700 border-surface-200 hover:bg-surface-50'
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
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

          {/* Photoshop-Style Layer Arrangement */}
          <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-200 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-surface-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-600" />
                <span>Layer Stacking</span>
              </span>
              <span className="text-[10px] font-mono text-surface-500 bg-surface-200/80 px-1.5 py-0.5 rounded">
                z-index: {selectedElem.zIndex ?? 1}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => reorderElement(selectedElem.id, 'top')}
                className="py-1 px-1 bg-white border border-surface-300 hover:border-brand-500 rounded text-surface-700 hover:text-brand-600 font-medium flex items-center justify-center gap-1 shadow-2xs"
                title="Bring to Front"
              >
                <ArrowUpToLine className="w-3.5 h-3.5 text-brand-600" />
                <span>Front</span>
              </button>
              <button
                type="button"
                onClick={() => reorderElement(selectedElem.id, 'up')}
                className="py-1 px-1 bg-white border border-surface-300 hover:border-brand-500 rounded text-surface-700 hover:text-brand-600 font-medium flex items-center justify-center gap-1 shadow-2xs"
                title="Bring Forward"
              >
                <ArrowUp className="w-3.5 h-3.5 text-surface-600" />
                <span>Forward</span>
              </button>
              <button
                type="button"
                onClick={() => reorderElement(selectedElem.id, 'down')}
                className="py-1 px-1 bg-white border border-surface-300 hover:border-brand-500 rounded text-surface-700 hover:text-brand-600 font-medium flex items-center justify-center gap-1 shadow-2xs"
                title="Send Backward"
              >
                <ArrowDown className="w-3.5 h-3.5 text-surface-600" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => reorderElement(selectedElem.id, 'bottom')}
                className="py-1 px-1 bg-white border border-surface-300 hover:border-brand-500 rounded text-surface-700 hover:text-brand-600 font-medium flex items-center justify-center gap-1 shadow-2xs"
                title="Send to Back"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-surface-600" />
                <span>Bottom</span>
              </button>
            </div>
          </div>

          {/* Photoshop-Style Alignment & Distribution */}
          <div className="mt-2.5 p-2.5 bg-surface-50 rounded-lg border border-surface-200 space-y-2">
            <span className="text-[10px] font-semibold text-surface-700 block uppercase tracking-wider">
              Photoshop Alignment & Canvas Placement
            </span>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => updateElement(selectedElem.id, { x: 2 })}
                className="py-1 px-1.5 bg-white border border-surface-300 hover:border-brand-500 rounded text-surface-700 hover:text-brand-600 font-medium flex items-center justify-center gap-1 shadow-2xs"
                title="Align Left (2mm margin)"
              >
                <AlignLeft className="w-3 h-3" />
                <span>Align Left</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const cx = Math.max(0, Number(((doc.dimensions.width - selectedElem.width) / 2).toFixed(2)));
                  updateElement(selectedElem.id, { x: cx });
                }}
                className="py-1 px-1.5 bg-white border border-surface-300 hover:border-brand-500 rounded text-surface-700 hover:text-brand-600 font-medium flex items-center justify-center gap-1 shadow-2xs"
                title="Center Horizontally on Card"
              >
                <AlignCenter className="w-3 h-3 text-brand-600" />
                <span>Center X</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const rx = Math.max(0, Number((doc.dimensions.width - selectedElem.width - 2).toFixed(2)));
                  updateElement(selectedElem.id, { x: rx });
                }}
                className="py-1 px-1.5 bg-white border border-surface-300 hover:border-brand-500 rounded text-surface-700 hover:text-brand-600 font-medium flex items-center justify-center gap-1 shadow-2xs"
                title="Align Right (2mm margin)"
              >
                <AlignRight className="w-3 h-3" />
                <span>Align Right</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => updateElement(selectedElem.id, { y: 2 })}
                className="py-1 px-1.5 bg-white border border-surface-300 hover:border-brand-500 rounded text-surface-700 hover:text-brand-600 font-medium flex items-center justify-center gap-1 shadow-2xs"
                title="Align Top (2mm margin)"
              >
                <ArrowUp className="w-3 h-3" />
                <span>Top Edge</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const cy = Math.max(0, Number(((doc.dimensions.height - selectedElem.height) / 2).toFixed(2)));
                  updateElement(selectedElem.id, { y: cy });
                }}
                className="py-1 px-1.5 bg-white border border-surface-300 hover:border-brand-500 rounded text-surface-700 hover:text-brand-600 font-medium flex items-center justify-center gap-1 shadow-2xs"
                title="Center Vertically on Card"
              >
                <AlignCenter className="w-3 h-3 text-brand-600 rotate-90" />
                <span>Center Y</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const fullW = Number((doc.dimensions.width - 4).toFixed(2));
                  updateElement(selectedElem.id, { x: 2, width: fullW });
                }}
                className="py-1 px-1.5 bg-white border border-surface-300 hover:border-brand-500 rounded text-surface-700 hover:text-brand-600 font-medium flex items-center justify-center gap-1 shadow-2xs"
                title="Fit Width Across Card"
              >
                <Maximize2 className="w-3 h-3 text-indigo-600" />
                <span>Full Width</span>
              </button>
            </div>

            {/* Precision Nudge D-pad with Step Selector */}
            <div className="pt-2 border-t border-surface-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-surface-600 font-medium">Fine Nudge:</span>
                <div className="flex items-center gap-1">
                  {[0.2, 0.5, 1.0].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setNudgeStep(step)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-colors ${
                        nudgeStep === step ? 'bg-brand-600 text-white' : 'bg-surface-200 text-surface-600 hover:bg-surface-300'
                      }`}
                    >
                      {step}mm
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => updateElement(selectedElem.id, { x: Number((selectedElem.x - nudgeStep).toFixed(2)) })}
                  className="py-1 bg-white border border-surface-300 hover:bg-surface-100 rounded text-surface-700 flex items-center justify-center shadow-2xs"
                  title={`Move Left ${nudgeStep}mm`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateElement(selectedElem.id, { x: Number((selectedElem.x + nudgeStep).toFixed(2)) })}
                  className="py-1 bg-white border border-surface-300 hover:bg-surface-100 rounded text-surface-700 flex items-center justify-center shadow-2xs"
                  title={`Move Right ${nudgeStep}mm`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateElement(selectedElem.id, { y: Number((selectedElem.y - nudgeStep).toFixed(2)) })}
                  className="py-1 bg-white border border-surface-300 hover:bg-surface-100 rounded text-surface-700 flex items-center justify-center shadow-2xs"
                  title={`Move Up ${nudgeStep}mm`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateElement(selectedElem.id, { y: Number((selectedElem.y + nudgeStep).toFixed(2)) })}
                  className="py-1 bg-white border border-surface-300 hover:bg-surface-100 rounded text-surface-700 flex items-center justify-center shadow-2xs"
                  title={`Move Down ${nudgeStep}mm`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Text Typography & Photoshop Styling */}
        {(selectedElem.type === 'text' || selectedElem.type === 'dynamic-text') && (
          <div className="space-y-3 pt-2 border-t border-surface-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-surface-900 block uppercase tracking-wider text-[11px]">
                Typography & Styling
              </span>
              <button
                type="button"
                onClick={() => addTextBoxBelow(selectedElem.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 rounded text-[10px] font-semibold transition-colors shadow-2xs"
                title="Add a new blank text box positioned directly below this element"
              >
                <Plus className="w-3 h-3 text-brand-600" />
                <span>+ Blank Text Below</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] text-surface-500 font-medium">Text Content / Template</label>
                {(selectedElem.content || '').includes('{{') ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-purple-600" /> Dynamic Tag Active
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1" title="Direct static text is default across all student cards">
                    <Check className="w-2.5 h-2.5 text-emerald-600" /> Default for All Cards
                  </span>
                )}
              </div>
              <textarea
                rows={2}
                value={selectedElem.content || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const tagMatch = val.match(/\{\{([a-zA-Z0-9_]+)\}\}/);
                  if (tagMatch) {
                    updateElement(selectedElem.id, {
                      content: val,
                      type: 'dynamic-text',
                      fieldKey: tagMatch[1],
                    });
                  } else {
                    updateElement(selectedElem.id, {
                      content: val,
                      type: 'text',
                      fieldKey: undefined,
                    });
                  }
                }}
                placeholder="e.g. Session or Roll No- {{roll_no}}"
                className="w-full p-2 border border-surface-300 rounded text-xs font-mono bg-white outline-none focus:border-brand-500"
              />
              <div className="flex items-center justify-between mt-1 text-[9px] text-surface-500">
                {(selectedElem.content || '').includes('{{') ? (
                  <button
                    type="button"
                    onClick={() => {
                      const plain = (selectedElem.content || '').replace(/\{\{[^}]+\}\}/g, '').trim();
                      updateElement(selectedElem.id, {
                        content: plain || selectedElem.name || 'Static Text',
                        type: 'text',
                        fieldKey: undefined,
                      });
                    }}
                    className="text-brand-600 hover:text-brand-700 font-semibold underline"
                  >
                    Convert to Static Text (Lock as default)
                  </button>
                ) : (
                  <span className="text-surface-400">
                    Direct text entered here is static and default across all cards.
                  </span>
                )}
              </div>

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

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {/* Category 1: Student / Identity */}
                  <div>
                    <span className="text-[9px] font-semibold uppercase text-brand-700 block mb-1">
                      🎓 Student & Roll No
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {formFields
                        .filter((f) => (f.group ? f.group === 'identity' : ['student_name', 'roll_no', 'student_id', 'photo_url', 'session'].includes(f.key)))
                        .map((f) => (
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

                  {/* Category 2: Structured Address */}
                  <div>
                    <span className="text-[9px] font-semibold uppercase text-emerald-800 block mb-1 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Standard Address Options</span>
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {formFields
                        .filter((f) => (f.group ? f.group === 'address' : ['address', 'village_ward', 'police_station', 'district', 'district_pin', 'state', 'pincode', 'full_address'].includes(f.key)))
                        .map((f) => (
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
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[10px] font-mono border border-emerald-300 transition-colors"
                            title={`Insert {{${f.key}}}`}
                          >
                            +{`{{${f.key}}}`}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Category 3: Personal & Academic Details */}
                  <div>
                    <span className="text-[9px] font-semibold uppercase text-purple-800 block mb-1">
                      👤 Personal Details
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {formFields
                        .filter((f) => f.group === 'personal' || ['father_name', 'mother_name', 'dob', 'blood_group', 'mobile', 'emergency_contact', 'grade', 'section'].includes(f.key))
                        .map((f) => (
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
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[10px] font-mono border border-purple-200 transition-colors"
                            title={`Insert {{${f.key}}}`}
                          >
                            +{`{{${f.key}}}`}
                          </button>
                        ))}
                    </div>
                  </div>
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

            {/* Font Family & Size Section with System, Custom, and Google Fonts */}
            <div className="space-y-2">
              <input
                type="file"
                ref={fontFileInputRef}
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
                onChange={handleFontFileUpload}
              />

              {/* Toast / Notification Banners */}
              {fontDetectionStatus && (
                <div className="p-1.5 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-800 flex items-center gap-1.5 animate-in fade-in duration-100">
                  <Laptop className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>{fontDetectionStatus}</span>
                </div>
              )}
              {fontUploadSuccess && (
                <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-800 flex items-center gap-1.5 animate-in fade-in duration-100">
                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{fontUploadSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-surface-500 font-medium">Font Family</label>
                    <button
                      type="button"
                      onClick={() => setShowFontDrawer(!showFontDrawer)}
                      className="text-[9px] text-brand-600 hover:text-brand-700 font-bold flex items-center gap-0.5"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>{showFontDrawer ? 'Close' : 'Add / Custom'}</span>
                    </button>
                  </div>
                  <select
                    value={selectedElem.fontFamily || 'Inter'}
                    onChange={(e) => {
                      const f = e.target.value;
                      ensureFontAvailable(f);
                      updateElement(selectedElem.id, { fontFamily: f });
                    }}
                    className="w-full px-2 py-1.5 bg-white border border-surface-300 rounded text-xs outline-none focus:border-brand-500 font-medium"
                  >
                    {/* User's Custom / Uploaded Fonts */}
                    {customFonts.filter((f) => !POPULAR_GOOGLE_FONTS.includes(f as any)).length > 0 && (
                      <optgroup label="🌟 My Custom & Uploaded Fonts">
                        {customFonts
                          .filter((f) => !POPULAR_GOOGLE_FONTS.includes(f as any))
                          .map((font) => (
                            <option key={font} value={font} style={{ fontFamily: font }}>
                              {font} (Custom)
                            </option>
                          ))}
                      </optgroup>
                    )}

                    {/* Detected PC System Fonts */}
                    {detectedSystemFonts.length > 0 && (
                      <optgroup label={`💻 Detected PC Fonts (${detectedSystemFonts.length})`}>
                        {detectedSystemFonts.map((font) => (
                          <option key={`pc-${font}`} value={font} style={{ fontFamily: font }}>
                            {font}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {/* Standard System & Windows Fonts */}
                    <optgroup label="🔤 Standard System Fonts">
                      {STANDARD_SYSTEM_FONTS.map((font) => (
                        <option key={font} value={font} style={{ fontFamily: font }}>
                          {font}
                        </option>
                      ))}
                    </optgroup>

                    {/* Google Fonts Library */}
                    <optgroup label="🌐 Google Fonts Library">
                      {POPULAR_GOOGLE_FONTS.map((font) => (
                        <option key={font} value={font} style={{ fontFamily: font }}>
                          {font}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-surface-500 font-medium">Font Size</label>
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateElement(selectedElem.id, {
                            fontSize: Math.max(1.0, Number(((selectedElem.fontSize || 4) - 0.2).toFixed(1))),
                          })
                        }
                        className="px-1 py-0.5 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded text-[9px] font-mono font-bold"
                        title="Decrease 0.2mm"
                      >
                        -0.2
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateElement(selectedElem.id, {
                            fontSize: Number(((selectedElem.fontSize || 4) + 0.2).toFixed(1)),
                          })
                        }
                        className="px-1 py-0.5 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded text-[9px] font-mono font-bold"
                        title="Increase 0.2mm"
                      >
                        +0.2
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center border border-surface-300 rounded px-2 py-1 bg-surface-50">
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      value={selectedElem.fontSize || 4}
                      onChange={(e) => updateElement(selectedElem.id, { fontSize: Number(e.target.value) })}
                      className="w-full bg-transparent outline-none font-mono text-xs"
                    />
                    <span className="text-[10px] text-surface-400">mm</span>
                  </div>
                </div>
              </div>

              {/* Quick Font Sourcing Toolbar: Detect PC Fonts & Upload */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleDetectSystemFonts}
                  disabled={isFontLoading}
                  className="flex-1 py-1 px-1.5 bg-white border border-surface-300 hover:border-brand-500 hover:bg-brand-50/40 text-surface-700 hover:text-brand-700 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors shadow-2xs"
                  title="Detect all fonts installed locally on your Windows PC"
                >
                  <Laptop className="w-3 h-3 text-brand-600 shrink-0" />
                  <span>{detectedSystemFonts.length > 0 ? `PC Fonts (${detectedSystemFonts.length})` : 'Detect PC Fonts'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fontFileInputRef.current?.click()}
                  className="flex-1 py-1 px-1.5 bg-white border border-surface-300 hover:border-brand-500 hover:bg-brand-50/40 text-surface-700 hover:text-brand-700 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors shadow-2xs"
                  title="Upload .ttf, .otf, .woff or .woff2 font file"
                >
                  <Upload className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Upload Font File</span>
                </button>
              </div>

              {/* Quick Font Size Presets */}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                <span className="text-[9px] text-surface-400">Presets:</span>
                {[2.5, 3.0, 3.5, 4.0, 5.0, 6.0].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateElement(selectedElem.id, { fontSize: size })}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                      selectedElem.fontSize === size
                        ? 'bg-brand-600 text-white font-bold'
                        : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                    }`}
                  >
                    {size}mm
                  </button>
                ))}
              </div>

              {/* Collapsible Font Customization Drawer */}
              {showFontDrawer && (
                <div className="p-2.5 bg-brand-50/70 rounded-lg border border-brand-200 space-y-2.5 animate-in fade-in duration-100">
                  {/* Option 1: Type ANY Custom Font Name of Your Choice */}
                  <div>
                    <label className="text-[10px] font-bold text-brand-950 block mb-1">
                      Type Custom / System Font Name:
                    </label>
                    <form onSubmit={handleApplyCustomFontName} className="flex gap-1">
                      <input
                        type="text"
                        placeholder="e.g. Kruti Dev 010, Mangal, Arial Black"
                        value={customFontNameInput}
                        onChange={(e) => setCustomFontNameInput(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-brand-300 rounded bg-white outline-none focus:border-brand-500 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={!customFontNameInput.trim()}
                        className="px-2 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs font-semibold disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </form>
                    <p className="text-[9px] text-brand-700 mt-0.5 leading-tight">
                      Type any font installed on your PC (Hindi, regional, or proprietary fonts) to use it directly.
                    </p>
                  </div>

                  {/* Option 2: Add Google Font by Name */}
                  <div className="pt-2 border-t border-brand-200/70">
                    <label className="text-[10px] font-bold text-brand-950 block mb-1">
                      Add from Google Fonts:
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="e.g. Pacifico, Caveat, Anton"
                        value={googleFontInput}
                        onChange={(e) => setGoogleFontInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddGoogleFont();
                          }
                        }}
                        className="flex-1 px-2 py-1 text-xs border border-brand-300 rounded bg-white outline-none focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddGoogleFont()}
                        disabled={!googleFontInput.trim() || isFontLoading}
                        className="px-2 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded text-xs font-semibold disabled:opacity-50"
                      >
                        {isFontLoading ? 'Loading...' : 'Add'}
                      </button>
                    </div>
                  </div>

                  {/* Option 3: Quick ID Card Google Fonts */}
                  <div className="pt-1 border-t border-brand-200/70">
                    <span className="text-[9px] text-surface-500 block mb-1">Popular ID card typefaces:</span>
                    <div className="flex flex-wrap gap-1">
                      {['Bebas Neue', 'Poppins', 'Montserrat', 'Oswald', 'Outfit', 'Playfair Display', 'Cinzel'].map(
                        (fName) => (
                          <button
                            key={fName}
                            type="button"
                            onClick={() => handleAddGoogleFont(fName)}
                            className="px-1.5 py-0.5 bg-white hover:bg-brand-100 border border-brand-200 rounded text-[9px] text-brand-800 font-medium"
                          >
                            +{fName}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
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

            {/* Typography Controls: Line Spacing & Text Case */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-surface-500 block mb-0.5">Line Spacing</label>
                <select
                  value={selectedElem.lineHeight || 1.25}
                  onChange={(e) => updateElement(selectedElem.id, { lineHeight: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-white border border-surface-300 rounded text-xs outline-none focus:border-brand-500"
                >
                  <option value={1.0}>Tight (1.0x)</option>
                  <option value={1.25}>Standard (1.25x)</option>
                  <option value={1.4}>Relaxed (1.4x)</option>
                  <option value={1.6}>Double (1.6x)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-surface-500 block mb-0.5">Text Case</label>
                <select
                  value={selectedElem.textTransform || 'none'}
                  onChange={(e) => updateElement(selectedElem.id, { textTransform: e.target.value as any })}
                  className="w-full px-2 py-1 bg-white border border-surface-300 rounded text-xs outline-none focus:border-brand-500 font-medium"
                >
                  <option value="none">As Typed (Normal)</option>
                  <option value="uppercase">UPPERCASE (ALL CAPS)</option>
                  <option value="lowercase">lowercase</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-surface-500 block mb-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-brand-600" /> Date Format
                </label>
                <select
                  value={selectedElem.dateFormat || ''}
                  onChange={(e) => updateElement(selectedElem.id, { dateFormat: e.target.value || undefined })}
                  className="w-full px-2 py-1 bg-white border border-surface-300 rounded text-xs outline-none focus:border-brand-500 font-medium cursor-pointer"
                >
                  <option value="">Default (Auto / As-is)</option>
                  {DATE_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto-Fit to Selected Box Area Feature */}
            <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-emerald-950 text-[11px] flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedElem.autoFit !== false}
                    onChange={(e) => updateElement(selectedElem.id, { autoFit: e.target.checked })}
                    className="rounded text-emerald-600 cursor-pointer"
                  />
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Auto-Fit Text to Selected Area
                </label>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  selectedElem.autoFit !== false ? 'bg-emerald-200 text-emerald-800' : 'bg-surface-200 text-surface-600'
                }`}>
                  {selectedElem.autoFit !== false ? 'ACTIVE' : 'OFF'}
                </span>
              </div>
              <p className="text-[10px] text-emerald-800 leading-relaxed">
                When student names or text are long, font size automatically scales down to fit your chosen width and height perfectly without breaking out of the box.
              </p>

              {selectedElem.autoFit !== false && (
                <div className="space-y-2 pt-1 border-t border-emerald-200/60">
                  {/* Single Line vs Multi-Line Wrap Mode */}
                  <div>
                    <label className="text-[10px] text-emerald-900 block mb-1 font-medium">Text Line Flow Mode</label>
                    <div className="grid grid-cols-2 gap-1 text-[9px]">
                      <button
                        type="button"
                        onClick={() => updateElement(selectedElem.id, { maxLines: 1 })}
                        className={`py-1 px-1.5 rounded font-semibold text-center border transition-colors ${
                          selectedElem.maxLines === 1
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title="Keeps all text on a single line and dynamically scales font size to fit horizontally"
                      >
                        Single Line (Names, IDs)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElement(selectedElem.id, { maxLines: undefined })}
                        className={`py-1 px-1.5 rounded font-semibold text-center border transition-colors ${
                          selectedElem.maxLines !== 1
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title="Wraps text across multiple lines when box is tall enough"
                      >
                        Multi-Line Wrap (Address)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] text-emerald-900 font-medium">Min Font (mm)</label>
                        <div className="flex gap-0.5">
                          {[1.5, 2.0, 2.5].map((ms) => (
                            <button
                              key={ms}
                              type="button"
                              onClick={() => updateElement(selectedElem.id, { minFontSize: ms })}
                              className={`px-1 py-0.2 rounded text-[8px] font-mono ${
                                selectedElem.minFontSize === ms
                                  ? 'bg-emerald-700 text-white font-bold'
                                  : 'bg-white text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {ms}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.2"
                        value={selectedElem.minFontSize || 2.0}
                        onChange={(e) => updateElement(selectedElem.id, { minFontSize: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-white border border-emerald-300 rounded font-mono text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-emerald-900 block mb-0.5 font-medium">Vertical Alignment</label>
                      <div className="flex items-center border border-emerald-300 rounded bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => updateElement(selectedElem.id, { verticalAlign: 'top' })}
                          title="Align Top"
                          className={`flex-1 py-0.5 text-[9px] rounded font-semibold ${
                            selectedElem.verticalAlign === 'top' ? 'bg-emerald-600 text-white' : 'text-surface-600'
                          }`}
                        >
                          Top
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElement(selectedElem.id, { verticalAlign: 'middle' })}
                          title="Align Middle (Center)"
                          className={`flex-1 py-0.5 text-[9px] rounded font-semibold ${
                            !selectedElem.verticalAlign || selectedElem.verticalAlign === 'middle' ? 'bg-emerald-600 text-white' : 'text-surface-600'
                          }`}
                        >
                          Mid
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElement(selectedElem.id, { verticalAlign: 'bottom' })}
                          title="Align Bottom"
                          className={`flex-1 py-0.5 text-[9px] rounded font-semibold ${
                            selectedElem.verticalAlign === 'bottom' ? 'bg-emerald-600 text-white' : 'text-surface-600'
                          }`}
                        >
                          Btm
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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

            {/* Text Stroke / Outline Section */}
            <div className="p-3 bg-surface-50 rounded-lg border border-surface-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-surface-800 text-[11px] flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedElem.textStrokeWidth && selectedElem.textStrokeWidth > 0)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateElement(selectedElem.id, {
                          textStrokeWidth: 0.4,
                          textStrokeColor: '#000000',
                        });
                      } else {
                        updateElement(selectedElem.id, {
                          textStrokeWidth: 0,
                          textStrokeColor: undefined,
                        });
                      }
                    }}
                    className="rounded text-brand-600"
                  />
                  <span>Text Stroke / Outline</span>
                </label>
                {selectedElem.textStrokeColor && (
                  <input
                    type="color"
                    value={selectedElem.textStrokeColor.startsWith('#') ? selectedElem.textStrokeColor : '#000000'}
                    onChange={(e) => updateElement(selectedElem.id, { textStrokeColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                  />
                )}
              </div>

              {Boolean(selectedElem.textStrokeWidth && selectedElem.textStrokeWidth > 0) && (
                <div className="space-y-1.5 pt-1 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-surface-500">Stroke Width ({selectedElem.textStrokeWidth || 0}mm)</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="3"
                      value={selectedElem.textStrokeWidth || 0}
                      onChange={(e) => updateElement(selectedElem.id, { textStrokeWidth: Number(e.target.value) })}
                      className="w-14 px-1 py-0.5 border border-surface-300 rounded bg-white text-xs font-mono text-center"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    value={selectedElem.textStrokeWidth || 0}
                    onChange={(e) => updateElement(selectedElem.id, { textStrokeWidth: Number(e.target.value) })}
                    className="w-full accent-brand-600 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shape Properties */}
        {selectedElem.type === 'shape' && (
          <div className="space-y-3 pt-2 border-t border-surface-200">
            <span className="font-semibold text-surface-900 block uppercase tracking-wider text-[11px]">
              Fill, Stroke & Radius
            </span>

            {/* Colors */}
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
                  <span className="font-mono text-xs truncate">{selectedElem.fillColor || '#fff'}</span>
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
                  <span className="font-mono text-xs truncate">{selectedElem.strokeColor || '#000'}</span>
                </div>
              </div>
            </div>

            {/* Stroke Width Slider & Number Input */}
            <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-200 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="font-semibold text-surface-700">Border / Stroke Width</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.2"
                    min="0"
                    max="10"
                    value={selectedElem.strokeWidth || 0}
                    onChange={(e) => updateElement(selectedElem.id, { strokeWidth: Math.max(0, Number(e.target.value)) })}
                    className="w-14 px-1.5 py-0.5 border border-surface-300 rounded bg-white text-xs font-mono text-center outline-none focus:border-brand-500"
                  />
                  <span className="text-[10px] text-surface-400">mm</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="0.1"
                value={selectedElem.strokeWidth || 0}
                onChange={(e) => updateElement(selectedElem.id, { strokeWidth: Number(e.target.value) })}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-surface-400">
                <span>0mm (No Stroke)</span>
                <span>4mm</span>
                <span>8mm</span>
              </div>
            </div>

            {/* Corner Radius Slider (Rectangle) */}
            {selectedElem.shapeType === 'rectangle' && (
              <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <label className="font-semibold text-surface-700">Corner Radius</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="25"
                      value={selectedElem.borderRadius || 0}
                      onChange={(e) => updateElement(selectedElem.id, { borderRadius: Math.max(0, Number(e.target.value)) })}
                      className="w-14 px-1.5 py-0.5 border border-surface-300 rounded bg-white text-xs font-mono text-center outline-none focus:border-brand-500"
                    />
                    <span className="text-[10px] text-surface-400">mm</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={selectedElem.borderRadius || 0}
                  onChange={(e) => updateElement(selectedElem.id, { borderRadius: Number(e.target.value) })}
                  className="w-full accent-brand-600 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-surface-400">
                  <span>Square (0)</span>
                  <span>Rounded (10)</span>
                  <span>Pill (20mm)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image / Portrait Properties */}
        {(selectedElem.type === 'portrait' || selectedElem.type === 'image' || selectedElem.type === 'logo') && (
          <div className="space-y-3 pt-2 border-t border-surface-200">
            <span className="font-semibold text-surface-900 block uppercase tracking-wider text-[11px]">
              Frame, Stroke & Fit
            </span>

            <div>
              <label className="text-[10px] text-surface-500 block mb-1">Object Fit</label>
              <select
                value={selectedElem.objectFit || 'cover'}
                onChange={(e) => updateElement(selectedElem.id, { objectFit: e.target.value as any })}
                className="w-full px-2 py-1.5 bg-white border border-surface-300 rounded text-xs outline-none focus:border-brand-500"
              >
                <option value="cover">Cover (Fill Frame / Portrait)</option>
                <option value="contain">Contain (Full Image Uncropped)</option>
              </select>
            </div>

            {/* Border / Frame Width Slider */}
            <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-200 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="font-semibold text-surface-700">Border / Frame Width</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.2"
                    min="0"
                    max="10"
                    value={selectedElem.borderWidth ?? (selectedElem as any).strokeWidth ?? 0}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      updateElement(selectedElem.id, { borderWidth: val, strokeWidth: val });
                    }}
                    className="w-14 px-1.5 py-0.5 border border-surface-300 rounded bg-white text-xs font-mono text-center outline-none focus:border-brand-500"
                  />
                  <span className="text-[10px] text-surface-400">mm</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="0.1"
                value={selectedElem.borderWidth ?? (selectedElem as any).strokeWidth ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateElement(selectedElem.id, { borderWidth: val, strokeWidth: val });
                }}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-surface-400">
                <span>0mm (No Border)</span>
                <span>4mm</span>
                <span>8mm</span>
              </div>

              {/* Border Color */}
              <div className="pt-2 flex items-center justify-between border-t border-surface-200 text-[10px]">
                <span className="text-surface-600 font-medium">Border Color</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={selectedElem.borderColor || (selectedElem as any).strokeColor || '#000000'}
                    onChange={(e) => updateElement(selectedElem.id, { borderColor: e.target.value, strokeColor: e.target.value })}
                    className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="font-mono uppercase text-surface-600">
                    {selectedElem.borderColor || (selectedElem as any).strokeColor || '#000'}
                  </span>
                </div>
              </div>
            </div>

            {/* Image Corner Radius Slider */}
            <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-200 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="font-semibold text-surface-700">Corner Radius</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={selectedElem.borderRadius || 0}
                    onChange={(e) => updateElement(selectedElem.id, { borderRadius: Math.max(0, Number(e.target.value)) })}
                    className="w-14 px-1.5 py-0.5 border border-surface-300 rounded bg-white text-xs font-mono text-center outline-none focus:border-brand-500"
                  />
                  <span className="text-[10px] text-surface-400">mm</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={selectedElem.borderRadius || 0}
                onChange={(e) => updateElement(selectedElem.id, { borderRadius: Number(e.target.value) })}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-surface-400">
                <span>Sharp (0)</span>
                <span>Rounded (8)</span>
                <span>Oval/Circle (30mm)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
