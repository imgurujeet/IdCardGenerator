import { FormEntity, FormSubmissionEntity } from '../types/database';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { generateUUID } from '../lib/utils';
import { recordService } from './record.service';

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
  unique_field_key: 'roll_no',
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
      ],
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
      id: 'f-address',
      key: 'pincode',
      label: 'Postal Address (State, District & PIN Code)',
      type: 'india_address',
      required: true,
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
    return parsed;
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
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .or(`public_slug.eq.${slug},id.eq.${slug}`)
          .eq('is_published', true)
          .maybeSingle();

        if (!error && data) {
          // Sync live form to local cache so it is available
          const local = getStoredLocalForms().filter((f) => f.id !== data.id && f.public_slug !== data.public_slug);
          saveStoredLocalForms([data, ...local]);
          return data;
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
      auto_approve: input.auto_approve ?? false,
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
            return merged;
          }
        }
      } catch (insertEx) {
        console.warn('Direct Supabase form insert exception:', insertEx);
      }
    }

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
          return data;
        }
      } catch (e) {
        console.warn('updateForm Supabase error:', e);
      }
    }
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
      return true;
    }
    return false;
  },

  async submitPublicResponse(slug: string, data: Record<string, any>): Promise<{ success: boolean; submissionId?: string; error?: string }> {
    const form = await this.getPublicFormBySlug(slug);
    if (!form || !form.accepting_submissions) {
      return { success: false, error: 'Form is not active or no longer accepting responses.' };
    }

    const localSubs = getStoredLocalSubmissions();

    // Check duplicate if enforce_unique is enabled
    if (form.enforce_unique && form.unique_field_key) {
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
            error: `A submission with this ${form.unique_field_key.replace('_', ' ')} (${uniqueVal}) has already been recorded. Only one submission is permitted per student.`,
          };
        }
      }
    }

    let recordId: string | null = null;
    let initialStatus: FormSubmissionEntity['status'] = 'submitted';

    // Auto-approve feature
    if (form.auto_approve) {
      initialStatus = 'approved';
      const identifier =
        data['roll_no'] ||
        data['student_id'] ||
        data['employee_id'] ||
        data['mobile'] ||
        data['phone'] ||
        data['identifier'] ||
        `REC-${Date.now().toString().slice(-5)}`;

      const fullName =
        data['student_name'] ||
        data['employee_name'] ||
        data['full_name'] ||
        data['name'] ||
        'Approved Student';

      const record = await recordService.createRecord(form.organization_id, {
        identifier,
        fullName,
        data,
        status: 'approved',
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
      reviewed_by: form.auto_approve ? 'system_auto_approval' : null,
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

    return { success: true, submissionId: subId };
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
    const sub = local.find((s) => s.id === submissionId);
    if (!sub) return false;

    sub.status = status;
    sub.updated_at = new Date().toISOString();

    if (status === 'approved' && convertToRecord && !sub.record_id) {
      const identifier =
        sub.data['student_id'] ||
        sub.data['employee_id'] ||
        sub.data['identifier'] ||
        `SUB-${sub.id.substring(4, 9)}`;

      const fullName =
        sub.data['student_name'] ||
        sub.data['employee_name'] ||
        sub.data['full_name'] ||
        sub.data['name'] ||
        'Approved Submitter';

      const record = await recordService.createRecord(sub.organization_id, {
        identifier,
        fullName,
        data: sub.data,
        status: 'approved',
      });
      sub.record_id = record.id;
    }

    saveStoredLocalSubmissions(local);

    if (isLiveSupabaseConfigured) {
      try {
        await supabase
          .from('form_submissions')
          .update({ status, record_id: sub.record_id, updated_at: sub.updated_at })
          .eq('id', submissionId);
      } catch (e) {
        console.warn('updateSubmissionStatus Supabase error:', e);
      }
    }

    return true;
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
    return true;
  },
};
