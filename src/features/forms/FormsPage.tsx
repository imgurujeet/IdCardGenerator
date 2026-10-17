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
} from 'lucide-react';
import { organizationService } from '../../services/organization.service';
import { formService } from '../../services/form.service';
import { FormEntity } from '../../types/database';
import { FormFieldDefinition, FormFieldType } from '../../types/form';
import { generateId } from '../../lib/utils';

export const FormsPage: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormEntity[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // New Form Builder state
  const [showBuilder, setShowBuilder] = useState(false);
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
      key: 'student_id',
      label: 'Student / Employee ID',
      placeholder: 'e.g. STU-2026-001',
      type: 'text',
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
  const [uniqueFieldKey, setUniqueFieldKey] = useState('phone');
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

  const copyPublicLink = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
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
      await formService.createForm(orgId, {
        title: formTitle,
        description: formDesc,
        auto_approve: autoApprove,
        enforce_unique: enforceUnique,
        unique_field_key: uniqueFieldKey,
        fields,
      });
      setShowBuilder(false);
      setFormTitle('');
      setFormDesc('');
      loadForms();
    } catch (e) {
      console.error('Failed to create form:', e);
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
          onClick={() => setShowBuilder(true)}
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
                      onClick={() => navigate(`/forms/${form.id}/submissions`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded-lg text-xs transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>View Submissions</span>
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
              <h2 className="text-lg font-bold text-surface-900">Visual Form Builder</h2>
            </div>
            <p className="text-xs text-surface-500 mb-5">
              Customize input fields, required rules, and image upload settings.
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
                      <span>Add Field</span>
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
                          onChange={(e) => handleUpdateField(field.id, { type: e.target.value as FormFieldType })}
                          className="px-2 py-1.5 border border-surface-300 rounded text-xs bg-surface-50 text-surface-700 font-medium outline-none"
                        >
                          <option value="text">Single Line Text</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone Number</option>
                          <option value="select">Dropdown Select</option>
                          <option value="date">Date</option>
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
