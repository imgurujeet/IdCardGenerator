import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  MapPin,
  Home,
  Camera,
  Crop,
} from 'lucide-react';
import { formService } from '../../services/form.service';
import { templateService } from '../../services/template.service';
import { PTEC_TEMPLATE_DOC } from '../../services/mockData';
import { TemplateDocument } from '../../types/template';
import { FormEntity } from '../../types/database';
import { storageService, UploadImageResult } from '../../services/storage.service';
import {
  lookupIndiaPincode,
  getIndianStates,
  getDistrictsForState,
} from '../../services/indiaLocation.service';
import { PassportPhotoCaptureModal } from './components/PassportPhotoCaptureModal';
import { SubmittedCardPreview } from './components/SubmittedCardPreview';

export const PublicFormPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<FormEntity | null>(null);
  const [templateDoc, setTemplateDoc] = useState<TemplateDocument>(PTEC_TEMPLATE_DOC);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState<UploadImageResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // India Location & PIN Code state
  const allIndianStates = getIndianStates();
  const [selectedState, setSelectedState] = useState<string>('Bihar');
  const [addressMode, setAddressMode] = useState<'pincode' | 'manual'>('pincode');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeVerified, setPincodeVerified] = useState<string | null>(null);

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
          // Start with empty form data - no default mock values
          setFormData({});

          if (data.template_id) {
            try {
              const tmpl = await templateService.getTemplateById(data.template_id);
              if (tmpl?.activeVersion?.design_data) {
                setTemplateDoc(tmpl.activeVersion.design_data);
              }
            } catch (err) {
              console.warn('Failed to load custom form template, using default:', err);
            }
          }
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

  const handleStateSelect = (stateName: string, stateKey: string = 'state') => {
    setSelectedState(stateName);
    handleInputChange(stateKey, stateName);
    const validDistricts = getDistrictsForState(stateName);
    if (formData.district && !validDistricts.includes(formData.district)) {
      handleInputChange('district', '');
    }
  };

  const handlePincodeChange = async (key: string, pin: string) => {
    handleInputChange(key, pin);
    const cleanPin = pin.replace(/\D/g, '');
    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      const res = await lookupIndiaPincode(cleanPin);
      setPincodeLoading(false);
      if (res.success && res.state && res.district) {
        setPincodeVerified(`${res.district}, ${res.state}`);
        setSelectedState(res.state);
        // User request: ONLY fetch city and state from PIN code. Rest user writes their own address and police station.
        setFormData((prev) => ({
          ...prev,
          [key]: cleanPin,
          pincode: cleanPin,
          district: res.district,
          city: res.district,
          state: res.state,
        }));
      } else {
        setPincodeVerified(null);
      }
    } else {
      setPincodeVerified(null);
    }
  };

  // Passport Photo Modal State
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [activePhotoFieldKey, setActivePhotoFieldKey] = useState<string>('photo_url');

  const uploadProcessedPhoto = async (file: File, key: string) => {
    try {
      setIsCompressing(true);
      const res = await storageService.uploadPortrait(file, form?.organization_id || 'org-0001');
      setPhotoPreview(res.url);
      setCompressionResult(res);
      handleInputChange(key, res.url);
      if (key !== 'photo_url') {
        handleInputChange('photo_url', res.url);
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      alert('Failed to process image. Please try another photo.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadProcessedPhoto(file, key);
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

  if (submittedId && form) {
    return (
      <SubmittedCardPreview
        submissionId={submittedId}
        formTitle={form.title}
        templateDoc={templateDoc}
        formData={{ ...formData, photo_url: photoPreview || formData['photo_url'] }}
        onReset={() => {
          setSubmittedId(null);
          setFormData({});
          setPhotoPreview(null);
          setPincodeVerified(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 py-10 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-xl w-full">
        {/* Navigation back to Home */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 bg-white hover:bg-surface-100 text-surface-700 hover:text-surface-900 text-xs font-semibold shadow-xs transition-colors"
          >
            <Home className="w-3.5 h-3.5 text-brand-600" />
            <span>Go to Home Page</span>
          </Link>
          <span className="text-[11px] text-surface-400 font-medium">IDForge SaaS Platform</span>
        </div>

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
            {form.fields_schema.map((field: any) => {
              const isRequired = Boolean(field.validation?.required ?? field.required);

              if (field.type === 'image_upload') {
                return (
                  <div key={field.id} className="p-4 bg-brand-50/40 rounded-xl border border-brand-200 space-y-3">
                    <label className="text-xs font-bold text-surface-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-brand-600" />
                        <span>{field.label} {isRequired && <span className="text-red-500">*</span>}</span>
                      </span>
                      <span className="text-[10px] text-brand-700 font-semibold bg-brand-100/70 px-2 py-0.5 rounded-full">
                        Standard 35×45mm Passport
                      </span>
                    </label>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {isCompressing ? (
                        <div className="w-28 h-36 rounded-xl bg-brand-50 border-2 border-dashed border-brand-400 flex flex-col items-center justify-center text-brand-600 text-center p-2 shrink-0 animate-pulse">
                          <Loader2 className="w-6 h-6 animate-spin mb-1.5" />
                          <span className="text-[11px] font-bold">Optimizing...</span>
                        </div>
                      ) : photoPreview ? (
                        <div className="relative w-28 h-36 rounded-xl overflow-hidden border-2 border-brand-500 shadow-md shrink-0 bg-white group">
                          <img
                            src={photoPreview}
                            alt="Candidate Portrait"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setActivePhotoFieldKey(field.key);
                              setShowPhotoModal(true);
                            }}
                            className="absolute inset-0 bg-surface-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-semibold"
                          >
                            <Crop className="w-5 h-5 mb-1" />
                            <span>Recrop / Retake</span>
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setActivePhotoFieldKey(field.key);
                            setShowPhotoModal(true);
                          }}
                          className="w-28 h-36 rounded-xl bg-white border-2 border-dashed border-brand-300 hover:border-brand-500 flex flex-col items-center justify-center text-surface-400 hover:text-brand-600 text-center p-2 shrink-0 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Camera className="w-6 h-6 mb-1 text-brand-500" />
                          <span className="text-[11px] font-bold text-surface-700">Add Photo</span>
                          <span className="text-[9px] text-surface-400 mt-0.5">Passport Size</span>
                        </div>
                      )}

                      <div className="flex-1 space-y-2.5 w-full">
                        {/* Two Primary Action Buttons: Camera Guide or Upload & Crop */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePhotoFieldKey(field.key);
                              setShowPhotoModal(true);
                            }}
                            className="w-full py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Camera & Silhouette</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActivePhotoFieldKey(field.key);
                              setShowPhotoModal(true);
                            }}
                            className="w-full py-2 px-3 bg-white hover:bg-surface-50 border border-brand-300 text-brand-900 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <Crop className="w-3.5 h-3.5 text-brand-600" />
                            <span>Upload & Crop Face</span>
                          </button>
                        </div>

                        <p className="text-[11px] text-surface-500 leading-normal">
                          {field.helpText || 'Face centered, looking straight with neutral background. Interactive alignment ensures proper placement on ID card.'}
                        </p>

                        {/* Hidden native input for fallback */}
                        <div className="flex items-center gap-2 pt-1">
                          <label className="text-[10px] text-surface-500 cursor-pointer hover:underline flex items-center gap-1">
                            <span>Or direct file upload:</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isCompressing}
                              required={isRequired && !photoPreview}
                              onChange={(e) => handlePhotoUpload(e, field.key)}
                              className="text-[10px] file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-surface-200 file:text-surface-700 hover:file:bg-surface-300 cursor-pointer text-surface-600 disabled:opacity-50"
                            />
                          </label>
                        </div>

                        {compressionResult && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                            <span className="font-bold">⚡ Optimized:</span>
                            <span>
                              {compressionResult.savingsPercent}% saved (
                              {(compressionResult.originalSize / 1024).toFixed(0)}KB ➔{' '}
                              {(compressionResult.compressedSize / 1024).toFixed(0)}KB)
                            </span>
                          </div>
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
                      <option value="">-- Please Select {field.label} --</option>
                      {field.options?.map((opt: any, idx: number) => {
                        const optVal = typeof opt === 'string' ? opt : (opt.value || opt.label || '');
                        const optLbl = typeof opt === 'string' ? opt : (opt.label || opt.value || '');
                        return (
                          <option key={idx} value={optVal}>
                            {optLbl}
                          </option>
                        );
                      })}
                    </select>
                    {field.helpText && (
                      <p className="text-[11px] text-surface-400 mt-1">{field.helpText}</p>
                    )}
                  </div>
                );
              }

              {/* India State Dropdown */}
              if (field.type === 'india_state' || field.key === 'state' || field.label.toLowerCase() === 'state') {
                return (
                  <div key={field.id}>
                    <label className="text-xs font-semibold text-surface-800 flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-600" />
                        <span>{field.label} {isRequired && <span className="text-red-500">*</span>}</span>
                      </span>
                      <span className="text-[10px] text-surface-400">All 36 States & UTs</span>
                    </label>
                    <select
                      required={isRequired}
                      value={formData[field.key] || formData.state || ''}
                      onChange={(e) => handleStateSelect(e.target.value, field.key)}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white text-surface-900 focus:border-brand-500 outline-none font-medium"
                    >
                      <option value="">-- Choose Indian State / UT --</option>
                      {allIndianStates.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              {/* India District Dropdown (Cascades with selected State + PIN Auto-Detect) */}
              if (
                field.type === 'india_district' ||
                field.key === 'district' ||
                field.label.toLowerCase().includes('district')
              ) {
                const activeState = formData.state || selectedState;
                const stateDistricts = getDistrictsForState(activeState);

                return (
                  <div key={field.id} className="p-3.5 bg-brand-50/40 rounded-xl border border-brand-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-brand-950 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-600" />
                        <span>State & District Selector {isRequired && <span className="text-red-500">*</span>}</span>
                      </label>
                      <span className="text-[10px] text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded font-semibold">
                        🇮🇳 Cascading Dropdown
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* State Dropdown */}
                      <div>
                        <label className="text-[11px] font-semibold text-surface-700 block mb-1">
                          1. Choose State / UT
                        </label>
                        <select
                          value={formData.state || selectedState}
                          onChange={(e) => handleStateSelect(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-brand-300 rounded-lg text-xs bg-white text-surface-900 font-medium outline-none focus:border-brand-500"
                        >
                          {allIndianStates.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* District Dropdown */}
                      <div>
                        <label className="text-[11px] font-semibold text-surface-700 block mb-1">
                          2. District in {activeState} ({stateDistricts.length})
                        </label>
                        <select
                          required={isRequired}
                          value={formData[field.key] || formData.district || ''}
                          onChange={(e) => {
                            handleInputChange(field.key, e.target.value);
                            handleInputChange('district', e.target.value);
                          }}
                          className="w-full px-2.5 py-1.5 border border-brand-300 rounded-lg text-xs bg-white text-surface-900 font-medium outline-none focus:border-brand-500"
                        >
                          <option value="">-- Choose District in {activeState} --</option>
                          {stateDistricts.map((dst) => (
                            <option key={dst} value={dst}>
                              {dst}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* PIN Code Quick Auto-Detect Helper */}
                    <div className="pt-2 border-t border-brand-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] text-surface-500 font-medium flex items-center gap-1">
                        ⚡ Or enter PIN to auto-detect both:
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 803221"
                          value={formData.pincode || ''}
                          onChange={(e) => handlePincodeChange('pincode', e.target.value)}
                          className="w-28 px-2 py-1 border border-brand-300 rounded text-xs font-mono font-bold bg-white outline-none focus:border-brand-500 text-center"
                        />
                        {pincodeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />}
                        {pincodeVerified && (
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate">
                            ✓ {pincodeVerified}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              {/* India PIN Code or Full Smart Location (Dual Mode: PIN Auto-Detect OR State->District Cascading) */}
              if (field.type === 'india_pincode' || field.type === 'india_address') {
                const activeState = formData.state || selectedState;
                const stateDistricts = getDistrictsForState(activeState);

                return (
                  <div key={field.id} className="p-4 bg-brand-50/50 rounded-2xl border border-brand-200 space-y-3">
                    {/* Header with Dual Mode Switcher */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-100 pb-2.5">
                      <div>
                        <label className="text-xs font-bold text-brand-950 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-brand-600" />
                          <span>{field.label} {isRequired && <span className="text-red-500">*</span>}</span>
                        </label>
                        <p className="text-[10px] text-surface-500 mt-0.5">
                          Auto-detect via India Post API or choose State & District dropdowns.
                        </p>
                      </div>

                      {/* Mode Toggle Buttons */}
                      <div className="flex items-center bg-white p-0.5 rounded-lg border border-brand-200 text-[11px] font-semibold shrink-0">
                        <button
                          type="button"
                          onClick={() => setAddressMode('pincode')}
                          className={`px-2.5 py-1 rounded-md transition-colors ${
                            addressMode === 'pincode'
                              ? 'bg-brand-600 text-white shadow-xs'
                              : 'text-surface-600 hover:text-surface-900'
                          }`}
                        >
                          ⚡ Auto-Detect (PIN)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddressMode('manual')}
                          className={`px-2.5 py-1 rounded-md transition-colors ${
                            addressMode === 'manual'
                              ? 'bg-brand-600 text-white shadow-xs'
                              : 'text-surface-600 hover:text-surface-900'
                          }`}
                        >
                          🗺️ State & District
                        </button>
                      </div>
                    </div>

                    {/* Mode A: PIN Code Auto-Detect */}
                    {addressMode === 'pincode' ? (
                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-brand-900 block mb-1">
                            Enter 6-Digit Indian Postal PIN Code
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              maxLength={6}
                              required={isRequired}
                              placeholder="e.g. 803221 or 110001 or 221005"
                              value={formData[field.key] || formData.pincode || ''}
                              onChange={(e) => handlePincodeChange(field.key, e.target.value)}
                              className="w-full px-3 py-2 border border-brand-300 rounded-lg text-xs font-mono font-bold bg-white text-surface-900 focus:border-brand-500 outline-none pr-8 tracking-widest shadow-2xs"
                            />
                            {pincodeLoading && (
                              <Loader2 className="w-4 h-4 animate-spin text-brand-600 absolute right-2.5 top-2.5" />
                            )}
                          </div>
                        </div>

                        {pincodeVerified && (
                          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1 text-xs text-emerald-900">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Auto-Fetched: <strong>{pincodeVerified}</strong></span>
                              </div>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                                City & State Verified
                              </span>
                            </div>
                            <p className="text-[10px] text-emerald-700">
                              City & State filled automatically. Please enter your village/street address and police station in their respective fields below.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Mode B: State & District Cascading Dropdowns */
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* State Dropdown */}
                          <div>
                            <label className="text-[11px] font-semibold text-surface-700 block mb-1">
                              State / Union Territory
                            </label>
                            <select
                              value={formData.state || selectedState}
                              onChange={(e) => handleStateSelect(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-brand-300 rounded-lg text-xs bg-white text-surface-900 font-medium outline-none focus:border-brand-500"
                            >
                              {allIndianStates.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* District Dropdown */}
                          <div>
                            <label className="text-[11px] font-semibold text-surface-700 block mb-1">
                              District in {formData.state || selectedState}
                            </label>
                            <select
                              value={formData.district || ''}
                              onChange={(e) => handleInputChange('district', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-brand-300 rounded-lg text-xs bg-white text-surface-900 font-medium outline-none focus:border-brand-500"
                            >
                              <option value="">-- Choose District --</option>
                              {stateDistricts.map((dst) => (
                                <option key={dst} value={dst}>
                                  {dst}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* PIN Code Optional Manual Input */}
                        <div>
                          <label className="text-[11px] font-semibold text-surface-700 block mb-1">
                            PIN Code (Optional)
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="6-Digit PIN Code"
                            value={formData[field.key] || formData.pincode || ''}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-brand-300 rounded-lg text-xs font-mono bg-white outline-none focus:border-brand-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (field.type === 'textarea') {
                return (
                  <div key={field.id}>
                    <label className="text-xs font-semibold text-surface-800 block mb-1">
                      {field.label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      rows={3}
                      required={isRequired}
                      placeholder={field.placeholder || 'Enter complete address'}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white text-surface-900 focus:border-brand-500 outline-none leading-relaxed"
                    />
                    {field.helpText && (
                      <p className="text-[11px] text-surface-400 mt-1">{field.helpText}</p>
                    )}
                  </div>
                );
              }

              if (field.type === 'date') {
                return (
                  <div key={field.id}>
                    <label className="text-xs font-semibold text-surface-800 block mb-1">
                      {field.label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="date"
                      required={isRequired}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white text-surface-900 focus:border-brand-500 outline-none"
                    />
                    {field.helpText && (
                      <p className="text-[11px] text-surface-400 mt-1">{field.helpText}</p>
                    )}
                  </div>
                );
              }

              if (field.type === 'number') {
                return (
                  <div key={field.id}>
                    <label className="text-xs font-semibold text-surface-800 block mb-1">
                      {field.label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="number"
                      required={isRequired}
                      placeholder={field.placeholder || 'e.g. 141'}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white text-surface-900 focus:border-brand-500 outline-none font-mono"
                    />
                    {field.helpText && (
                      <p className="text-[11px] text-surface-400 mt-1">{field.helpText}</p>
                    )}
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

      {/* Interactive Passport Photo Capture & Cropper Modal */}
      <PassportPhotoCaptureModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onCapture={(file) => uploadProcessedPhoto(file, activePhotoFieldKey)}
      />
    </div>
  );
};
