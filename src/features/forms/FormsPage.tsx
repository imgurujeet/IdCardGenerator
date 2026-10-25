import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  Plus,
  Copy,
  ExternalLink,
  Users,
  Check,
  X,
  Trash2,
  Palette,
  Edit3,
  Sparkles,
} from 'lucide-react';
import { organizationService } from '../../services/organization.service';
import { formService } from '../../services/form.service';
import { FormEntity } from '../../types/database';
import { FormFieldDefinition, FormFieldType } from '../../types/form';
import { generateId } from '../../lib/utils';
import { subscribeToSync } from '../../lib/sync';

export const FormsPage: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormEntity[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Form Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [fields, setFields] = useState<FormFieldDefinition[]>([
    {
      id: generateId('field'),
      key: 'student_name',
      label: 'Full Legal Name',
      placeholder: 'e.g. John Doe',
      type: 'text',
      validation: { required: true },
      order: 1,
    },
    {
      id: generateId('field'),
      key: 'roll_no',
      label: 'College Roll Number',
      placeholder: 'e.g. 101',
      type: 'number',
      validation: { required: true },
      order: 2,
    },
    {
      id: generateId('field'),
      key: 'photo_url',
      label: 'Passport Photo',
      helpText: 'Color portrait with neutral background',
      type: 'image_upload',
      validation: { required: true, maxFileSizeMb: 5 },
      order: 3,
    },
  ]);
  const [autoApprove, setAutoApprove] = useState(true);
  const [enforceUnique, setEnforceUnique] = useState(true);
  const [uniqueFieldKey, setUniqueFieldKey] = useState('roll_no');
  const [isSaving, setIsSaving] = useState(false);

  const orgId = organizationService.getActiveOrgId();

  const loadForms = async () => {
    try {
      const data = await formService.getForms(orgId);
      setForms(data);
    } catch (e) {
      console.error('Failed to load forms:', e);
    }
  };

  useEffect(() => {
    loadForms();
  }, [orgId]);

  useEffect(() => {
    const unsubscribe = subscribeToSync((payload) => {
      if (
        payload.type === 'FORMS_UPDATED' ||
        payload.type === 'ALL' ||
        payload.type === 'SUBMISSIONS_UPDATED'
      ) {
        loadForms();
      }
    });
    return unsubscribe;
  }, [orgId]);

  const copyPublicLink = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleOpenCreate = () => {
    setEditingFormId(null);
    setFormTitle('');
    setFormDesc('');
    setFields([
      {
        id: generateId('field'),
        key: 'student_name',
        label: 'Full Legal Name',
        placeholder: 'e.g. John Doe',
        type: 'text',
        validation: { required: true },
        order: 1,
      },
      {
        id: generateId('field'),
        key: 'roll_no',
        label: 'College Roll Number',
        placeholder: 'e.g. 101',
        type: 'number',
        validation: { required: true },
        order: 2,
      },
      {
        id: generateId('field'),
        key: 'photo_url',
        label: 'Passport Photo',
        helpText: 'Color portrait with neutral background',
        type: 'image_upload',
        validation: { required: true, maxFileSizeMb: 5 },
        order: 3,
      },
    ]);
    setAutoApprove(true);
    setEnforceUnique(true);
    setUniqueFieldKey('roll_no');
    setShowBuilder(true);
  };

  const handleEditForm = (form: FormEntity) => {
    setEditingFormId(form.id);
    setFormTitle(form.title);
    setFormDesc(form.description || '');
    setFields(form.fields_schema && form.fields_schema.length > 0 ? JSON.parse(JSON.stringify(form.fields_schema)) : []);
    setAutoApprove(form.auto_approve ?? true);
    setEnforceUnique(form.enforce_unique ?? true);
    setUniqueFieldKey(form.unique_field_key || 'roll_no');
    setShowBuilder(true);
  };

  const handleAddField = () => {
    const newField: FormFieldDefinition = {
      id: generateId('field'),
      key: `field_${Date.now().toString(36)}`,
      label: 'New Field Question',
      type: 'text',
      validation: { required: false },
      order: fields.length + 1,
    };
    setFields([...fields, newField]);
  };

  const handleQuickAddField = (preset: { key: string; label: string; type: FormFieldType; placeholder?: string; options?: any[] }) => {
    // Avoid duplicate keys
    const existingIndex = fields.findIndex((f) => f.key === preset.key);
    if (existingIndex >= 0) {
      alert(`The field "${preset.label}" (${preset.key}) already exists in this form.`);
      return;
    }
    const newField: FormFieldDefinition = {
      id: generateId('field'),
      key: preset.key,
      label: preset.label,
      type: preset.type,
      placeholder: preset.placeholder,
      options: preset.options,
      validation: { required: true },
      order: fields.length + 1,
    };
    setFields([...fields, newField]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleUpdateField = (id: string, updates: Partial<FormFieldDefinition>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      setIsSaving(true);
      if (editingFormId) {
        // Update existing form options & dynamic fields
        await formService.updateForm(editingFormId, {
          title: formTitle,
          description: formDesc,
          auto_approve: autoApprove,
          enforce_unique: enforceUnique,
          unique_field_key: uniqueFieldKey,
          fields_schema: fields,
        });
      } else {
        // Create new form
        await formService.createForm(orgId, {
          title: formTitle,
          description: formDesc,
          auto_approve: autoApprove,
          enforce_unique: enforceUnique,
          unique_field_key: uniqueFieldKey,
          fields,
        });
      }
      setShowBuilder(false);
      setEditingFormId(null);
      setFormTitle('');
      setFormDesc('');
      loadForms();
    } catch (e) {
      console.error('Failed to save form:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteForm = async (formId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the form "${title}"?`)) return;
    try {
      await formService.deleteForm(formId);
      setForms((prev) => prev.filter((f) => f.id !== formId));
    } catch (e) {
      console.error('Failed to delete form:', e);
      alert('Could not delete form.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Data Collection Forms</h1>
          <p className="text-sm text-surface-500 mt-1">
            Build branded public response forms to gather photos and details directly into your database.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-subtle transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection Form</span>
        </button>
      </div>

      {/* Forms Table */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-subtle overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-50 border-b border-surface-200 text-surface-600 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-5 py-3">Form Title & Description</th>
              <th className="px-5 py-3">Public Share Link</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Fields</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {forms.map((form) => (
              <tr key={form.id} className="hover:bg-surface-50/70 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-semibold text-surface-900 text-sm">{form.title}</p>
                  <p className="text-surface-500 text-xs mt-0.5 line-clamp-1">
                    {form.description || 'Public submission form for ID card processing.'}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-surface-600 bg-surface-100 px-2 py-0.5 rounded border border-surface-200">
                      /form/{form.public_slug}
                    </span>
                    <button
                      onClick={() => copyPublicLink(form.public_slug)}
                      title="Copy public URL"
                      className="p-1 text-surface-500 hover:text-brand-600 rounded transition-colors"
                    >
                      {copiedSlug === form.public_slug ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => window.open(`/form/${form.public_slug}`, '_blank')}
                      title="Open in new tab"
                      className="p-1 text-surface-500 hover:text-brand-600 rounded transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      form.is_published
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-surface-100 text-surface-600 border border-surface-200'
                    }`}
                  >
                    {form.is_published ? 'Published & Active' : 'Draft'}
                  </span>
                </td>
                <td className="px-5 py-4 font-medium text-surface-700">
                  {form.fields_schema.length} fields
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEditForm(form)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg text-xs transition-colors border border-amber-200 shadow-2xs"
                      title="Update form questions, fields, and options"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Edit Form</span>
                    </button>
                    <button
                      onClick={() => navigate(`/forms/${form.id}/submissions`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded-lg text-xs transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Submissions</span>
                    </button>
                    <button
                      onClick={() => navigate(`/editor/new?formId=${form.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 hover:bg-surface-200 text-surface-800 font-semibold rounded-lg text-xs transition-colors border border-surface-200"
                      title="Design custom ID card template matching this form"
                    >
                      <Palette className="w-3.5 h-3.5 text-brand-600" />
                      <span>Design ID Card</span>
                    </button>
                    <button
                      onClick={() => handleDeleteForm(form.id, form.title)}
                      title="Delete Form"
                      className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-md border border-transparent hover:border-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card border border-surface-200 w-full max-w-2xl max-h-[90vh] flex flex-col p-6 relative">
            <button
              onClick={() => setShowBuilder(false)}
              className="absolute top-4 right-4 text-surface-400 hover:text-surface-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <FileCheck2 className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-surface-900">
                {editingFormId ? 'Edit Data Collection Form' : 'Visual Form Builder'}
              </h2>
            </div>
            <p className="text-xs text-surface-500 mb-5">
              {editingFormId
                ? 'Update fields, options, and rules for this registration form.'
                : 'Customize input fields, required rules, and image upload settings.'}
            </p>

            <form onSubmit={handleCreateForm} className="flex-1 flex flex-col overflow-hidden">
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Form Metadata */}
                <div className="space-y-3 bg-surface-50 p-4 rounded-xl border border-surface-200">
                  <div>
                    <label className="text-xs font-semibold text-surface-700 block mb-1">Form Title</label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Student ID Photo & Details Registration"
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-surface-700 block mb-1">Instructions / Description</label>
                    <textarea
                      rows={2}
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Please enter your official student details and upload a passport-format photo."
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Submission & Approval Automation Settings */}
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                      Automation & Submission Controls
                    </span>
                    <span className="text-[11px] text-surface-500 font-medium">Hands-free workflows</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-start gap-2.5 p-3 rounded-lg border border-surface-200 bg-white cursor-pointer hover:border-brand-400 transition-colors">
                      <input
                        type="checkbox"
                        checked={autoApprove}
                        onChange={(e) => setAutoApprove(e.target.checked)}
                        className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-surface-900 flex items-center gap-1">
                          ⚡ Instant Auto-Approve
                        </span>
                        <span className="text-[11px] text-surface-500 block leading-tight mt-0.5">
                          Automatically approve submissions and create student records immediately without manual review.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-3 rounded-lg border border-surface-200 bg-white cursor-pointer hover:border-brand-400 transition-colors">
                      <input
                        type="checkbox"
                        checked={enforceUnique}
                        onChange={(e) => setEnforceUnique(e.target.checked)}
                        className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-surface-900 flex items-center gap-1">
                          🔒 Single Submission Per User
                        </span>
                        <span className="text-[11px] text-surface-500 block leading-tight mt-0.5">
                          Prevent duplicate submissions from the same phone number, email, or roll number.
                        </span>
                      </div>
                    </label>
                  </div>

                  {enforceUnique && (
                    <div className="flex items-center gap-3 pt-1 border-t border-surface-200/60">
                      <span className="text-xs font-semibold text-surface-700">Check uniqueness using:</span>
                      <select
                        value={uniqueFieldKey}
                        onChange={(e) => setUniqueFieldKey(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1.5 border border-surface-300 rounded-lg bg-white text-surface-800 outline-none focus:border-brand-500"
                      >
                        <option value="phone">Mobile / Phone Number (Recommended)</option>
                        <option value="email">Email Address</option>
                        <option value="student_id">Roll Number / Student ID</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Quick Add Information Fields Bar */}
                <div className="bg-brand-50/70 p-3.5 rounded-xl border border-brand-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-brand-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      <span>Quick Add Field Presets:</span>
                    </span>
                    <span className="text-[10px] text-brand-700 font-medium">Click any tag to add instantly</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickAddField({ key: 'student_name', label: 'Candidate Full Name', type: 'text', placeholder: 'Enter student full name' })}
                      className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      + Full Name
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddField({ key: 'roll_no', label: 'College Roll Number', type: 'number', placeholder: 'e.g. 148' })}
                      className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      + Roll Number
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddField({ key: 'session', label: 'Academic Session', type: 'select', options: ['2024-2026', '2023-2025', '2025-2027', '2026-2028'] })}
                      className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      + Session
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddField({ key: 'father_name', label: "Father's Name", type: 'text', placeholder: 'e.g. Dilip Paswan' })}
                      className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      + Father's Name
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddField({ key: 'mother_name', label: "Mother's Name", type: 'text', placeholder: 'e.g. Sunita Devi' })}
                      className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      + Mother's Name
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddField({ key: 'dob', label: 'Date of Birth (DD-MM-YYYY)', type: 'text', placeholder: 'e.g. 08-03-2003' })}
                      className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      + Date of Birth
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddField({ key: 'blood_group', label: 'Blood Group', type: 'select', options: ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'] })}
                      className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      + Blood Group
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddField({ key: 'mobile', label: 'Mobile Number (10 digits)', type: 'phone', placeholder: 'e.g. 9876543210' })}
                      className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      + Mobile Phone
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddField({ key: 'pincode', label: 'PIN Code (Auto-Detect City & State)', type: 'india_pincode', placeholder: 'e.g. 803221' })}
                      className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      + PIN Code (City & State)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddField({ key: 'address', label: 'Village / Street Address', type: 'text', placeholder: 'e.g. Vill+PO- Railli' })}
                      className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      + Village / Address
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddField({ key: 'police_station', label: 'Police Station (PS)', type: 'text', placeholder: 'e.g. NTPC, Barh' })}
                      className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      + Police Station
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddField({ key: 'photo_url', label: 'Passport Photo Upload', type: 'image_upload' })}
                      className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-300 text-brand-900 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                    >
                      + Photo Upload
                    </button>
                  </div>
                </div>

                {/* Fields Builder List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-surface-700">
                      Form Fields ({fields.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddField}
                      className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Custom Field</span>
                    </button>
                  </div>

                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="p-3 bg-white rounded-lg border border-surface-200 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-bold text-surface-400">#{idx + 1}</span>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                          placeholder="Field Question / Label"
                          className="flex-1 px-2.5 py-1.5 border border-surface-300 rounded text-xs font-semibold text-surface-900 outline-none focus:border-brand-500"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const newType = e.target.value as FormFieldType;
                            const updates: Partial<FormFieldDefinition> = { type: newType };
                            if (newType === 'india_address') {
                              if (!field.label || field.label.includes('Field')) updates.label = 'Complete Indian Address (API Auto-Detect)';
                              if (!field.key || field.key.startsWith('field_')) updates.key = 'address';
                            } else if (newType === 'india_pincode') {
                              if (!field.label || field.label.includes('Field')) updates.label = 'PIN Code (India Post API)';
                              if (!field.key || field.key.startsWith('field_')) updates.key = 'pincode';
                            } else if (newType === 'india_state') {
                              if (!field.label || field.label.includes('Field')) updates.label = 'State / UT';
                              if (!field.key || field.key.startsWith('field_')) updates.key = 'state';
                            } else if (newType === 'india_district') {
                              if (!field.label || field.label.includes('Field')) updates.label = 'District';
                              if (!field.key || field.key.startsWith('field_')) updates.key = 'district';
                            } else if (newType === 'number') {
                              if (!field.label || field.label.includes('Field')) updates.label = 'Roll Number';
                              if (!field.key || field.key.startsWith('field_')) updates.key = 'roll_no';
                            } else if (newType === 'date') {
                              if (!field.label || field.label.includes('Field')) updates.label = 'Date of Birth (D.O.B)';
                              if (!field.key || field.key.startsWith('field_')) updates.key = 'dob';
                            }
                            handleUpdateField(field.id, updates);
                          }}
                          className="px-2 py-1.5 border border-surface-300 rounded text-xs bg-surface-50 text-surface-700 font-medium outline-none"
                        >
                          <option value="text">Single Line Text</option>
                          <option value="number">Number (Roll No, Reg No)</option>
                          <option value="select">Dropdown Select (Session, Blood Group)</option>
                          <option value="india_address">India Address (State, District & PIN Code with API)</option>
                          <option value="india_pincode">India PIN Code (API Auto-Detect)</option>
                          <option value="india_state">India State (Dropdown of 36 States/UTs)</option>
                          <option value="india_district">India District (Cascading with State)</option>
                          <option value="date">Date (D.O.B, Admission)</option>
                          <option value="phone">Mobile / Phone Number</option>
                          <option value="textarea">Full Address (Multi-line)</option>
                          <option value="email">Email Address</option>
                          <option value="image_upload">Portrait Photo Upload</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(field.id)}
                          className="p-1.5 text-surface-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Dropdown Options Builder for Select fields */}
                      {field.type === 'select' && (
                        <div className="p-2.5 bg-brand-50/50 rounded-lg border border-brand-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-brand-900">
                              Dropdown Choices (Comma-Separated)
                            </span>
                            <span className="text-[10px] text-brand-600">Quick presets:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const opts = [
                                  { label: 'A+', value: 'A+' },
                                  { label: 'B+', value: 'B+' },
                                  { label: 'O+', value: 'O+' },
                                  { label: 'AB+', value: 'AB+' },
                                  { label: 'A-', value: 'A-' },
                                  { label: 'B-', value: 'B-' },
                                  { label: 'O-', value: 'O-' },
                                  { label: 'AB-', value: 'AB-' },
                                ];
                                handleUpdateField(field.id, {
                                  options: opts,
                                  label: field.label.includes('Field') ? 'Blood Group' : field.label,
                                  key: field.key.startsWith('field_') ? 'blood_group' : field.key,
                                });
                              }}
                              className="px-2 py-0.5 bg-white border border-brand-300 rounded text-[10px] text-brand-800 hover:bg-brand-100"
                            >
                              + Blood Group
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const opts = [
                                  { label: '2024-2026', value: '2024-2026' },
                                  { label: '2023-2025', value: '2023-2025' },
                                  { label: '2025-2027', value: '2025-2027' },
                                  { label: '2026-2028', value: '2026-2028' },
                                ];
                                handleUpdateField(field.id, {
                                  options: opts,
                                  label: field.label.includes('Field') ? 'Academic Session' : field.label,
                                  key: field.key.startsWith('field_') ? 'session' : field.key,
                                });
                              }}
                              className="px-2 py-0.5 bg-white border border-brand-300 rounded text-[10px] text-brand-800 hover:bg-brand-100"
                            >
                              + Academic Session
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const opts = [
                                  { label: 'D.El.Ed', value: 'D.El.Ed' },
                                  { label: 'B.Ed', value: 'B.Ed' },
                                  { label: 'B.A', value: 'B.A' },
                                  { label: 'B.Sc', value: 'B.Sc' },
                                  { label: 'BCA', value: 'BCA' },
                                ];
                                handleUpdateField(field.id, {
                                  options: opts,
                                  label: field.label.includes('Field') ? 'Course / Department' : field.label,
                                  key: field.key.startsWith('field_') ? 'course' : field.key,
                                });
                              }}
                              className="px-2 py-0.5 bg-white border border-brand-300 rounded text-[10px] text-brand-800 hover:bg-brand-100"
                            >
                              + Courses
                            </button>
                          </div>
                          <input
                            type="text"
                            value={field.options?.map((o) => o.label).join(', ') || ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const parsed = raw
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean)
                                .map((s) => ({ label: s, value: s }));
                              handleUpdateField(field.id, { options: parsed });
                            }}
                            placeholder="e.g. 2024-2026, 2023-2025, 2025-2027"
                            className="w-full px-2.5 py-1.5 bg-white border border-surface-300 rounded text-xs outline-none focus:border-brand-500 font-mono"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-surface-600">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.validation.required || false}
                            onChange={(e) =>
                              handleUpdateField(field.id, {
                                validation: { ...field.validation, required: e.target.checked },
                              })
                            }
                            className="rounded text-brand-600 focus:ring-brand-500"
                          />
                          <span>Required</span>
                        </label>

                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-surface-400">Data Key:</span>
                          <input
                            type="text"
                            value={field.key}
                            onChange={(e) => handleUpdateField(field.id, { key: e.target.value })}
                            className="font-mono text-[11px] px-1.5 py-0.5 border border-surface-300 rounded bg-surface-50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-4 pt-3 border-t border-surface-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBuilder(false)}
                  className="px-4 py-2 text-xs font-semibold text-surface-600 hover:text-surface-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Publishing...' : 'Publish Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
