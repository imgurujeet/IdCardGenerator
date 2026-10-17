import { TemplateEntity, TemplateVersionEntity } from '../types/database';
import { TemplateDocument } from '../types/template';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { generateUUID } from '../lib/utils';
import { OAKWOOD_TEMPLATE_DOC, NEXACORP_TEMPLATE_DOC } from './mockData';

let localTemplates: TemplateEntity[] = [];
let localVersions: Record<string, TemplateVersionEntity> = {};

export const templateService = {
  async getTemplates(orgId: string, category?: string): Promise<TemplateEntity[]> {
    if (isLiveSupabaseConfigured) {
      let query = supabase.from('templates').select('*').eq('organization_id', orgId);
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) return data;
    }

    let result = localTemplates.filter((t) => t.organization_id === orgId);
    if (category && category !== 'all') {
      result = result.filter((t) => t.category === category);
    }
    return result;
  },

  async getTemplateById(templateId: string): Promise<{ template: TemplateEntity; activeVersion: TemplateVersionEntity } | null> {
    if (isLiveSupabaseConfigured) {
      const { data: template, error } = await supabase.from('templates').select('*').eq('id', templateId).single();
      if (!error && template) {
        const { data: version } = await supabase
          .from('template_versions')
          .select('*')
          .eq('template_id', templateId)
          .order('version_number', { ascending: false })
          .limit(1)
          .single();
        return { template, activeVersion: version };
      }
    }

    const template = localTemplates.find((t) => t.id === templateId);
    if (!template) return null;
    const activeVersion = localVersions[templateId] || {
      id: `ver-${templateId}-1`,
      template_id: templateId,
      version_number: 1,
      design_data: templateId.includes('0002') ? NEXACORP_TEMPLATE_DOC : OAKWOOD_TEMPLATE_DOC,
      thumbnail_url: null,
      is_published: true,
      created_by: null,
      created_at: new Date().toISOString(),
    };
    return { template, activeVersion };
  },

  async createTemplate(
    orgId: string,
    input: {
      name: string;
      description?: string;
      category: 'school' | 'college' | 'corporate' | 'event' | 'hospital' | 'club' | 'custom';
      initialDoc?: TemplateDocument;
    }
  ): Promise<{ template: TemplateEntity; version: TemplateVersionEntity }> {
    const templateId = generateUUID();
    const newTemplate: TemplateEntity = {
      id: templateId,
      organization_id: orgId,
      name: input.name,
      description: input.description || null,
      category: input.category,
      is_active: true,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const doc: TemplateDocument = input.initialDoc || {
      schemaVersion: 1,
      id: templateId,
      name: input.name,
      category: input.category,
      orientation: 'portrait',
      dimensions: {
        width: 53.98,
        height: 85.6,
        unit: 'mm',
        dpi: 300,
        cornerRadius: 3.18,
      },
      layouts: {
        front: {
          backgroundColor: '#ffffff',
          elements: [
            {
              id: 'header-bg',
              type: 'shape',
              name: 'Header Bar',
              x: 0,
              y: 0,
              width: 53.98,
              height: 16,
              rotation: 0,
              opacity: 1,
              locked: true,
              visible: true,
              zIndex: 1,
              shapeType: 'rectangle',
              fillColor: '#4f46e5',
            },
            {
              id: 'title-text',
              type: 'text',
              name: 'Card Title',
              x: 2,
              y: 4,
              width: 49.98,
              height: 6,
              rotation: 0,
              opacity: 1,
              locked: false,
              visible: true,
              zIndex: 2,
              content: input.name.toUpperCase(),
              fontFamily: 'Inter',
              fontSize: 7,
              fontWeight: 'bold',
              fontStyle: 'normal',
              textAlign: 'center',
              color: '#ffffff',
            },
            {
              id: 'portrait-frame',
              type: 'portrait',
              name: 'Photo Frame',
              x: 14.49,
              y: 20,
              width: 25,
              height: 30,
              rotation: 0,
              opacity: 1,
              locked: false,
              visible: true,
              zIndex: 3,
              src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
              fieldKey: 'photo_url',
              objectFit: 'cover',
              borderRadius: 2,
              borderColor: '#4f46e5',
              borderWidth: 0.5,
            },
            {
              id: 'dyn-name',
              type: 'dynamic-text',
              name: 'Name Field',
              x: 2,
              y: 53,
              width: 49.98,
              height: 5,
              rotation: 0,
              opacity: 1,
              locked: false,
              visible: true,
              zIndex: 4,
              content: '{{full_name}}',
              fieldKey: 'full_name',
              fallback: 'FULL NAME',
              fontFamily: 'Inter',
              fontSize: 6.5,
              fontWeight: 'bold',
              fontStyle: 'normal',
              textAlign: 'center',
              color: '#0f172a',
            },
            {
              id: 'dyn-id',
              type: 'dynamic-text',
              name: 'ID Field',
              x: 2,
              y: 60,
              width: 49.98,
              height: 4,
              rotation: 0,
              opacity: 1,
              locked: false,
              visible: true,
              zIndex: 4,
              content: 'ID: {{identifier}}',
              fieldKey: 'identifier',
              fallback: 'ID: 000000',
              fontFamily: 'Inter',
              fontSize: 4,
              fontWeight: 'semibold',
              fontStyle: 'normal',
              textAlign: 'center',
              color: '#64748b',
            },
          ],
        },
      },
      defaultFieldMappings: {
        full_name: 'Full Name',
        identifier: 'ID Number',
        photo_url: 'Photo URL',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newVersion: TemplateVersionEntity = {
      id: generateUUID(),
      template_id: templateId,
      version_number: 1,
      design_data: doc,
      thumbnail_url: null,
      is_published: true,
      created_by: null,
      created_at: new Date().toISOString(),
    };

    if (isLiveSupabaseConfigured) {
      const { data: tData } = await supabase.from('templates').insert([newTemplate]).select().single();
      const { data: vData } = await supabase.from('template_versions').insert([newVersion]).select().single();
      if (tData && vData) {
        return { template: tData, version: vData };
      }
    }

    localTemplates.unshift(newTemplate);
    localVersions[templateId] = newVersion;
    return { template: newTemplate, version: newVersion };
  },

  async saveTemplateVersion(templateId: string, designData: TemplateDocument, isPublished: boolean = true): Promise<TemplateVersionEntity> {
    const existingVersion = localVersions[templateId];
    const nextVerNum = existingVersion ? existingVersion.version_number + 1 : 1;

    const newVersion: TemplateVersionEntity = {
      id: generateUUID(),
      template_id: templateId,
      version_number: nextVerNum,
      design_data: designData,
      thumbnail_url: null,
      is_published: isPublished,
      created_by: null,
      created_at: new Date().toISOString(),
    };

    if (isLiveSupabaseConfigured) {
      const { data } = await supabase.from('template_versions').insert([newVersion]).select().single();
      if (data) return data;
    }

    localVersions[templateId] = newVersion;
    return newVersion;
  },

  async deleteTemplate(templateId: string): Promise<boolean> {
    if (isLiveSupabaseConfigured) {
      await supabase.from('templates').delete().eq('id', templateId);
    }
    localTemplates = localTemplates.filter((t) => t.id !== templateId);
    delete localVersions[templateId];
    return true;
  },
};
