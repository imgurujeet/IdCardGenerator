import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Upload,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { formService } from '../../services/form.service';
import { FormEntity } from '../../types/database';
import { FormFieldDefinition } from '../../types/form';

export const PublicFormPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<FormEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadForm() {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await formService.getPublicFormBySlug(slug);
        if (!data) {
          setError('This form is either private, unpublished, or does not exist.');
        } else {
          setForm(data);
          // Set default values
          const initial: Record<string, any> = {};
          data.fields_schema.forEach((f: FormFieldDefinition) => {
            if (f.defaultValue) initial[f.key] = f.defaultValue;
          });
          setFormData(initial);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load form.');
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [slug]);

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        handleInputChange(key, result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !slug) return;

    try {
      setIsSubmitting(true);
      const res = await formService.submitPublicResponse(slug, formData);
      if (res.success && res.submissionId) {
        setSubmittedId(res.submissionId);
      } else {
        alert(res.error || 'Failed to submit form.');
      }
    } catch (e: any) {
      alert(e.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
        <p className="text-sm font-medium text-surface-600">Loading Registration Form...</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-surface-200 shadow-card text-center">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-surface-900 mb-2">Form Unavailable</h2>
          <p className="text-xs text-surface-500 mb-6 leading-relaxed">
            {error || 'This link may have expired or submissions are currently paused by the administrator.'}
          </p>
        </div>
      </div>
    );
  }

  if (submittedId) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-surface-200 shadow-card text-center">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-1">Registration Submitted!</h2>
          <p className="text-xs text-surface-500 mb-6 leading-relaxed">
            Your details and ID photo have been successfully received and submitted for review.
          </p>

          <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 text-left space-y-1 mb-6">
            <span className="text-[10px] uppercase font-semibold text-surface-500">Submission Reference</span>
            <p className="font-mono text-xs font-bold text-surface-900">{submittedId}</p>
          </div>

          <p className="text-[11px] text-surface-400">
            You may safely close this browser tab. Your ID badge will be prepared by the administration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-xl w-full">
        {/* Form Card Header */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
          <div className="bg-gradient-to-r from-brand-700 to-indigo-900 p-6 text-white">
            <div className="flex items-center gap-2 mb-2 text-brand-200 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Official Registration Portal</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{form.title}</h1>
            {form.description && (
              <p className="text-xs text-brand-100 mt-2 leading-relaxed">
                {form.description}
              </p>
            )}
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            {form.fields_schema.map((field: FormFieldDefinition) => {
              const isRequired = field.validation.required;

              if (field.type === 'image_upload') {
                return (
                  <div key={field.id} className="space-y-2">
                    <label className="text-xs font-semibold text-surface-800 flex items-center justify-between">
                      <span>
                        {field.label} {isRequired && <span className="text-red-500">*</span>}
                      </span>
                      {field.validation.maxFileSizeMb && (
                        <span className="text-[10px] text-surface-400 font-normal">
                          Max {field.validation.maxFileSizeMb}MB
                        </span>
                      )}
                    </label>

                    <div className="flex items-center gap-4">
                      {photoPreview ? (
                        <div className="relative w-24 h-28 rounded-lg overflow-hidden border-2 border-brand-500 shadow-xs shrink-0">
                          <img
                            src={photoPreview}
                            alt="Uploaded Portrait"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-28 rounded-lg bg-surface-100 border border-dashed border-surface-300 flex flex-col items-center justify-center text-surface-400 text-center p-2 shrink-0">
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[10px]">Photo Preview</span>
                        </div>
                      )}

                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          required={isRequired && !photoPreview}
                          onChange={(e) => handlePhotoUpload(e, field.key)}
                          className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer text-surface-600"
                        />
                        {field.helpText && (
                          <p className="text-[11px] text-surface-400 mt-1 leading-normal">
                            {field.helpText}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (field.type === 'select') {
                return (
                  <div key={field.id}>
                    <label className="text-xs font-semibold text-surface-800 block mb-1">
                      {field.label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      required={isRequired}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white text-surface-900 focus:border-brand-500 outline-none"
                    >
                      <option value="">-- Please Select --</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={field.id}>
                  <label className="text-xs font-semibold text-surface-800 block mb-1">
                    {field.label} {isRequired && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                    required={isRequired}
                    placeholder={field.placeholder || ''}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white text-surface-900 focus:border-brand-500 outline-none"
                  />
                  {field.helpText && (
                    <p className="text-[11px] text-surface-400 mt-1">{field.helpText}</p>
                  )}
                </div>
              );
            })}

            <div className="pt-4 border-t border-surface-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Data...</span>
                  </>
                ) : (
                  <span>Submit My Registration</span>
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-[11px] text-surface-400 mt-6">
          Powered securely by IDForge SaaS • Private & Encrypted Record Processing
        </p>
      </div>
    </div>
  );
};
