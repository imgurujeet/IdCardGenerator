import { FormEntity, FormSubmissionEntity } from '../types/database';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { generateUUID } from '../lib/utils';
import { recordService } from './record.service';
import { broadcastSync } from '../lib/sync';

const STORAGE_FORMS_KEY = 'idforge_user_created_forms';
const STORAGE_SUBS_KEY = 'idforge_user_submissions';

const DEFAULT_PTEC_FORM: FormEntity = {
  id: 'form-ptec-primary',
  organization_id: 'default',
  template_id: 'ptec-primary-v1',
  title: 'Primary Teachers Education College (PTEC) Barh - Student Registration',
  description: 'Official student registration form for ID badge processing and verification.',
  public_slug: 'ptec1-6nk1',
  is_published: true,
  accepting_submissions: true,
  auto_approve: true,
  enforce_unique: true,
  unique_field_key: 'mobile',
  fields_schema: [
    {
      id: 'f-name',
      key: 'student_name',
      label: 'Candidate Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter student full name',
    },
    {
      id: 'f-roll',
      key: 'roll_no',
      label: 'Roll Number',
      type: 'number',
      required: true,
      placeholder: 'e.g. 101',
    },
    {
      id: 'f-session',
      key: 'session',
      label: 'Academic Session',
      type: 'select',
      required: true,
      options: [
        { label: '2024-2026', value: '2024-2026' },
        { label: '2023-2025', value: '2023-2025' },
        { label: '2025-2027', value: '2025-2027' },
        { label: '2026-2028', value: '2026-2028' },
      ],
    },
    {
      id: 'f-father',
      key: 'father_name',
      label: "Father's Name",
      type: 'text',
      required: true,
      placeholder: "e.g. Dilip Paswan",
    },
    {
      id: 'f-dob',
      key: 'dob',
      label: 'Date of Birth (DD-MM-YYYY)',
      type: 'text',
      required: true,
      placeholder: 'e.g. 08-03-2003',
    },
    {
      id: 'f-blood',
      key: 'blood_group',
      label: 'Blood Group',
      type: 'select',
      required: false,
      options: [
        { label: 'A+', value: 'A+' },
        { label: 'B+', value: 'B+' },
        { label: 'O+', value: 'O+' },
        { label: 'AB+', value: 'AB+' },
        { label: 'A-', value: 'A-' },
        { label: 'B-', value: 'B-' },
        { label: 'O-', value: 'O-' },
        { label: 'AB-', value: 'AB-' },
      ],
    },
    {
      id: 'f-mobile',
      key: 'mobile',
      label: 'Mobile Number (10 digits)',
      type: 'phone',
      required: true,
      placeholder: 'e.g. 9876543210',
    },
    {
      id: 'f-pincode',
      key: 'pincode',
      label: 'PIN Code (Auto-Detect City & State)',
      type: 'india_pincode',
      required: true,
      placeholder: 'e.g. 803221',
    },
    {
      id: 'f-address',
      key: 'address',
      label: 'Village / Street Address',
      type: 'text',
      required: true,
      placeholder: 'e.g. Vill+PO- Railli',
    },
    {
      id: 'f-police',
      key: 'police_station',
      label: 'Police Station (PS)',
      type: 'text',
      required: true,
      placeholder: 'e.g. NTPC, Barh',
    },
    {
      id: 'f-photo',
      key: 'photo_url',
      label: 'Passport Format Portrait Photo',
      type: 'image_upload',
      required: true,
    },
  ],
  created_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function getStoredLocalForms(): FormEntity[] {
  try {
    const raw = localStorage.getItem(STORAGE_FORMS_KEY);
    const parsed: FormEntity[] = raw ? JSON.parse(raw) : [];
    if (!parsed.some((f) => f.public_slug === 'ptec1-6nk1' || f.id === DEFAULT_PTEC_FORM.id)) {
      parsed.push(DEFAULT_PTEC_FORM);
    }
    return parsed.map((f) => {
      // Ensure unique field is keyed by mobile for reliable student uniqueness
      if (f.id === DEFAULT_PTEC_FORM.id || f.public_slug === 'ptec1-6nk1') {
        f.unique_field_key = 'mobile';
      }
      return {
        ...f,
        auto_approve: f.auto_approve ?? true,
      };
    });
  } catch {
    return [DEFAULT_PTEC_FORM];
  }
}

function saveStoredLocalForms(list: FormEntity[]) {
  try {
    localStorage.setItem(STORAGE_FORMS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save forms to localStorage:', e);
  }
}

function getStoredLocalSubmissions(): FormSubmissionEntity[] {
  try {
    const raw = localStorage.getItem(STORAGE_SUBS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLocalSubmissions(list: FormSubmissionEntity[]) {
  try {
    localStorage.setItem(STORAGE_SUBS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save submissions to localStorage:', e);
  }
}

export const formService = {
  async getForms(orgId: string): Promise<FormEntity[]> {
    const local = getStoredLocalForms().filter((f) => f.organization_id === orgId);

    if (isLiveSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const combined = [...data];
          for (const l of local) {
            if (!combined.some((c) => c.id === l.id || c.public_slug === l.public_slug)) {
              combined.push(l);
            }
          }
          return combined;
        }
      } catch (err) {
        console.warn('Failed to query Supabase forms:', err);
      }
    }

    return local;
  },

  async getFormById(formId: string): Promise<FormEntity | null> {
    if (isLiveSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('forms').select('*').eq('id', formId).single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('getFormById Supabase error:', e);
      }
    }
    const local = getStoredLocalForms();
    return local.find((f) => f.id === formId) || null;
  },

  async getPublicFormBySlug(slug: string): Promise<FormEntity | null> {
    if (isLiveSupabaseConfigured) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        let query = supabase.from('forms').select('*').eq('is_published', true);

        if (isUuid) {
          query = query.or(`public_slug.eq.${slug},id.eq.${slug}`);
        } else {
          query = query.eq('public_slug', slug);
        }

        const { data, error } = await query.maybeSingle();

        if (!error && data) {
          // Sync live form to local cache so it is available
          const local = getStoredLocalForms().filter((f) => f.id !== data.id && f.public_slug !== data.public_slug);
          saveStoredLocalForms([data, ...local]);
          return data;
        } else if (error) {
          console.warn('getPublicFormBySlug Supabase query error:', error.message);
        }
      } catch (err) {
        console.warn('getPublicFormBySlug Supabase error:', err);
      }
    }

    // Local fallback for offline/demo mode only with exact match
    const local = getStoredLocalForms();
    const localMatch = local.find(
      (f) => (f.public_slug === slug || f.id === slug) && f.is_published
    );
    if (localMatch) return localMatch;

    return null;
  },

  async createForm(
    orgId: string,
    input: {
      title: string;
      description?: string;
      templateId?: string;
      auto_approve?: boolean;
      enforce_unique?: boolean;
      unique_field_key?: string;
      fields: any[];
    }
  ): Promise<FormEntity> {
    const cleanTitle = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .split('-')
      .slice(0, 4)
      .join('-');
    const slug = `${cleanTitle || 'registration'}-${Math.random().toString(36).substring(2, 6)}`;
    const newForm: FormEntity = {
      id: generateUUID(),
      organization_id: orgId,
      template_id: input.templateId || null,
      title: input.title,
      description: input.description || null,
      public_slug: slug,
      is_published: true,
      accepting_submissions: true,
      auto_approve: input.auto_approve ?? true,
      enforce_unique: input.enforce_unique ?? false,
      unique_field_key: input.unique_field_key || 'mobile',
      fields_schema: input.fields,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to localStorage immediately so it is available across all browser tabs
    const local = getStoredLocalForms().filter((f) => f.id !== newForm.id && f.public_slug !== newForm.public_slug);
    saveStoredLocalForms([newForm, ...local]);

    if (isLiveSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('forms').insert([newForm]).select().single();
        if (!error && data) {
          const updated = [data, ...local.filter((f) => f.id !== data.id)];
          saveStoredLocalForms(updated);
          broadcastSync('FORMS_UPDATED', data.id);
          return data;
        } else if (error) {
          console.warn('Supabase extended form insert warning, attempting base schema:', error.message);
          // Fallback if extended columns are not yet in Supabase table
          const { auto_approve, enforce_unique, unique_field_key, ...baseForm } = newForm as any;
          const { data: bData, error: bError } = await supabase.from('forms').insert([baseForm]).select().single();
          if (!bError && bData) {
            const merged = { ...newForm, ...bData };
            const updated = [merged, ...local.filter((f) => f.id !== merged.id)];
            saveStoredLocalForms(updated);
            broadcastSync('FORMS_UPDATED', merged.id);
            return merged;
          }
        }
      } catch (insertEx) {
        console.warn('Direct Supabase form insert exception:', insertEx);
      }
    }

    broadcastSync('FORMS_UPDATED', newForm.id);
    return newForm;
  },

  async updateForm(
    formId: string,
    updates: Partial<Omit<FormEntity, 'id' | 'created_at'>>
  ): Promise<FormEntity | null> {
    const local = getStoredLocalForms();
    const idx = local.findIndex((f) => f.id === formId);
    let updated: FormEntity | null = null;
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...updates, updated_at: new Date().toISOString() };
      updated = local[idx];
      saveStoredLocalForms(local);
    }

    if (isLiveSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('forms')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', formId)
          .select()
          .single();
        if (!error && data) {
          broadcastSync('FORMS_UPDATED', formId);
          return data;
        }
      } catch (e) {
        console.warn('updateForm Supabase error:', e);
      }
    }
    broadcastSync('FORMS_UPDATED', formId);
    return updated;
  },

  async togglePublish(formId: string, isPublished: boolean): Promise<boolean> {
    if (isLiveSupabaseConfigured) {
      await supabase.from('forms').update({ is_published: isPublished }).eq('id', formId);
    }
    const local = getStoredLocalForms();
    const form = local.find((f) => f.id === formId);
    if (form) {
      form.is_published = isPublished;
      form.updated_at = new Date().toISOString();
      saveStoredLocalForms(local);
      broadcastSync('FORMS_UPDATED', formId);
      return true;
    }
    return false;
  },

  async submitPublicResponse(
    slug: string,
    data: Record<string, any>,
    options?: { existingSubmissionId?: string; allowUpdate?: boolean }
  ): Promise<{ success: boolean; submissionId?: string; isUpdate?: boolean; error?: string }> {
    const form = await this.getPublicFormBySlug(slug);
    if (!form || !form.accepting_submissions) {
      return { success: false, error: 'Form is not active or no longer accepting responses.' };
    }

    const localSubs = getStoredLocalSubmissions();

    // Check if an existing submission matches by ID or by 10-digit mobile number
    const cleanPhone = String(
      data['mobile'] ||
      data['phone'] ||
      data['mobile_number'] ||
      data['Mobile_number'] ||
      data['contact'] ||
      ''
    ).replace(/\D/g, '').slice(-10);

    let existingSub: FormSubmissionEntity | null = null;
    if (options?.existingSubmissionId) {
      existingSub = localSubs.find((s) => s.id === options.existingSubmissionId) || null;
    } else if (cleanPhone.length === 10) {
      existingSub = localSubs.find((s) => {
        if (s.form_id !== form.id) return false;
        const subPhone = String(
          s.data?.['mobile'] ||
          s.data?.['phone'] ||
          s.data?.['mobile_number'] ||
          s.data?.['Mobile_number'] ||
          s.data?.['contact'] ||
          ''
        ).replace(/\D/g, '').slice(-10);
        return subPhone === cleanPhone;
      }) || null;
    }

    // UPDATE EXISTING SUBMISSION MODE
    if (existingSub) {
      const mergedData = { ...existingSub.data, ...data };
      existingSub.data = mergedData;
      existingSub.updated_at = new Date().toISOString();

      // If an existing approved record was linked, update the record as well so ID card syncs
      if (existingSub.record_id) {
        try {
          const fullName =
            mergedData['student_name'] ||
            mergedData['candidate_name'] ||
            mergedData['employee_name'] ||
            mergedData['full_name'] ||
            mergedData['name'] ||
            'Approved Student';

          const identifier =
            mergedData['roll_no'] ||
            mergedData['student_roll'] ||
            mergedData['roll'] ||
            mergedData['student_id'] ||
            mergedData['employee_id'] ||
            cleanPhone ||
            `REC-${Date.now().toString().slice(-5)}`;

          await recordService.updateRecord(existingSub.record_id, {
            identifier: String(identifier),
            full_name: String(fullName),
            data: mergedData,
          });
        } catch (err) {
          console.warn('Record update warning:', err);
        }
      }

      saveStoredLocalSubmissions(localSubs);

      if (isLiveSupabaseConfigured) {
        try {
          await supabase
            .from('form_submissions')
            .update({ data: mergedData, updated_at: existingSub.updated_at })
            .eq('id', existingSub.id);
        } catch (e) {
          console.warn('Supabase form_submissions update exception:', e);
        }
      }

      broadcastSync('ALL', existingSub.id);
      return { success: true, submissionId: existingSub.id, isUpdate: true };
    }

    // Check duplicate if enforce_unique is enabled
    if (form.enforce_unique && form.unique_field_key) {
      const isPhoneUnique = form.unique_field_key === 'mobile' || form.unique_field_key === 'phone';
      if (!isPhoneUnique) {
        const uniqueVal = String(data[form.unique_field_key] || '').trim().toLowerCase();
        if (uniqueVal) {
          const isDuplicate = localSubs.some((s) => {
            if (s.form_id !== form.id) return false;
            const val = String(s.data[form.unique_field_key!] || '').trim().toLowerCase();
            return val === uniqueVal;
          });

          if (isDuplicate) {
            return {
              success: false,
              error: `A submission with this ${form.unique_field_key.replace('_', ' ')} (${uniqueVal}) has already been recorded. Click "Edit Previous Registration" to update your existing record.`,
            };
          }
        }
      }
    }

    let recordId: string | null = null;
    let initialStatus: FormSubmissionEntity['status'] = 'submitted';

    // Auto-approve feature
    const shouldAutoApprove = form.auto_approve !== false;
    if (shouldAutoApprove) {
      initialStatus = 'approved';
      const identifier =
        cleanPhone ||
        data['roll_no'] ||
        data['student_roll'] ||
        data['roll'] ||
        data['student_id'] ||
        data['employee_id'] ||
        data['identifier'] ||
        `REC-${Date.now().toString().slice(-5)}`;

      const fullName =
        data['student_name'] ||
        data['candidate_name'] ||
        data['employee_name'] ||
        data['full_name'] ||
        data['name'] ||
        'Approved Student';

      const record = await recordService.createRecord(form.organization_id, {
        identifier: String(identifier),
        fullName: String(fullName),
        data,
        status: 'approved',
        source: 'form_submission',
      });
      recordId = record.id;
    }

    let subId = generateUUID();
    const newSub: FormSubmissionEntity = {
      id: subId,
      organization_id: form.organization_id,
      form_id: form.id,
      data,
      status: initialStatus,
      record_id: recordId,
      reviewed_by: shouldAutoApprove ? 'system_auto_approval' : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveStoredLocalSubmissions([newSub, ...localSubs]);

    if (isLiveSupabaseConfigured) {
      try {
        // First try the secure SECURITY DEFINER RPC designed for public anonymous submissions
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('submit_public_form', {
          p_slug: form.public_slug,
          p_data: data,
        });

        if (!rpcErr && rpcRes && (rpcRes.submission_id || rpcRes.success)) {
          if (rpcRes.submission_id) {
            subId = rpcRes.submission_id;
            newSub.id = subId;
            saveStoredLocalSubmissions([newSub, ...localSubs]);
          }
        } else {
          // Fallback direct insert if user is authenticated or RPC is missing
          const { error: subErr } = await supabase.from('form_submissions').insert([newSub]);
          if (subErr) {
            console.warn('Supabase form_submissions insert error:', subErr.message);
          }
        }
      } catch (e) {
        console.warn('Supabase form submission exception:', e);
      }
    }

    broadcastSync('ALL', subId);
    return { success: true, submissionId: subId };
  },

  /**
   * Search for an existing submission by 10-digit mobile number on this form.
   * Enables auto-fetching previous details for instant update.
   */
  async findSubmissionByMobile(
    formId: string,
    mobile: string,
    slug?: string
  ): Promise<FormSubmissionEntity | null> {
    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length < 10) return null;

    // 1. Search local submissions
    const local = getStoredLocalSubmissions();
    const localMatch = local.find((s) => {
      if (s.form_id !== formId) return false;
      const subPhone = String(
        s.data?.['mobile'] ||
        s.data?.['phone'] ||
        s.data?.['mobile_number'] ||
        s.data?.['Mobile_number'] ||
        s.data?.['contact'] ||
        ''
      ).replace(/\D/g, '').slice(-10);
      return subPhone === cleanMobile;
    });

    if (localMatch) return localMatch;

    // 2. Query Supabase if live
    if (isLiveSupabaseConfigured) {
      try {
        if (slug) {
          const { data: rpcData, error: rpcErr } = await supabase.rpc('get_submission_by_mobile', {
            p_slug: slug,
            p_mobile: cleanMobile,
          });
          if (!rpcErr && rpcData && rpcData.id) {
            return rpcData as FormSubmissionEntity;
          }
        }

        const { data, error } = await supabase
          .from('form_submissions')
          .select('*')
          .eq('form_id', formId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const match = data.find((s) => {
            const subPhone = String(
              s.data?.['mobile'] ||
              s.data?.['phone'] ||
              s.data?.['mobile_number'] ||
              s.data?.['Mobile_number'] ||
              s.data?.['contact'] ||
              ''
            ).replace(/\D/g, '').slice(-10);
            return subPhone === cleanMobile;
          });
          if (match) return match as FormSubmissionEntity;
        }
      } catch (err) {
        console.warn('findSubmissionByMobile query error:', err);
      }
    }

    return null;
  },

  async getSubmissions(formId: string): Promise<FormSubmissionEntity[]> {
    const local = getStoredLocalSubmissions().filter((s) => s.form_id === formId);
    if (isLiveSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('form_submissions')
          .select('*')
          .eq('form_id', formId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const combined = [...data];
          for (const l of local) {
            if (!combined.some((c) => c.id === l.id)) {
              combined.push(l);
            }
          }
          return combined;
        }
      } catch (err) {
        console.warn('Failed to query Supabase submissions:', err);
      }
    }
    return local;
  },

  async updateSubmissionStatus(
    submissionId: string,
    status: 'approved' | 'rejected' | 'under_review',
    convertToRecord: boolean = true
  ): Promise<boolean> {
    const local = getStoredLocalSubmissions();
    let sub = local.find((s) => s.id === submissionId);

    // If not found in local cache, fetch from live Supabase
    if (!sub && isLiveSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('form_submissions')
          .select('*')
          .eq('id', submissionId)
          .single();
        if (!error && data) {
          sub = data;
        }
      } catch (e) {
        console.warn('Failed to fetch submission from Supabase:', e);
      }
    }

    if (!sub) {
      console.warn('Submission not found to update:', submissionId);
      return false;
    }

    sub.status = status;
    sub.updated_at = new Date().toISOString();

    if (status === 'approved' && convertToRecord) {
      const data = sub.data || {};
      const identifier =
        data['student_roll'] ||
        data['roll_no'] ||
        data['roll'] ||
        data['student_id'] ||
        data['employee_id'] ||
        data['admission_no'] ||
        data['Mobile_number'] ||
        data['mobile'] ||
        data['phone'] ||
        data['identifier'] ||
        `SUB-${sub.id.substring(0, 8)}`;

      const fullName =
        data['student_name'] ||
        data['candidate_name'] ||
        data['full_name'] ||
        data['name'] ||
        data['employee_name'] ||
        'Approved Student';

      try {
        const record = await recordService.createRecord(sub.organization_id, {
          identifier: String(identifier),
          fullName: String(fullName),
          data: {
            ...data,
            student_name: fullName,
            full_name: fullName,
            student_id: identifier,
            student_roll: identifier,
            roll_no: identifier,
            photo_url: data['photo_url'] || data['photo'] || '',
          },
          status: 'approved',
          source: 'form_submission',
        });
        sub.record_id = record.id;
      } catch (recErr) {
        console.warn('Failed to create record during approval:', recErr);
      }
    }

    // Save in local storage
    const updatedLocal = [sub, ...local.filter((s) => s.id !== sub.id)];
    saveStoredLocalSubmissions(updatedLocal);

    if (isLiveSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('form_submissions')
          .update({
            status,
            record_id: sub.record_id,
            updated_at: sub.updated_at,
          })
          .eq('id', submissionId);

        if (error) {
          console.warn('updateSubmissionStatus Supabase error:', error.message);
        }
      } catch (e) {
        console.warn('updateSubmissionStatus Supabase error:', e);
      }
    }

    broadcastSync('ALL', submissionId);
    return true;
  },

  async bulkApproveSubmissions(submissionIds: string[]): Promise<number> {
    let count = 0;
    for (const id of submissionIds) {
      const ok = await this.updateSubmissionStatus(id, 'approved', true);
      if (ok) count++;
    }
    broadcastSync('ALL');
    return count;
  },

  async deleteForm(formId: string): Promise<boolean> {
    if (isLiveSupabaseConfigured) {
      try {
        await supabase.from('forms').delete().eq('id', formId);
      } catch (e) {
        console.warn('Supabase deleteForm exception:', e);
      }
    }
    const filtered = getStoredLocalForms().filter((f) => f.id !== formId);
    saveStoredLocalForms(filtered);
    broadcastSync('FORMS_UPDATED', formId);
    return true;
  },
};
