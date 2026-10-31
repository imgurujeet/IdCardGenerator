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
  RefreshCw,
  Search,
} from 'lucide-react';
import { formService } from '../../services/form.service';
import { templateService } from '../../services/template.service';
import { PTEC_TEMPLATE_DOC } from '../../services/mockData';
import { TemplateDocument } from '../../types/template';
import { FormEntity } from '../../types/database';
import { storageService, UploadImageResult } from '../../services/storage.service';
import {
  getIndianStates,
  getDistrictsForState,
} from '../../services/indiaLocation.service';
import { formatStructuredAddress, toCleanTitleCase, formatDateCustom } from '../../lib/utils';
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

  // Unique user & update-by-mobile support
  const [existingSubmissionId, setExistingSubmissionId] = useState<string | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState<boolean>(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState<boolean>(false);
  const [autoFetchNotice, setAutoFetchNotice] = useState<string | null>(null);
  const [wasUpdated, setWasUpdated] = useState<boolean>(false);
  const [lookupPhoneInput, setLookupPhoneInput] = useState<string>('');
  const [showLookupBox, setShowLookupBox] = useState<boolean>(false);

  // Standard Indian Location State (Option & Cascading based)
  const allIndianStates = getIndianStates();
  const [addressType, setAddressType] = useState<'village' | 'ward' | 'street' | 'at'>('village');
  const [villageName, setVillageName] = useState<string>('');
  const [policeStation, setPoliceStation] = useState<string>('');
  const [postOffice, setPostOffice] = useState<string>('');
  const [poSameAsPs, setPoSameAsPs] = useState<boolean>(true);
  const [city, setCity] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('Bihar');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Patna');
  const [pincode, setPincode] = useState<string>('');

  const syncStructuredAddress = (
    type: 'village' | 'ward' | 'street' | 'at',
    vill: string,
    ps: string,
    po: string,
    samePoPs: boolean,
    c: string,
    st: string,
    dist: string,
    pin: string
  ) => {
    const effectivePo = samePoPs ? ps : po;
    const formatted = formatStructuredAddress({
      address_type: type,
      village_name: vill,
      police_station: ps,
      post_office: effectivePo,
      po_same_as_ps: samePoPs,
      city: c,
      district: dist,
      state: st,
      pincode: pin,
    });

    setFormData((prev) => ({
      ...prev,
      address_type: type,
      village_name: vill,
      village_ward: formatted.villageWard,
      address: formatted.villageWard,
      police_station: ps,
      post_office: effectivePo,
      po_same_as_ps: samePoPs,
      po_ps: formatted.poPs,
      city: c || dist,
      district: dist,
      state: st,
      pincode: pin,
      district_pin: formatted.districtPin,
      full_address: formatted.fullAddress,
    }));
  };

  // Look up existing registration details by 10-digit mobile number
  const handleAutoFetchByPhone = async (phoneToLookup: string) => {
    if (!form || !phoneToLookup) return;
    const cleanDigits = phoneToLookup.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length < 10) return;

    try {
      setIsCheckingPhone(true);
      const existing = await formService.findSubmissionByMobile(form.id, cleanDigits, form.public_slug);
      if (existing && existing.data) {
        setExistingSubmissionId(existing.id);
        setIsUpdateMode(true);

        const d = existing.data;
        const rawDob = d.dob || d.date_of_birth || d.birth_date || '';
        const cleanDob = rawDob ? formatDateCustom(rawDob, 'DD-MM-YYYY') : '';

        // Extract location components with fallback parsing from full address string
        let addrType = d.address_type || 'village';
        let vName = d.village_name || d.village || d.village_ward || '';
        let ps = d.police_station || d.ps || '';
        let po = d.post_office || d.po || '';
        let c = d.city || '';
        let st = d.state || 'Bihar';
        let dist = d.district || 'Patna';
        let pin = d.pincode || d.pin || '';

        if ((!vName || !ps || !pin) && d.address) {
          const raw = String(d.address);
          const villMatch = raw.match(/(?:Vill|Village)\s*[-:]\s*([^,]+)/i);
          const wardMatch = raw.match(/Ward(?:\s*No\.?)?\s*[-:]?\s*([^,]+)/i);
          const poMatch = raw.match(/PO\s*[-:]\s*([^,]+)/i);
          const psMatch = raw.match(/PS\s*[-:]\s*([^,]+)/i);
          const distMatch = raw.match(/Dist\s*[-:]\s*([^,]+)/i);
          const stateMatch = raw.match(/\(([^)]+)\)/);
          const pinMatch = raw.match(/-\s*(\d{6})/);

          if (villMatch && !vName) {
            vName = villMatch[1].trim();
            addrType = 'village';
          } else if (wardMatch && !vName) {
            vName = wardMatch[1].trim();
            addrType = 'ward';
          }
          if (poMatch && !po) po = poMatch[1].trim();
          if (psMatch && !ps) ps = psMatch[1].trim();
          if (distMatch && !dist) dist = distMatch[1].trim();
          if (stateMatch && !st) st = stateMatch[1].trim();
          if (pinMatch && !pin) pin = pinMatch[1].trim();
        }

        const samePoPs = d.po_same_as_ps !== undefined
          ? Boolean(d.po_same_as_ps)
          : Boolean(po && ps && po.toLowerCase().trim() === ps.toLowerCase().trim());

        const enriched: Record<string, any> = {
          ...d,
          dob: cleanDob || rawDob,
          student_name: d.student_name || d.candidate_name || d.full_name || '',
          roll_no: d.roll_no || d.student_roll || d.student_id || '',
          session: d.session || '2026-2028',
          father_name: d.father_name || d.father || '',
          blood_group: d.blood_group || d.blood || 'NA',
          mobile: cleanDigits,
          village_name: vName,
          police_station: ps,
          post_office: po,
          city: c,
          state: st,
          district: dist,
          pincode: pin,
        };

        setFormData(enriched);
        setAddressType(addrType as any);
        setVillageName(vName);
        setPoliceStation(ps);
        setPostOffice(po);
        setPoSameAsPs(samePoPs);
        setCity(c);
        setSelectedState(st);
        setSelectedDistrict(dist);
        setPincode(pin);

        if (d.photo_url || d.photo) {
          setPhotoPreview(d.photo_url || d.photo);
        }

        const name = d.student_name || d.candidate_name || d.full_name || 'Candidate';
        setAutoFetchNotice(`✓ Loaded existing details for ${name} (+91 ${cleanDigits}). You can make changes and submit to update.`);
        setShowLookupBox(false);
      } else {
        setAutoFetchNotice(`No previous registration found for +91 ${cleanDigits}. You can fill in the form below.`);
        setTimeout(() => setAutoFetchNotice(null), 5000);
      }
    } catch (err) {
      console.warn('Auto fetch by phone warning:', err);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleClearUpdateMode = () => {
    setExistingSubmissionId(null);
    setIsUpdateMode(false);
    setAutoFetchNotice(null);
    setFormData({});
    setPhotoPreview(null);
    setVillageName('');
    setPoliceStation('');
    setPostOffice('');
    setPoSameAsPs(true);
    setCity('');
    setPincode('');
  };

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
      // Normalize dates to DD-MM-YYYY so they store cleanly and match ID card standards
      const finalSubmission = { ...formData };
      if (form.fields_schema) {
        for (const f of form.fields_schema) {
          if (f.type === 'date' && finalSubmission[f.key]) {
            finalSubmission[f.key] = formatDateCustom(finalSubmission[f.key], 'DD-MM-YYYY');
          }
          // Default blood group to 'NA' if unselected so it never shows blank
          if (f.key === 'blood_group' || f.label.toLowerCase().includes('blood')) {
            if (!finalSubmission[f.key] || String(finalSubmission[f.key]).trim() === '') {
              finalSubmission[f.key] = 'NA';
            }
          }
        }
      }
      if (!finalSubmission['blood_group'] || String(finalSubmission['blood_group']).trim() === '') {
        finalSubmission['blood_group'] = 'NA';
      }
      const res = await formService.submitPublicResponse(slug, finalSubmission, {
        existingSubmissionId: existingSubmissionId || undefined,
        allowUpdate: true,
      });
      if (res.success && res.submissionId) {
        setSubmittedId(res.submissionId);
        setWasUpdated(Boolean(res.isUpdate));
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
        isUpdate={wasUpdated}
        onEdit={() => {
          // Keep all entered details, return to form in edit mode
          setExistingSubmissionId(submittedId);
          setIsUpdateMode(true);
          setSubmittedId(null);
          setAutoFetchNotice('Editing your submitted details. Make changes and submit to update your card.');
        }}
        onReset={() => {
          setSubmittedId(null);
          setExistingSubmissionId(null);
          setIsUpdateMode(false);
          setWasUpdated(false);
          setAutoFetchNotice(null);
          setFormData({});
          setPhotoPreview(null);
          setVillageName('');
          setPoliceStation('');
          setPostOffice('');
          setPoSameAsPs(true);
          setCity('');
          setPincode('');
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
            {/* Optional Returning User Lookup or Active Update Bar */}
            {isUpdateMode ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-950 gap-3 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-900">Editing Registration</span>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                        Update Mode
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      {autoFetchNotice || 'Existing details loaded. Make any changes below and submit to update.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearUpdateMode}
                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  Clear / New Form
                </button>
              </div>
            ) : (
              <div className="border border-surface-200 bg-surface-50/80 rounded-xl p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-surface-600 flex items-center gap-1.5 font-medium">
                    <Search className="w-3.5 h-3.5 text-surface-500" />
                    <span>Already submitted? Look up with your mobile number to edit details</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLookupBox(!showLookupBox);
                      setAutoFetchNotice(null);
                    }}
                    className="text-[11px] font-semibold text-brand-700 hover:text-brand-800 bg-white hover:bg-surface-100 px-2.5 py-1 rounded-lg border border-surface-300 shadow-2xs transition-colors cursor-pointer"
                  >
                    {showLookupBox ? 'Close' : 'Lookup Registration'}
                  </button>
                </div>
                {showLookupBox && (
                  <div className="mt-2.5 pt-2.5 border-t border-surface-200 flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="Enter registered 10-digit mobile number"
                      value={lookupPhoneInput}
                      onChange={(e) => setLookupPhoneInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-1.5 bg-white border border-surface-300 rounded-lg text-xs outline-none focus:border-brand-500 font-mono shadow-2xs"
                    />
                    <button
                      type="button"
                      disabled={lookupPhoneInput.length < 10 || isCheckingPhone}
                      onClick={() => handleAutoFetchByPhone(lookupPhoneInput)}
                      className="w-full sm:w-auto px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isCheckingPhone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      <span>Fetch Details</span>
                    </button>
                  </div>
                )}
                {autoFetchNotice && !isUpdateMode && (
                  <p className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    {autoFetchNotice}
                  </p>
                )}
              </div>
            )}
            {(() => {
              const hasAddressField = form.fields_schema.some(
                (f: any) =>
                  f.type === 'india_address' ||
                  f.key === 'address' ||
                  f.key === 'village_ward' ||
                  f.key === 'village_name'
              );
              let addressBlockRendered = false;

              return form.fields_schema.map((field: any) => {
                const isRequired = Boolean(field.validation?.required ?? field.required);

                {/* Option-Based Standardized Address Component */}
                if (
                  field.type === 'india_address' ||
                  field.key === 'address' ||
                  field.key === 'village_ward' ||
                  field.key === 'village_name'
                ) {
                  if (addressBlockRendered) return null;
                  addressBlockRendered = true;

                  const currentDists = getDistrictsForState(selectedState);

                  return (
                    <div key={field.id} className="p-4 bg-brand-50/50 rounded-2xl border border-brand-200 space-y-3.5">
                      <div className="flex items-center justify-between border-b border-brand-100 pb-2">
                        <div>
                          <label className="text-xs font-bold text-brand-950 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-brand-600" />
                            <span>Card Address Details {isRequired && <span className="text-red-500">*</span>}</span>
                          </label>
                          <p className="text-[10px] text-surface-500 mt-0.5">
                            Select options below for clean, error-free formatting on your ID card.
                          </p>
                        </div>
                        <span className="text-[10px] text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded font-semibold font-mono">
                          Option-Based Format
                        </span>
                      </div>

                      {/* 1. Address Type Selection */}
                      <div>
                        <label className="text-[11px] font-semibold text-surface-700 block mb-1.5">
                          1. Select Address Type (Village or Ward):
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: 'village', label: 'Village (Vill)', prefix: 'Vill-' },
                            { id: 'ward', label: 'Ward No.', prefix: 'Ward No.-' },
                            { id: 'street', label: 'Mohalla / St.', prefix: 'Mohalla-' },
                            { id: 'at', label: 'At / Area', prefix: 'At-' },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                const newType = item.id as any;
                                setAddressType(newType);
                                syncStructuredAddress(newType, villageName, policeStation, postOffice, poSameAsPs, city, selectedState, selectedDistrict, pincode);
                              }}
                              className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                                addressType === item.id
                                  ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                                  : 'bg-white text-surface-700 border-surface-300 hover:border-brand-400'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Village Name or Ward Number */}
                      <div>
                        <label className="text-[11px] font-semibold text-surface-700 block mb-1">
                          {addressType === 'ward'
                            ? '2. Ward Number (Number Only)'
                            : addressType === 'street'
                            ? '2. Street / Mohalla Name'
                            : addressType === 'at'
                            ? '2. Location / At Name'
                            : '2. Village Name (Write Name Only)'}
                        </label>
                        <input
                          type="text"
                          required={isRequired}
                          placeholder={
                            addressType === 'ward'
                              ? 'e.g. 04 (or Ward 4)'
                              : addressType === 'street'
                              ? 'e.g. Station Road'
                              : 'e.g. Rampur (no need to type Vill)'
                          }
                          value={villageName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVillageName(val);
                            syncStructuredAddress(addressType, val, policeStation, postOffice, poSameAsPs, city, selectedState, selectedDistrict, pincode);
                          }}
                          className="w-full px-3 py-2 border border-brand-300 rounded-lg text-xs bg-white text-surface-900 outline-none focus:border-brand-500 font-medium shadow-2xs"
                        />
                      </div>

                      {/* 3. Police Station (PS) & Post Office (PO) with "Same as PS" Option */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-surface-700">
                            3. Police Station (PS) & Post Office (PO)
                          </label>
                          <label className="flex items-center gap-1.5 text-[11px] text-brand-700 font-semibold cursor-pointer select-none bg-brand-100/70 hover:bg-brand-100 px-2 py-0.5 rounded border border-brand-200 transition-colors">
                            <input
                              type="checkbox"
                              checked={poSameAsPs}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setPoSameAsPs(checked);
                                const effectivePo = checked ? policeStation : postOffice;
                                syncStructuredAddress(addressType, villageName, policeStation, effectivePo, checked, city, selectedState, selectedDistrict, pincode);
                              }}
                              className="rounded text-brand-600 cursor-pointer"
                            />
                            <span>PO & PS are same (PO+PS-)</span>
                          </label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] text-surface-500 block mb-0.5">Police Station (PS)</label>
                            <input
                              type="text"
                              placeholder="e.g. Barh"
                              value={policeStation}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPoliceStation(val);
                                const effectivePo = poSameAsPs ? val : postOffice;
                                if (poSameAsPs) setPostOffice(val);
                                syncStructuredAddress(addressType, villageName, val, effectivePo, poSameAsPs, city, selectedState, selectedDistrict, pincode);
                              }}
                              className="w-full px-3 py-2 border border-brand-300 rounded-lg text-xs bg-white text-surface-900 outline-none focus:border-brand-500 font-medium shadow-2xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-surface-500 block mb-0.5">Post Office (PO)</label>
                            <input
                              type="text"
                              placeholder={poSameAsPs ? policeStation || 'Same as Police Station' : 'e.g. Barh'}
                              value={poSameAsPs ? policeStation : postOffice}
                              disabled={poSameAsPs}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPostOffice(val);
                                syncStructuredAddress(addressType, villageName, policeStation, val, false, city, selectedState, selectedDistrict, pincode);
                              }}
                              className={`w-full px-3 py-2 border rounded-lg text-xs font-medium shadow-2xs outline-none ${
                                poSameAsPs
                                  ? 'bg-brand-50/70 border-brand-200 text-brand-800 cursor-not-allowed'
                                  : 'bg-white border-brand-300 text-surface-900 focus:border-brand-500'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 4. City, State, District & PIN Code */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-surface-700 block mb-1">
                            4. City / Town
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Patna"
                            value={city}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCity(val);
                              syncStructuredAddress(addressType, villageName, policeStation, postOffice, poSameAsPs, val, selectedState, selectedDistrict, pincode);
                            }}
                            className="w-full px-2.5 py-2 border border-brand-300 rounded-lg text-xs bg-white text-surface-900 font-medium outline-none focus:border-brand-500 shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-surface-700 block mb-1">
                            5. State / UT
                          </label>
                          <select
                            value={selectedState}
                            onChange={(e) => {
                              const newSt = e.target.value;
                              setSelectedState(newSt);
                              const dists = getDistrictsForState(newSt);
                              const firstDist = dists[0] || '';
                              setSelectedDistrict(firstDist);
                              syncStructuredAddress(addressType, villageName, policeStation, postOffice, poSameAsPs, city, newSt, firstDist, pincode);
                            }}
                            className="w-full px-2.5 py-2 border border-brand-300 rounded-lg text-xs bg-white text-surface-900 font-medium outline-none focus:border-brand-500"
                          >
                            {allIndianStates.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-surface-700 block mb-1">
                            6. District (Choose)
                          </label>
                          <select
                            value={selectedDistrict}
                            onChange={(e) => {
                              const newDist = e.target.value;
                              setSelectedDistrict(newDist);
                              syncStructuredAddress(addressType, villageName, policeStation, postOffice, poSameAsPs, city, selectedState, newDist, pincode);
                            }}
                            className="w-full px-2.5 py-2 border border-brand-300 rounded-lg text-xs bg-white text-surface-900 font-medium outline-none focus:border-brand-500"
                          >
                            {currentDists.map((dst) => (
                              <option key={dst} value={dst}>
                                {dst}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-surface-700 block mb-1">
                            7. PIN Code (6 Digits)
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="e.g. 803213"
                            value={pincode}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setPincode(val);
                              syncStructuredAddress(addressType, villageName, policeStation, postOffice, poSameAsPs, city, selectedState, selectedDistrict, val);
                            }}
                            className="w-full px-2.5 py-2 border border-brand-300 rounded-lg text-xs font-mono font-bold bg-white text-surface-900 outline-none focus:border-brand-500 text-center tracking-widest shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* 5. Live ID Card Print Alignment Preview */}
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-emerald-900 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Card Output Format Preview:</span>
                          </span>
                          <span className="text-[10px] bg-emerald-200/80 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                            Auto-Formatted
                          </span>
                        </div>
                        <div className="font-mono text-xs text-emerald-900 font-semibold bg-white/90 p-2 rounded border border-emerald-200/60 break-words">
                          {formData.full_address || 'Vill- Akbarpur, PO+PS- Barh, Dist- Patna (Bihar) - 803213'}
                        </div>
                      </div>
                    </div>
                  );
                }

                // If unified address block is already capturing address, skip redundant individual sub-fields
                if (
                  hasAddressField &&
                  [
                    'police_station',
                    'post_office',
                    'po',
                    'ps',
                    'city',
                    'town',
                    'district',
                    'state',
                    'pincode',
                    'pin',
                    'ward_no',
                    'address_type',
                    'po_same_as_ps',
                  ].includes(field.key)
                ) {
                  return null;
                }

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
                  </div>
                );
              }

              {/* Single PIN Code Field (when not part of a full address block) */}
              if (field.type === 'india_pincode' || field.key === 'pincode') {
                if (hasAddressField) return null;
                return (
                  <div key={field.id}>
                    <label className="text-xs font-semibold text-surface-800 block mb-1">
                      {field.label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required={isRequired}
                      placeholder="6-Digit PIN Code (e.g. 803221)"
                      value={formData[field.key] || formData.pincode || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        handleInputChange(field.key, val);
                        handleInputChange('pincode', val);
                      }}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs font-mono font-bold bg-white text-surface-900 focus:border-brand-500 outline-none"
                    />
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
                const currentVal = formData[field.key] || '';
                // Standardize date to YYYY-MM-DD for native HTML date input
                const isoDateVal = currentVal ? formatDateCustom(currentVal, 'YYYY-MM-DD') : '';
                const previewDate = currentVal ? formatDateCustom(currentVal, 'DD-MM-YYYY') : '';
                return (
                  <div key={field.id}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-surface-800">
                        {field.label} {isRequired && <span className="text-red-500">*</span>}
                      </label>
                      {previewDate && (
                        <span className="text-[11px] font-mono font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                          ID Card Format: {previewDate}
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      required={isRequired}
                      value={isoDateVal}
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

              {/* Smart Choice: Blood Group Dropdown / Grid */}
              if (field.key === 'blood_group' || field.label.toLowerCase().includes('blood')) {
                const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'NA'];
                const currentVal = formData[field.key] || 'NA';
                return (
                  <div key={field.id} className="p-3 bg-red-50/30 rounded-xl border border-red-200/70 space-y-2">
                    <label className="text-xs font-bold text-surface-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="text-red-500 font-bold">🩸</span>
                        <span>{field.label} {isRequired && <span className="text-red-500">*</span>}</span>
                      </span>
                      <span className="text-[10px] text-red-700 bg-red-100/70 px-2 py-0.5 rounded font-semibold">
                        Choose Option (Defaults to NA)
                      </span>
                    </label>
                    <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
                      {bloodGroups.map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => handleInputChange(field.key, bg)}
                          className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all text-center ${
                            currentVal === bg
                              ? 'bg-red-600 text-white border-red-600 shadow-xs scale-102'
                              : 'bg-white text-surface-700 border-surface-300 hover:border-red-400 hover:text-red-700'
                          }`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              {/* Smart Choice: Academic Session Dropdown */}
              if (field.key === 'session' || field.label.toLowerCase().includes('session')) {
                const standardSessions = ['2024-2026', '2025-2027', '2023-2025', '2022-2024', '2026-2028', '2021-2023'];
                return (
                  <div key={field.id}>
                    <label className="text-xs font-semibold text-surface-800 flex items-center justify-between mb-1">
                      <span>{field.label} {isRequired && <span className="text-red-500">*</span>}</span>
                      <span className="text-[10px] text-surface-400">Standard Batch Format</span>
                    </label>
                    <select
                      required={isRequired}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white text-surface-900 focus:border-brand-500 outline-none font-medium"
                    >
                      <option value="">-- Choose Academic Session --</option>
                      {standardSessions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                );
              }

              {/* Smart Choice: Gender Buttons */}
              if (field.key === 'gender' || field.label.toLowerCase().includes('gender')) {
                const genders = ['Male', 'Female', 'Other'];
                const currentVal = formData[field.key] || '';
                return (
                  <div key={field.id}>
                    <label className="text-xs font-semibold text-surface-800 block mb-1">
                      {field.label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {genders.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => handleInputChange(field.key, g)}
                          className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                            currentVal === g
                              ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                              : 'bg-white text-surface-700 border-surface-300 hover:border-brand-400'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              {/* Smart Choice: Course / Trade Dropdown */}
              if (
                field.key === 'course' ||
                field.key === 'trade' ||
                field.label.toLowerCase().includes('course') ||
                field.label.toLowerCase().includes('trade')
              ) {
                const standardCourses = [
                  'D.El.Ed',
                  'B.Ed',
                  'B.A.',
                  'B.Sc.',
                  'B.Com.',
                  'M.A.',
                  'M.Sc.',
                  'Intermediate Arts',
                  'Intermediate Science',
                  'Intermediate Commerce',
                ];
                return (
                  <div key={field.id}>
                    <label className="text-xs font-semibold text-surface-800 block mb-1">
                      {field.label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      required={isRequired}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white text-surface-900 focus:border-brand-500 outline-none font-medium"
                    >
                      <option value="">-- Choose Course / Stream --</option>
                      {standardCourses.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                );
              }

              {/* Standard text input with auto-clean title-casing for name fields */}
              const isPhoneField = field.type === 'phone' || field.key.toLowerCase().includes('mobile') || field.key.toLowerCase().includes('phone');
              const isNameField = ['student_name', 'father_name', 'mother_name', 'name', 'full_name'].includes(field.key) ||
                field.label.toLowerCase().includes('name') ||
                field.label.toLowerCase().includes('father');

              return (
                <div key={field.id}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-surface-800">
                      {field.label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    {isPhoneField && isUpdateMode && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                        Registered Number
                      </span>
                    )}
                  </div>
                  <input
                    type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                    required={isRequired}
                    placeholder={field.placeholder || ''}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    onBlur={(e) => {
                      if (isNameField && e.target.value) {
                        const cleaned = toCleanTitleCase(e.target.value);
                        handleInputChange(field.key, cleaned);
                      }
                      const isDobField = field.key === 'dob' || field.label.toLowerCase().includes('date of birth') || field.label.toLowerCase().includes('dob');
                      if (isDobField && e.target.value) {
                        const formatted = formatDateCustom(e.target.value, 'DD-MM-YYYY');
                        handleInputChange(field.key, formatted);
                      }
                    }}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white text-surface-900 focus:border-brand-500 outline-none"
                  />
                  {field.helpText && (
                    <p className="text-[11px] text-surface-400 mt-1">{field.helpText}</p>
                  )}
                </div>
              );
            });
          })()}

            <div className="pt-4 border-t border-surface-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                  isUpdateMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                    : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isUpdateMode ? 'Saving Updates...' : 'Submitting Data...'}</span>
                  </>
                ) : (
                  <>
                    {isUpdateMode ? <RefreshCw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{isUpdateMode ? 'Update & Save ID Card Registration' : 'Submit My Registration'}</span>
                  </>
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
