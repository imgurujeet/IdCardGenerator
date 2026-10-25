import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Save,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  X,
  Plus,
  Trash2,
  ArrowRight,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
  Archive,
  Layers,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { templateService } from '../../../services/template.service';
import { formService } from '../../../services/form.service';
import { organizationService } from '../../../services/organization.service';
import { generateSingleCardPdf } from '../../generation/renderer/pdfExporter';
import { generateSingleCardJpg } from '../../generation/renderer/canvasRenderer';
import { generateSingleCardZip, generateIndividualCardsZip } from '../../generation/renderer/zipExporter';
import { triggerDownload, getRecordDisplayName, getRecordDisplayRoll, sanitizeFilenamePart } from '../../../lib/utils';
import { FormFieldType } from '../../../types/form';

interface ExtractedField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export const EditorToolbar: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const linkedFormId = searchParams.get('formId');

  const {
    document: doc,
    activeSide,
    zoom,
    gridSnap,
    isDirty,
    isSaving,
    historyIndex,
    history,
    sampleRecordIndex,
    availableSampleRecords,
    setActiveSide,
    setZoom,
    toggleGridSnap,
    undo,
    redo,
    setSampleRecordIndex,
    updateCurrentSampleRecord,
    markSaved,
  } = useEditorStore();

  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showRecordEditorModal, setShowRecordEditorModal] = useState(false);

  // Form Generator Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [isGeneratingForm, setIsGeneratingForm] = useState(false);
  const [generatedFormSlug, setGeneratedFormSlug] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!doc) return null;

  const handleSave = async () => {
    try {
      setSaveStatus('Saving...');
      const targetId = templateId && templateId !== 'new' ? templateId : doc.id;
      const updatedDoc = { ...doc, id: targetId };
      await templateService.saveTemplateVersion(targetId, updatedDoc, true);

      // If this was loaded via formId, ensure form's template_id is linked
      if (linkedFormId) {
        await formService.updateForm(linkedFormId, { template_id: targetId });
      }

      markSaved();
      setSaveStatus('Saved ✓');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      console.error('Save template failed:', err);
      setSaveStatus('Save Failed');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleQuickExport = async () => {
    if (!doc) return;
    try {
      setIsExporting(true);
      const activeRecord = availableSampleRecords[sampleRecordIndex] || {};
      const pdfBytes = await generateSingleCardPdf(doc, activeRecord, true);
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      triggerDownload(blob, `${doc.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_preview.pdf`);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const [exportingLabel, setExportingLabel] = useState<string>('');
  const [showJpgMenu, setShowJpgMenu] = useState(false);

  // Export both front & back JPG inside a single ZIP
  const handleExportBothSidesZip = async () => {
    if (!doc) return;
    try {
      setIsExportingJpg(true);
      setExportingLabel('Exporting Both...');
      const activeRecord = availableSampleRecords[sampleRecordIndex] || {};
      const zipBlob = await generateSingleCardZip(doc, activeRecord, 'jpg');
      const roll = sanitizeFilenamePart(getRecordDisplayRoll(activeRecord, sampleRecordIndex));
      const name = sanitizeFilenamePart(getRecordDisplayName(activeRecord));
      triggerDownload(zipBlob, `${roll}_${name}_ID_Card_JPG.zip`);
    } catch (err) {
      console.error('Export both sides error:', err);
      alert('Failed to export card images. Please check template images.');
    } finally {
      setIsExportingJpg(false);
      setExportingLabel('');
      setShowJpgMenu(false);
    }
  };

  // Export single side (front or back) as high-res 300 DPI JPG
  const handleExportSingleSideJpg = async (side: 'front' | 'back') => {
    if (!doc) return;
    try {
      setIsExportingJpg(true);
      setExportingLabel(`Exporting ${side === 'front' ? 'Front' : 'Back'}...`);
      const activeRecord = availableSampleRecords[sampleRecordIndex] || {};
      const jpgBlob = await generateSingleCardJpg(doc, activeRecord, side, 0.95);
      const roll = sanitizeFilenamePart(getRecordDisplayRoll(activeRecord, sampleRecordIndex));
      const name = sanitizeFilenamePart(getRecordDisplayName(activeRecord));
      triggerDownload(jpgBlob, `${roll}_${name}_${side}.jpg`);
    } catch (err) {
      console.error('Export JPG error:', err);
      alert('Failed to export JPG. Please check template images.');
    } finally {
      setIsExportingJpg(false);
      setExportingLabel('');
      setShowJpgMenu(false);
    }
  };

  // Bulk Export all sample/form records as Front & Back JPGs inside a ZIP
  const handleExportBulkAllJpgZip = async () => {
    if (!doc) return;
    const recordsToExport = availableSampleRecords.length > 0 ? availableSampleRecords : [{}];
    try {
      setIsExportingJpg(true);
      setExportingLabel(`Exporting ${recordsToExport.length} Cards...`);
      const zipBlob = await generateIndividualCardsZip(
        doc,
        recordsToExport,
        'jpg',
        true
      );
      const docName = sanitizeFilenamePart(doc.name) || 'ID_Cards';
      triggerDownload(zipBlob, `Bulk_All_JPGs_${docName}_(${recordsToExport.length}_Students).zip`);
    } catch (err) {
      console.error('Bulk export JPG error:', err);
      alert('Failed to bulk export cards.');
    } finally {
      setIsExportingJpg(false);
      setExportingLabel('');
      setShowJpgMenu(false);
    }
  };


  // Open Form Generator Modal with auto-detected fields from template
  const handleOpenFormGenerator = () => {
    const detectedKeys = new Set<string>();
    const fields: ExtractedField[] = [];

    // Helper to add field
    const addDetected = (key: string, customType?: FormFieldType, customOptions?: string[]) => {
      const cleanKey = key.trim().toLowerCase();
      if (!cleanKey || detectedKeys.has(cleanKey)) return;
      detectedKeys.add(cleanKey);

      let type: FormFieldType = customType || 'text';
      let options: string[] | undefined = customOptions;
      let label = cleanKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      let required = true;

      // Smart heuristic based on field key
      if (cleanKey.includes('roll') || cleanKey.includes('marks') || cleanKey.includes('rank') || cleanKey.includes('number')) {
        type = 'number';
        label = 'Roll Number';
      } else if (cleanKey.includes('name')) {
        type = 'text';
        label = cleanKey.includes('father') ? "Father's Name" : 'Candidate Full Name';
      } else if (cleanKey.includes('dob') || cleanKey.includes('date') || cleanKey.includes('birth')) {
        type = 'date';
        label = 'Date of Birth';
      } else if (cleanKey.includes('blood')) {
        type = 'select';
        label = 'Blood Group';
        options = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
        required = false;
      } else if (cleanKey.includes('session')) {
        type = 'select';
        label = 'Academic Session';
        options = ['2024-2026', '2023-2025', '2025-2027'];
      } else if (cleanKey.includes('course') || cleanKey.includes('trade') || cleanKey.includes('class')) {
        type = 'select';
        label = 'Course / Trade';
        options = ['D.El.Ed', 'B.Ed', 'B.Tech', 'B.Sc'];
      } else if (cleanKey.includes('pin') || cleanKey.includes('postal')) {
        type = 'india_pincode';
        label = 'PIN Code (Auto-fills District & State)';
      } else if (cleanKey.includes('photo') || cleanKey.includes('avatar') || cleanKey.includes('image')) {
        type = 'image_upload';
        label = 'Passport Size Photo';
      } else if (cleanKey.includes('address') || cleanKey.includes('village')) {
        type = 'textarea';
        label = 'Permanent Address';
        required = false;
      } else if (cleanKey.includes('mobile') || cleanKey.includes('phone') || cleanKey.includes('contact')) {
        type = 'phone';
        label = 'Mobile / WhatsApp Number';
      } else if (cleanKey.includes('email')) {
        type = 'email';
        label = 'Email Address';
        required = false;
      }

      fields.push({
        key: cleanKey,
        label,
        type,
        required,
        options,
      });
    };

    // Scan Front elements
    const allElements = [
      ...doc.layouts.front.elements,
      ...(doc.layouts.back?.elements || []),
    ];

    allElements.forEach((el) => {
      // Dynamic text templates
      if (el.type === 'dynamic-text' || el.type === 'text') {
        const content = el.content || '';
        const matches = content.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g);
        for (const match of matches) {
          if (match[1]) addDetected(match[1]);
        }
        if (el.fieldKey) addDetected(el.fieldKey);
      }
      // Photo frames
      if (el.type === 'portrait' || el.type === 'image') {
        if (el.fieldKey) {
          addDetected(el.fieldKey, 'image_upload');
        } else {
          addDetected('photo_url', 'image_upload');
        }
      }
      // Barcode / QR
      if (el.type === 'barcode' || (el as any).type === 'qr-code') {
        if ((el as any).fieldKey) addDetected((el as any).fieldKey);
      }
    });

    // If no dynamic tags were found, populate standard college fields
    if (fields.length === 0) {
      addDetected('student_name', 'text');
      addDetected('roll_no', 'number');
      addDetected('session', 'select', ['2024-2026', '2023-2025', '2025-2027']);
      addDetected('blood_group', 'select', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']);
      addDetected('pincode', 'india_pincode');
      addDetected('photo_url', 'image_upload');
    }

    setFormTitle(`${doc.name} - Registration Form`);
    setFormDescription('Please fill out this official registration form to submit your details and portrait photo for instant ID card issuance.');
    setExtractedFields(fields);
    setGeneratedFormSlug(null);
    setShowFormModal(true);
  };

  const handleGenerateFormSubmit = async () => {
    if (!formTitle.trim()) return;
    try {
      setIsGeneratingForm(true);
      const orgId = organizationService.getActiveOrgId();
      const targetId = templateId && templateId !== 'new' ? templateId : doc.id;

      // Ensure template is saved first
      await templateService.saveTemplateVersion(targetId, { ...doc, id: targetId }, true);

      // Map fields to form schema
      const fieldsSchema = extractedFields.map((f, i) => ({
        id: `field-${i + 1}`,
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        options: f.options,
        placeholder: f.placeholder,
      }));

      const newForm = await formService.createForm(orgId, {
        title: formTitle,
        description: formDescription,
        templateId: targetId,
        auto_approve: true,
        enforce_unique: true,
        unique_field_key: extractedFields.some((f) => f.key === 'roll_no') ? 'roll_no' : 'mobile',
        fields: fieldsSchema,
      });

      setGeneratedFormSlug(newForm.public_slug);
    } catch (err: any) {
      console.error('Failed to create form from template:', err);
      alert('Could not generate form: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGeneratingForm(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedFormSlug) return;
    const url = `${window.location.origin}/form/${generatedFormSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <>
      <header className="h-14 bg-white border-b border-surface-200 px-4 flex items-center justify-between shrink-0 select-none z-20">
        {/* Left: Template Title & Dirty State */}
        {/* Left: Home Navigation, Template Title & Dirty State */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/')}
            title="Go to Home Dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 bg-surface-50 hover:bg-surface-100 hover:border-surface-300 text-surface-800 font-semibold text-xs transition-colors shadow-xs group"
          >
            <Home className="w-3.5 h-3.5 text-brand-600 group-hover:scale-110 transition-transform" />
            <span>Home</span>
          </button>

          <div className="h-4 w-px bg-surface-200 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-semibold text-surface-900 text-sm tracking-tight whitespace-nowrap truncate max-w-[240px]" title={doc.name}>
              {doc.name}
            </h1>
            {linkedFormId && (
              <span className="hidden md:flex items-center gap-1 text-[10px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 shrink-0">
                <LinkIcon className="w-3 h-3" /> Linked Form
              </span>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-100 text-surface-600 border border-surface-200">
            <span className="capitalize">{doc.category}</span>
            <span>•</span>
            <span>{doc.dimensions.width}×{doc.dimensions.height}mm</span>
          </div>

          {isDirty ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <AlertCircle className="w-3 h-3" /> Unsaved changes
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Up to date
            </span>
          )}
        </div>

        {/* Center: History, Layout, Zoom, and Grid Controls */}
        <div className="flex items-center gap-1 bg-surface-50 border border-surface-200 p-1 rounded-lg">
          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-white text-surface-600 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded hover:bg-white text-surface-600 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-surface-200 mx-1" />

          {/* Front / Back Side Switcher */}
          <div className="flex bg-surface-200 p-0.5 rounded text-xs font-medium">
            <button
              onClick={() => setActiveSide('front')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeSide === 'front' ? 'bg-white text-surface-900 shadow-sm font-semibold' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              Front
            </button>
            <button
              onClick={() => setActiveSide('back')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeSide === 'back' ? 'bg-white text-surface-900 shadow-sm font-semibold' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              Back
            </button>
          </div>

          <div className="h-4 w-px bg-surface-200 mx-1" />

          {/* Grid Snap */}
          <button
            onClick={toggleGridSnap}
            title="Toggle Grid Snapping"
            className={`p-1.5 rounded transition-colors ${
              gridSnap ? 'bg-brand-100 text-brand-700' : 'hover:bg-white text-surface-600'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(zoom - 0.2)}
              title="Zoom Out"
              className="p-1.5 rounded hover:bg-white text-surface-600"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-surface-700 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(zoom + 0.2)}
              title="Zoom In"
              className="p-1.5 rounded hover:bg-white text-surface-600"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1.5)}
              title="Reset Zoom"
              className="p-1.5 rounded hover:bg-white text-surface-600"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Data Switcher, Create Form, Quick Export & Save */}
        <div className="flex items-center gap-2">
          {/* Real Data & Live Form Submission Selector */}
          {availableSampleRecords.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs bg-surface-50 border border-surface-200 px-2 py-1 rounded-lg shadow-2xs">
              <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider text-surface-500">
                Live Data:
              </span>
              <button
                type="button"
                disabled={sampleRecordIndex <= 0}
                onClick={() => setSampleRecordIndex(Math.max(0, sampleRecordIndex - 1))}
                className="p-0.5 rounded hover:bg-surface-200 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Previous Record"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-surface-600" />
              </button>
              <select
                value={sampleRecordIndex}
                onChange={(e) => setSampleRecordIndex(Number(e.target.value))}
                className="bg-transparent font-semibold text-surface-900 outline-none cursor-pointer text-xs max-w-[130px] sm:max-w-[180px] truncate"
                title="Choose submitted student / real record to preview on front and back"
              >
                {availableSampleRecords.map((rec, i) => {
                  const name = rec.student_name || rec.full_name || rec.name || `Record #${i + 1}`;
                  const roll = rec.roll_no || rec.student_roll || rec.identifier;
                  return (
                    <option key={i} value={i}>
                      {name} {roll ? `(${roll})` : ''}
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                disabled={sampleRecordIndex >= availableSampleRecords.length - 1}
                onClick={() => setSampleRecordIndex(Math.min(availableSampleRecords.length - 1, sampleRecordIndex + 1))}
                className="p-0.5 rounded hover:bg-surface-200 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Next Record"
              >
                <ChevronRight className="w-3.5 h-3.5 text-surface-600" />
              </button>

              <button
                type="button"
                onClick={() => setShowRecordEditorModal(true)}
                title="Edit or Test Real Information Live on Card"
                className="ml-1 p-1 rounded hover:bg-brand-100 text-brand-700 bg-brand-50 border border-brand-200 transition-colors flex items-center gap-1 text-[11px] font-semibold"
              >
                <SlidersHorizontal className="w-3 h-3 text-brand-600" />
                <span className="hidden sm:inline">Edit Data</span>
              </button>
            </div>
          )}

          {/* Create Form from Template Button */}
          <button
            onClick={handleOpenFormGenerator}
            title="Create a shareable student registration form based on this template"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Create Form</span>
          </button>

          {/* Download JPG Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowJpgMenu(!showJpgMenu)}
              disabled={isExportingJpg}
              title="Download card JPG images (Both Sides, Front, Back, or Bulk ZIP)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors disabled:opacity-50 shrink-0"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">
                {isExportingJpg ? exportingLabel || 'Exporting...' : 'Download JPG'}
              </span>
              <span className="sm:hidden">JPG</span>
              <ChevronDown className="w-3 h-3 text-emerald-600" />
            </button>

            {showJpgMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowJpgMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-surface-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-surface-100 bg-surface-50 text-[11px] text-surface-500 font-medium">
                    Current Record: <span className="font-semibold text-surface-800">{getRecordDisplayRoll(availableSampleRecords[sampleRecordIndex])} • {getRecordDisplayName(availableSampleRecords[sampleRecordIndex])}</span>
                  </div>

                  <button
                    onClick={handleExportBothSidesZip}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-surface-800 hover:text-emerald-900 flex items-center gap-2.5 font-medium transition-colors"
                  >
                    <Archive className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-emerald-800">Download Both Sides (ZIP)</p>
                      <p className="text-[10px] text-surface-500">Front & Back JPG in 300 DPI</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleExportSingleSideJpg('front')}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-50 flex items-center gap-2.5 text-surface-700 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                    <span>Front Side Only (JPG)</span>
                  </button>

                  {doc.layouts.back && (
                    <button
                      onClick={() => handleExportSingleSideJpg('back')}
                      className="w-full text-left px-3 py-1.5 hover:bg-surface-50 flex items-center gap-2.5 text-surface-700 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                      <span>Back Side Only (JPG)</span>
                    </button>
                  )}

                  {availableSampleRecords.length > 1 && (
                    <>
                      <div className="h-px bg-surface-100 my-1" />
                      <button
                        onClick={handleExportBulkAllJpgZip}
                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-indigo-700 flex items-center gap-2.5 font-semibold transition-colors"
                      >
                        <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <p>Bulk Download All ({availableSampleRecords.length} Cards ZIP)</p>
                          <p className="text-[10px] text-indigo-500 font-normal">All students Front & Back JPG in ZIP</p>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Export PDF Button */}
          <button
            onClick={handleQuickExport}
            disabled={isExporting}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-700 hover:text-surface-900 bg-white border border-surface-300 hover:border-surface-400 rounded-lg shadow-sm transition-colors disabled:opacity-50 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : 'Preview PDF'}</span>
          </button>

          {/* Save Template Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 ${
              saveStatus?.includes('Saved')
                ? 'bg-emerald-600 text-white'
                : 'text-white bg-brand-600 hover:bg-brand-700'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveStatus || 'Save Changes'}</span>
          </button>
        </div>
      </header>

      {/* CREATE FORM FROM TEMPLATE MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-surface-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between bg-surface-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-surface-900">
                    {generatedFormSlug ? 'Public Form Created!' : 'Generate Form from Template'}
                  </h3>
                  <p className="text-xs text-surface-500">
                    {generatedFormSlug
                      ? 'Share this public link with students to collect records automatically.'
                      : 'All placeholders in your ID template have been mapped into form input fields.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              {generatedFormSlug ? (
                /* Success View */
                <div className="space-y-5 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-surface-900">Public Registration Form is Live!</h4>
                    <p className="text-xs text-surface-600 max-w-md mx-auto mt-1">
                      Candidates can now visit this form on mobile or desktop to fill their details, pick dropdowns, verify PIN code, and upload photos.
                    </p>
                  </div>

                  {/* Shareable Link Box */}
                  <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 flex items-center justify-between gap-2 max-w-lg mx-auto">
                    <span className="text-xs font-mono text-surface-700 truncate text-left flex-1">
                      {window.location.origin}/form/{generatedFormSlug}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <a
                      href={`/form/${generatedFormSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-surface-900 hover:bg-surface-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span>Open Live Form</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => {
                        setShowFormModal(false);
                        navigate('/forms');
                      }}
                      className="px-4 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      View All Forms
                    </button>
                  </div>
                </div>
              ) : (
                /* Form Configuration View */
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-surface-700 block mb-1">Form Title</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm bg-white font-medium outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-surface-700 block mb-1">Student Instructions / Description</label>
                    <textarea
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Form Fields List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-surface-700">
                        Fields Mapped from Template ({extractedFields.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newKey = `extra_field_${extractedFields.length + 1}`;
                          setExtractedFields([
                            ...extractedFields,
                            { key: newKey, label: 'Extra Field', type: 'text', required: false },
                          ]);
                        }}
                        className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Field
                      </button>
                    </div>

                    <div className="border border-surface-200 rounded-xl divide-y divide-surface-100 max-h-64 overflow-y-auto bg-surface-50">
                      {extractedFields.map((field, idx) => (
                        <div key={idx} className="p-2.5 flex items-center gap-2 hover:bg-white transition-colors">
                          <span className="w-5 text-center text-xs font-mono text-surface-400">{idx + 1}</span>

                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => {
                                const next = [...extractedFields];
                                next[idx].label = e.target.value;
                                setExtractedFields(next);
                              }}
                              className="w-full px-2 py-1 text-xs font-medium border border-surface-200 rounded bg-white outline-none focus:border-brand-500"
                              placeholder="Field Label"
                            />
                            <span className="text-[10px] font-mono text-surface-400 block mt-0.5 px-1 truncate">
                              Tag: {`{{${field.key}}}`}
                            </span>
                          </div>

                          {/* Field Type Selector */}
                          <select
                            value={field.type}
                            onChange={(e) => {
                              const next = [...extractedFields];
                              next[idx].type = e.target.value as FormFieldType;
                              if (e.target.value === 'select' && (!next[idx].options || next[idx].options?.length === 0)) {
                                next[idx].options = ['Option 1', 'Option 2'];
                              }
                              setExtractedFields(next);
                            }}
                            className="px-2 py-1 text-xs border border-surface-200 rounded bg-white text-surface-700 font-medium outline-none"
                          >
                            <option value="text">Text (Single Line)</option>
                            <option value="number">Number (Roll No, Age)</option>
                            <option value="select">Dropdown (Select Choice)</option>
                            <option value="india_address">India Address (API + State/District)</option>
                            <option value="india_pincode">India PIN Code (API)</option>
                            <option value="india_state">India State (36 States/UTs)</option>
                            <option value="india_district">India District (Cascading)</option>
                            <option value="date">Date Picker (DOB)</option>
                            <option value="textarea">Multi-line Address</option>
                            <option value="image_upload">Portrait Photo</option>
                            <option value="phone">Phone / WhatsApp</option>
                            <option value="email">Email</option>
                          </select>

                          {/* Required Toggle */}
                          <label className="flex items-center gap-1 text-[11px] text-surface-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => {
                                const next = [...extractedFields];
                                next[idx].required = e.target.checked;
                                setExtractedFields(next);
                              }}
                              className="rounded text-brand-600"
                            />
                            <span>Req</span>
                          </label>

                          {/* Delete Field */}
                          <button
                            type="button"
                            onClick={() => {
                              setExtractedFields(extractedFields.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-surface-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!generatedFormSlug && (
              <div className="px-6 py-3.5 border-t border-surface-200 bg-surface-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-surface-300 rounded-lg text-xs font-semibold text-surface-700 hover:bg-surface-100 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleGenerateFormSubmit}
                  disabled={isGeneratingForm || extractedFields.length === 0}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <span>{isGeneratingForm ? 'Creating Form...' : 'Generate & Publish Form'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Record Information Editor Modal */}
      {showRecordEditorModal && (
        <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card border border-surface-200 w-full max-w-lg max-h-[90vh] flex flex-col p-6 relative">
            <button
              onClick={() => setShowRecordEditorModal(false)}
              className="absolute top-4 right-4 text-surface-400 hover:text-surface-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-surface-900">Live Preview & Record Data</h2>
            </div>
            <p className="text-xs text-surface-500 mb-4">
              Edit any information in real time to see both Front & Back card sides auto-adjust their font size and layout.
            </p>

            {(() => {
              const activeRec = availableSampleRecords[sampleRecordIndex] || {};
              return (
                <div className="space-y-3 overflow-y-auto pr-1 flex-1 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-surface-700 block mb-1">Full Legal Name</label>
                      <input
                        type="text"
                        value={activeRec.student_name || activeRec.full_name || ''}
                        onChange={(e) => updateCurrentSampleRecord({ student_name: e.target.value, full_name: e.target.value })}
                        placeholder="e.g. Rahul Kumar Varma"
                        className="w-full px-2.5 py-1.5 border border-surface-300 rounded-lg bg-white outline-none focus:border-brand-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-surface-700 block mb-1">Roll Number</label>
                      <input
                        type="text"
                        value={activeRec.roll_no || activeRec.student_roll || ''}
                        onChange={(e) => updateCurrentSampleRecord({ roll_no: e.target.value, student_roll: e.target.value })}
                        placeholder="e.g. 148"
                        className="w-full px-2.5 py-1.5 border border-surface-300 rounded-lg bg-white outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-surface-700 block mb-1">Academic Session</label>
                      <input
                        type="text"
                        value={activeRec.session || ''}
                        onChange={(e) => updateCurrentSampleRecord({ session: e.target.value })}
                        placeholder="e.g. 2026-28"
                        className="w-full px-2.5 py-1.5 border border-surface-300 rounded-lg bg-white outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-surface-700 block mb-1">Blood Group</label>
                      <input
                        type="text"
                        value={activeRec.blood_group || ''}
                        onChange={(e) => updateCurrentSampleRecord({ blood_group: e.target.value })}
                        placeholder="e.g. AB-"
                        className="w-full px-2.5 py-1.5 border border-surface-300 rounded-lg bg-white outline-none focus:border-brand-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-surface-700 block mb-1">Father's Name (Back Side)</label>
                      <input
                        type="text"
                        value={activeRec.father_name || activeRec.Father_name || ''}
                        onChange={(e) => updateCurrentSampleRecord({ father_name: e.target.value, Father_name: e.target.value })}
                        placeholder="e.g. Dilip Paswan"
                        className="w-full px-2.5 py-1.5 border border-surface-300 rounded-lg bg-white outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-surface-700 block mb-1">Date of Birth (Back Side)</label>
                      <input
                        type="text"
                        value={activeRec.dob || ''}
                        onChange={(e) => updateCurrentSampleRecord({ dob: e.target.value })}
                        placeholder="e.g. 08-03-2003"
                        className="w-full px-2.5 py-1.5 border border-surface-300 rounded-lg bg-white outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-surface-700 block mb-1">Mobile Number (Back Side)</label>
                      <input
                        type="text"
                        value={activeRec.mobile || activeRec.Mobile_number || ''}
                        onChange={(e) => updateCurrentSampleRecord({ mobile: e.target.value, Mobile_number: e.target.value })}
                        placeholder="e.g. 9876543210"
                        className="w-full px-2.5 py-1.5 border border-surface-300 rounded-lg bg-white outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-surface-700 block mb-1">Police Station (Back Side)</label>
                      <input
                        type="text"
                        value={activeRec.police_station || ''}
                        onChange={(e) => updateCurrentSampleRecord({ police_station: e.target.value })}
                        placeholder="e.g. NTPC, Barh"
                        className="w-full px-2.5 py-1.5 border border-surface-300 rounded-lg bg-white outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-surface-700 block mb-1">Village / Address (Back Side)</label>
                      <input
                        type="text"
                        value={activeRec.address || activeRec.full_address || ''}
                        onChange={(e) => updateCurrentSampleRecord({ address: e.target.value, full_address: e.target.value })}
                        placeholder="e.g. Vill+PO- Railli"
                        className="w-full px-2.5 py-1.5 border border-surface-300 rounded-lg bg-white outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-surface-700 block mb-1">City / District (Back Side)</label>
                      <input
                        type="text"
                        value={activeRec.district || activeRec.city || ''}
                        onChange={(e) => updateCurrentSampleRecord({ district: e.target.value, city: e.target.value })}
                        placeholder="e.g. Patna-803221"
                        className="w-full px-2.5 py-1.5 border border-surface-300 rounded-lg bg-white outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-surface-700 block mb-1">Photo Image URL</label>
                    <input
                      type="text"
                      value={activeRec.photo_url || ''}
                      onChange={(e) => updateCurrentSampleRecord({ photo_url: e.target.value })}
                      placeholder="https://... or /templates/ptec/ptec_sample_front.jpg"
                      className="w-full px-2.5 py-1.5 border border-surface-300 rounded-lg bg-white outline-none focus:border-brand-500 text-[11px] font-mono"
                    />
                  </div>
                </div>
              );
            })()}

            <div className="pt-3 border-t border-surface-200 mt-4 flex items-center justify-between">
              <span className="text-[11px] text-emerald-700 font-medium">✓ Changes apply live to card preview</span>
              <button
                type="button"
                onClick={() => setShowRecordEditorModal(false)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
