import { FormEntity, FormSubmissionEntity } from '../types/database';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { generateUUID } from '../lib/utils';
import { recordService } from './record.service';

const STORAGE_FORMS_KEY = 'idforge_user_created_forms';
const STORAGE_SUBS_KEY = 'idforge_user_submissions';

function getStoredLocalForms(): FormEntity[] {
  try {
    const raw = localStorage.getItem(STORAGE_FORMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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
          .eq('public_slug', slug)
          .eq('is_published', true)
          .single();
        if (!error && data) return data;
      } catch (err) {
        console.warn('getPublicFormBySlug Supabase error:', err);
      }
    }
    const local = getStoredLocalForms();
    return local.find((f) => f.public_slug === slug && f.is_published) || null;
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
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 6)}`;
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

    const subId = generateUUID();
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
        const { error: subErr } = await supabase.from('form_submissions').insert([newSub]);
        if (subErr) {
          console.warn('Supabase form_submissions insert error:', subErr.message);
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
