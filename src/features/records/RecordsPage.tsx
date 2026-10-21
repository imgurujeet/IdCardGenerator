import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Papa from 'papaparse';
import {
  Plus,
  Upload,
  Search,
  Printer,
  X,
  FileSpreadsheet,
  Loader2,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { organizationService } from '../../services/organization.service';
import { recordService } from '../../services/record.service';
import { templateService } from '../../services/template.service';
import { RecordEntity, TemplateEntity } from '../../types/database';
import { CSVColumnMapping } from '../../types/record';
import { generateSingleCardPdf, generatePrintSheetPdf } from '../generation/renderer/pdfExporter';
import { generateIndividualCardsZip } from '../generation/renderer/zipExporter';
import { triggerDownload } from '../../lib/utils';
import { PTEC_TEMPLATE_DOC } from '../../services/mockData';

export const RecordsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<RecordEntity[]>([]);
  const [templates, setTemplates] = useState<TemplateEntity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Add Record Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addIdentifier, setAddIdentifier] = useState('');
  const [addClass, setAddClass] = useState('');
  const [addBlood, setAddBlood] = useState('O+');
  const [addPhoto, setAddPhoto] = useState('');

  // CSV Import Modal
  const [showImportModal, setShowImportModal] = useState(searchParams.get('import') === 'true');
  const [csvStep, setCsvStep] = useState<1 | 2 | 3>(1);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvMappings, setCsvMappings] = useState<CSVColumnMapping[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Generation Modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [genTemplateId, setGenTemplateId] = useState<string>('');
  const [genMode, setGenMode] = useState<'print_sheet' | 'bulk_zip'>('print_sheet');
  const [includeBack, setIncludeBack] = useState(true);
  const [genProgress, setGenProgress] = useState<{ current: number; total: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const orgId = organizationService.getActiveOrgId();

  const loadData = async () => {
    try {
      const [recData, tmplData] = await Promise.all([
        recordService.getRecords(orgId, { search: searchQuery, status: statusFilter }),
        templateService.getTemplates(orgId),
      ]);
      setRecords(recData.records);
      setTemplates(tmplData);
      if (tmplData.length > 0 && !genTemplateId) {
        setGenTemplateId(tmplData[0].id);
      }
    } catch (e) {
      console.error('Failed to load records:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter, orgId]);

  // Bulk Selection
  const toggleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Add Record Action
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addIdentifier.trim()) return;

    await recordService.createRecord(orgId, {
      fullName: addName,
      identifier: addIdentifier,
      data: {
        student_name: addName,
        student_id: addIdentifier,
        grade: addClass,
        blood_group: addBlood,
        photo_url: addPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      },
      status: 'approved',
    });

    setShowAddModal(false);
    setAddName('');
    setAddIdentifier('');
    loadData();
  };

  // CSV File Handler
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = (results.data as Record<string, string>[]).filter((r) => Object.keys(r).length > 0);

        setCsvRows(rows);

        // Pre-populate smart mappings
        const initialMappings: CSVColumnMapping[] = headers.map((h) => {
          const lower = h.toLowerCase().trim();
          let target = 'custom_field';
          let req = false;

          if (lower.includes('name')) {
            target = 'student_name';
            req = true;
          } else if (lower.includes('id') || lower.includes('roll') || lower.includes('code')) {
            target = 'student_id';
            req = true;
          } else if (lower.includes('class') || lower.includes('grade')) {
            target = 'grade';
          } else if (lower.includes('blood')) {
            target = 'blood_group';
          } else if (lower.includes('photo') || lower.includes('image')) {
            target = 'photo_url';
          } else if (lower.includes('phone') || lower.includes('contact')) {
            target = 'emergency_contact';
          }

          return { csvHeader: h, targetFieldKey: target, required: req };
        });

        setCsvMappings(initialMappings);
        setCsvStep(2);
      },
    });
  };

  const handleCommitImport = async () => {
    try {
      setIsImporting(true);
      await recordService.importCSVRecords(orgId, csvRows, csvMappings);
      setShowImportModal(false);
      setCsvStep(1);
      loadData();
    } catch (e) {
      console.error('Import error:', e);
    } finally {
      setIsImporting(false);
    }
  };

  // Bulk Generation Execution
  const handleExecuteGeneration = async () => {
    if (!genTemplateId) return;

    try {
      setIsGenerating(true);
      const targetRecords =
        selectedIds.length > 0
          ? records.filter((r) => selectedIds.includes(r.id)).map((r) => r.data)
          : records.filter((r) => r.status === 'approved').map((r) => r.data);

      if (targetRecords.length === 0) {
        alert('No eligible records selected for card generation.');
        return;
      }

      setGenProgress({ current: 0, total: targetRecords.length });

      // Load active template version
      const tmplRes = await templateService.getTemplateById(genTemplateId);
      const doc = tmplRes?.activeVersion?.design_data || PTEC_TEMPLATE_DOC;

      if (genMode === 'print_sheet') {
        // Multi-up A4 Print Sheet
        const pdfBytes = await generatePrintSheetPdf(
          doc,
          targetRecords,
          {
            pageSize: 'A4',
            orientation: 'portrait',
            columns: 2,
            rows: 4,
            marginMm: 10,
            spacingMm: 5,
            includeCropMarks: true,
            duplexMode: 'simplex',
          },
          includeBack,
          (completed, total) => setGenProgress({ current: completed, total })
        );

        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        triggerDownload(blob, `ID_Print_Sheet_${doc.name.replace(/\s+/g, '_')}_A4.pdf`);
      } else {
        // Bulk ZIP Archive
        const zipBlob = await generateIndividualCardsZip(
          doc,
          targetRecords,
          'png',
          includeBack,
          (completed, total) => setGenProgress({ current: completed, total })
        );
        triggerDownload(zipBlob, `ID_Cards_Bundle_${doc.name.replace(/\s+/g, '_')}.zip`);
      }

      setShowGenModal(false);
    } catch (err) {
      console.error('Batch generation failed:', err);
      alert('Generation error: ' + (err as any).message);
    } finally {
      setIsGenerating(false);
      setGenProgress(null);
    }
  };

  // Single Card Download Helper
  const handleDownloadSingleCard = async (record: RecordEntity) => {
    try {
      const tmplRes = await templateService.getTemplateById(templates[0]?.id || '');
      const doc = tmplRes?.activeVersion?.design_data || PTEC_TEMPLATE_DOC;
      const pdfBytes = await generateSingleCardPdf(doc, record.data, true);
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      triggerDownload(blob, `${record.identifier}_${record.full_name.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  // Delete Handlers
  const handleDeleteRecord = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the record for "${name}"?`)) return;
    try {
      await recordService.deleteRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch (e) {
      console.error('Failed to delete record:', e);
      alert('Could not delete record.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected record(s)?`)) return;
    try {
      await recordService.bulkDeleteRecords(selectedIds);
      const set = new Set(selectedIds);
      setRecords((prev) => prev.filter((r) => !set.has(r.id)));
      setSelectedIds([]);
    } catch (e) {
      console.error('Failed bulk delete:', e);
      alert('Could not delete selected records.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Record Management</h1>
          <p className="text-sm text-surface-500 mt-1">
            Maintain student and employee datasets, import CSV spreadsheets, and initiate print jobs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setCsvStep(1);
              setShowImportModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-surface-700 bg-white border border-surface-300 hover:border-surface-400 rounded-lg shadow-subtle transition-colors"
          >
            <Upload className="w-4 h-4 text-surface-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-subtle transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Record</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-surface-200 shadow-subtle">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search by name or identifier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-surface-900 placeholder:text-surface-400 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500 font-medium">Status:</span>
          {(['all', 'approved', 'pending'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-surface-900 text-white'
                  : 'text-surface-600 hover:bg-surface-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-subtle overflow-hidden relative">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-50 border-b border-surface-200 text-surface-600 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-5 py-3 w-10">
                <input
                  type="checkbox"
                  checked={records.length > 0 && selectedIds.length === records.length}
                  onChange={toggleSelectAll}
                  className="rounded text-brand-600 cursor-pointer"
                />
              </th>
              <th className="px-5 py-3">Photo</th>
              <th className="px-5 py-3">Full Legal Name</th>
              <th className="px-5 py-3">Identifier (ID)</th>
              <th className="px-5 py-3">Class / Details</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Card Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {records.map((rec) => {
              const isSelected = selectedIds.includes(rec.id);
              const photo = rec.data['photo_url'] || rec.data['photo'] || rec.data['image'];

              return (
                <tr
                  key={rec.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-brand-50/50' : 'hover:bg-surface-50/70'
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(rec.id)}
                      className="rounded text-brand-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    {photo ? (
                      <img
                        src={photo}
                        alt={rec.full_name}
                        className="w-9 h-11 object-cover rounded border border-surface-200 shadow-xs"
                      />
                    ) : (
                      <div className="w-9 h-11 rounded bg-surface-100 flex items-center justify-center text-[9px] text-surface-400 border border-surface-200">
                        No Pic
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-surface-900 text-sm">
                    {rec.full_name}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-surface-600">
                    {rec.identifier}
                  </td>
                  <td className="px-5 py-3.5 text-surface-600">
                    {rec.data['grade'] && <span>{rec.data['grade']} • </span>}
                    {rec.data['session'] && <span>{rec.data['session']} • </span>}
                    {rec.data['Father_name'] && <span className="text-surface-500">F: {rec.data['Father_name']} • </span>}
                    {rec.data['blood_group'] && (
                      <span className="font-semibold text-red-600">{rec.data['blood_group']}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 capitalize text-surface-500 text-[11px]">
                    {rec.source.replace('_', ' ')}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        rec.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleDownloadSingleCard(rec)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-surface-700 hover:text-brand-700 bg-white hover:bg-brand-50 border border-surface-300 rounded-md shadow-xs transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-brand-600" />
                        <span>Print PDF</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(rec.id, rec.full_name)}
                        title="Delete record"
                        className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-md border border-transparent hover:border-red-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="sticky bottom-4 left-1/2 -translate-x-1/2 w-max max-w-lg bg-surface-900 text-white rounded-xl shadow-card px-5 py-3 flex items-center justify-between gap-4 z-30 mx-auto border border-surface-700">
            <span className="text-xs font-medium">
              <span className="font-bold text-brand-400">{selectedIds.length}</span> records selected
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGenModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Batch Print Cards</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedIds.length})</span>
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-surface-400 hover:text-white px-2 py-1"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Single Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card border border-surface-200 w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-surface-400 hover:text-surface-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-surface-900 mb-1">Add Single Record</h2>
            <p className="text-xs text-surface-500 mb-5">
              Enter individual student or employee details manually into your workspace.
            </p>

            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Benjamin Ross"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">Identifier (ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OA-2026-109"
                    value={addIdentifier}
                    onChange={(e) => setAddIdentifier(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs outline-none focus:border-brand-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">Class / Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Grade 11 - A"
                    value={addClass}
                    onChange={(e) => setAddClass(e.target.value)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">Blood Group</label>
                <select
                  value={addBlood}
                  onChange={(e) => setAddBlood(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs outline-none focus:border-brand-500 bg-white"
                >
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">Photo Image URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={addPhoto}
                  onChange={(e) => setAddPhoto(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-surface-600 hover:text-surface-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Wizard Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card border border-surface-200 w-full max-w-2xl p-6 relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-4 right-4 text-surface-400 hover:text-surface-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-surface-900">Import Records via CSV</h2>
            </div>
            <p className="text-xs text-surface-500 mb-5">
              Step {csvStep} of 2: {csvStep === 1 ? 'Upload CSV Spreadsheet' : 'Map Columns to Card Fields'}
            </p>

            {csvStep === 1 && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-surface-300 rounded-xl p-8 text-center bg-surface-50 hover:bg-surface-100 transition-colors cursor-pointer relative">
                  <Upload className="w-8 h-8 text-surface-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-surface-800">
                    Click to browse or drop your CSV file here
                  </p>
                  <p className="text-[11px] text-surface-400 mt-1">
                    Supports comma-delimited (.csv) files up to 10,000 rows
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-surface-100 rounded-lg text-xs text-surface-600 flex items-center justify-between">
                  <span>Need a ready-made sample template?</span>
                  <button
                    onClick={() => {
                      const sampleCsv = `Full Name,Student ID,Class,Section,Blood Group,Phone\nEleanor Vance,OA-2026-101,Grade 11,A,A+,+1 (555) 019-2834\nLucas Montgomery,OA-2026-102,Grade 11,B,O-,+1 (555) 019-8765\n`;
                      const blob = new Blob([sampleCsv], { type: 'text/csv' });
                      triggerDownload(blob, 'sample_id_cards_dataset.csv');
                    }}
                    className="font-semibold text-brand-600 hover:text-brand-700 underline text-xs"
                  >
                    Download Sample CSV
                  </button>
                </div>
              </div>
            )}

            {csvStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-surface-600">
                  Detected <span className="font-bold text-surface-900">{csvRows.length}</span> rows in your file.
                  Confirm matching fields:
                </p>

                <div className="max-h-60 overflow-y-auto border border-surface-200 rounded-lg divide-y divide-surface-100">
                  {csvMappings.map((m, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-surface-800 w-1/3 truncate">
                        {m.csvHeader}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-surface-400 shrink-0 mx-2" />
                      <select
                        value={m.targetFieldKey}
                        onChange={(e) => {
                          const updated = [...csvMappings];
                          updated[idx].targetFieldKey = e.target.value;
                          setCsvMappings(updated);
                        }}
                        className="w-1/2 px-2.5 py-1 border border-surface-300 rounded text-xs bg-white outline-none focus:border-brand-500"
                      >
                        <option value="student_name">Full Legal Name</option>
                        <option value="student_id">Student / Employee ID</option>
                        <option value="grade">Class / Grade</option>
                        <option value="section">Section</option>
                        <option value="blood_group">Blood Group</option>
                        <option value="emergency_contact">Emergency Phone</option>
                        <option value="photo_url">Photo URL</option>
                        <option value="custom_field">Generic Field</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-surface-100">
                  <button
                    onClick={() => setCsvStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-surface-600 hover:text-surface-900"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCommitImport}
                    disabled={isImporting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing Records...</span>
                      </>
                    ) : (
                      <span>Commit {csvRows.length} Records</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batch Generation Dialog */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card border border-surface-200 w-full max-w-lg p-6 relative">
            <button
              onClick={() => setShowGenModal(false)}
              className="absolute top-4 right-4 text-surface-400 hover:text-surface-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Printer className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-surface-900">Batch Card Generation</h2>
            </div>
            <p className="text-xs text-surface-500 mb-5">
              Rendering {selectedIds.length > 0 ? selectedIds.length : records.length} ID cards in print-quality 300 DPI.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-surface-700 block mb-1">Select ID Template</label>
                <select
                  value={genTemplateId}
                  onChange={(e) => setGenTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white outline-none focus:border-brand-500"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-surface-700 block mb-1">Export Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGenMode('print_sheet')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      genMode === 'print_sheet'
                        ? 'border-brand-500 bg-brand-50 text-brand-900 font-semibold'
                        : 'border-surface-200 text-surface-700 hover:bg-surface-50'
                    }`}
                  >
                    <p className="font-semibold">A4 Print Sheet (PDF)</p>
                    <p className="text-[10px] text-surface-500 font-normal mt-0.5">
                      2x4 grid, duplex-ready, standard sheet printing
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenMode('bulk_zip')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      genMode === 'bulk_zip'
                        ? 'border-brand-500 bg-brand-50 text-brand-900 font-semibold'
                        : 'border-surface-200 text-surface-700 hover:bg-surface-50'
                    }`}
                  >
                    <p className="font-semibold">Individual Files (ZIP)</p>
                    <p className="text-[10px] text-surface-500 font-normal mt-0.5">
                      1 high-res file per student inside archive
                    </p>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                  <input
                    type="checkbox"
                    checked={includeBack}
                    onChange={(e) => setIncludeBack(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Include Card Backside Layout (Duplex Flip)</span>
                </label>
              </div>

              {/* Progress Indicator */}
              {genProgress && (
                <div className="p-3 bg-brand-50 rounded-lg border border-brand-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-brand-900">
                    <span>Processing Batch...</span>
                    <span>
                      {genProgress.current} / {genProgress.total} cards
                    </span>
                  </div>
                  <div className="w-full bg-brand-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-600 h-full transition-all duration-300"
                      style={{ width: `${(genProgress.current / genProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-surface-600 hover:text-surface-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteGeneration}
                  disabled={isGenerating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Output...</span>
                    </>
                  ) : (
                    <span>Start Batch Generation</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
