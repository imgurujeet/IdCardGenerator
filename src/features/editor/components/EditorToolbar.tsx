import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Save,
  Download,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { templateService } from '../../../services/template.service';
import { generateSingleCardPdf } from '../../generation/renderer/pdfExporter';
import { triggerDownload } from '../../../lib/utils';

export const EditorToolbar: React.FC = () => {
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
    markSaved,
  } = useEditorStore();

  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!doc) return null;

  const handleSave = async () => {
    try {
      setSaveStatus('Saving...');
      await templateService.saveTemplateVersion(doc.id, doc, true);
      markSaved();
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch {
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

  return (
    <header className="h-14 bg-white border-b border-surface-200 px-4 flex items-center justify-between shrink-0 select-none z-20">
      {/* Left: Template Title & Dirty State */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-600" />
          <h1 className="font-semibold text-surface-900 text-sm tracking-tight">{doc.name}</h1>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-100 text-surface-600 border border-surface-200">
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

      {/* Right: Data Switcher, Quick Export & Save */}
      <div className="flex items-center gap-2">
        {/* Sample Record Preview Selector */}
        <div className="flex items-center gap-1.5 text-xs bg-surface-50 border border-surface-200 px-2 py-1 rounded-lg">
          <Users className="w-3.5 h-3.5 text-surface-500" />
          <span className="text-surface-500 font-medium hidden sm:inline">Preview Data:</span>
          <select
            value={sampleRecordIndex}
            onChange={(e) => setSampleRecordIndex(Number(e.target.value))}
            className="bg-transparent font-medium text-surface-900 outline-none cursor-pointer"
          >
            {availableSampleRecords.map((rec, i) => (
              <option key={i} value={i}>
                {rec.student_name || rec.employee_name || rec.full_name || `Record #${i + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Export PDF Button */}
        <button
          onClick={handleQuickExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-700 hover:text-surface-900 bg-white border border-surface-300 hover:border-surface-400 rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Generating...' : 'Preview PDF'}</span>
        </button>

        {/* Save Template Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saveStatus || 'Save Changes'}</span>
        </button>
      </div>
    </header>
  );
};
