import { FormEntity, FormSubmissionEntity } from '../types/database';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { DEMO_FORMS } from './mockData';
import { recordService } from './record.service';

let localForms = [...DEMO_FORMS];
let localSubmissions: FormSubmissionEntity[] = [
  {
    id: 'sub-001',
    organization_id: 'org-0001',
    form_id: 'form-0001',
    data: {
      student_name: 'Sophia Chen',
      student_id: 'OA-2026-103',
      grade: 'Grade 12',
      section: 'A',
      blood_group: 'B+',
      emergency_contact: '+1 (555) 019-4521',
      photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    },
    status: 'approved',
    record_id: 'rec-003',
    reviewed_by: 'user-0001',
    created_at: '2026-10-16T11:20:00Z',
    updated_at: '2026-10-16T11:20:00Z',
  },
  {
    id: 'sub-002',
    organization_id: 'org-0001',
    form_id: 'form-0001',
    data: {
      student_name: 'Liam Henderson',
      student_id: 'OA-2026-105',
      grade: 'Grade 10',
      section: 'B',
      blood_group: 'O+',
      emergency_contact: '+1 (555) 019-3321',
      photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    },
    status: 'submitted',
    record_id: null,
    reviewed_by: null,
    created_at: '2026-10-17T06:15:00Z',
    updated_at: '2026-10-17T06:15:00Z',
  },
];

export const formService = {
  async getForms(orgId: string): Promise<FormEntity[]> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return localForms.filter((f) => f.organization_id === orgId);
  },

  async getFormById(formId: string): Promise<FormEntity | null> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase.from('forms').select('*').eq('id', formId).single();
      if (!error && data) return data;
    }
    return localForms.find((f) => f.id === formId) || null;
  },

  async getPublicFormBySlug(slug: string): Promise<FormEntity | null> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('public_slug', slug)
        .eq('is_published', true)
        .eq('accepting_submissions', true)
        .single();
      if (!error && data) return data;
    }
    return localForms.find((f) => f.public_slug === slug && f.is_published && f.accepting_submissions) || null;
  },

  async createForm(
    orgId: string,
    input: {
      title: string;
      description?: string;
      templateId?: string;
      fields: any[];
    }
  ): Promise<FormEntity> {
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 6)}`;
    const newForm: FormEntity = {
      id: `form-${Date.now()}`,
      organization_id: orgId,
      template_id: input.templateId || null,
      title: input.title,
      description: input.description || null,
      public_slug: slug,
      is_published: true,
      accepting_submissions: true,
      fields_schema: input.fields,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase.from('forms').insert([newForm]).select().single();
      if (!error && data) {
        localForms.unshift(data);
        return data;
      }
    }

    localForms.unshift(newForm);
    return newForm;
  },

  async togglePublish(formId: string, isPublished: boolean): Promise<boolean> {
    if (isLiveSupabaseConfigured) {
      await supabase.from('forms').update({ is_published: isPublished }).eq('id', formId);
    }
    const form = localForms.find((f) => f.id === formId);
    if (form) {
      form.is_published = isPublished;
      form.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  },

  async submitPublicResponse(slug: string, data: Record<string, any>): Promise<{ success: boolean; submissionId?: string; error?: string }> {
    if (isLiveSupabaseConfigured) {
      const { data: rpcRes, error } = await supabase.rpc('submit_public_form', {
        p_slug: slug,
        p_data: data,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, submissionId: rpcRes.submission_id };
    }

    const form = localForms.find((f) => f.public_slug === slug && f.is_published && f.accepting_submissions);
    if (!form) {
      return { success: false, error: 'Form is not active or no longer accepting responses.' };
    }

    const subId = `sub-${Date.now()}`;
    const newSub: FormSubmissionEntity = {
      id: subId,
      organization_id: form.organization_id,
      form_id: form.id,
      data,
      status: 'submitted',
      record_id: null,
      reviewed_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localSubmissions.unshift(newSub);
    return { success: true, submissionId: subId };
  },

  async getSubmissions(formId: string): Promise<FormSubmissionEntity[]> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return localSubmissions.filter((s) => s.form_id === formId);
  },

  async updateSubmissionStatus(
    submissionId: string,
    status: 'approved' | 'rejected' | 'under_review',
    convertToRecord: boolean = true
  ): Promise<boolean> {
    const sub = localSubmissions.find((s) => s.id === submissionId);
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

    if (isLiveSupabaseConfigured) {
      await supabase
        .from('form_submissions')
        .update({ status, record_id: sub.record_id, updated_at: sub.updated_at })
        .eq('id', submissionId);
    }

    return true;
  },
};
