import { TemplateEntity, TemplateVersionEntity } from '../types/database';
import { TemplateDocument } from '../types/template';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { generateUUID } from '../lib/utils';
import { OAKWOOD_TEMPLATE_DOC, NEXACORP_TEMPLATE_DOC, PTEC_TEMPLATE_DOC } from './mockData';

import { organizationService } from './organization.service';

const STORAGE_TEMPLATES_KEY = 'idforge_user_templates';
const STORAGE_VERSIONS_KEY = 'idforge_user_template_versions';

function getStoredLocalTemplates(): TemplateEntity[] {
  try {
    const raw = localStorage.getItem(STORAGE_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLocalTemplates(list: TemplateEntity[]) {
  try {
    localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save templates to localStorage:', e);
  }
}

function getStoredLocalVersions(): Record<string, TemplateVersionEntity> {
  try {
    const raw = localStorage.getItem(STORAGE_VERSIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredLocalVersions(map: Record<string, TemplateVersionEntity>) {
  try {
    localStorage.setItem(STORAGE_VERSIONS_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Failed to save template versions to localStorage:', e);
  }
}

export const templateService = {
  async getTemplates(orgId: string, category?: string): Promise<TemplateEntity[]> {
    const currentOrg = orgId || organizationService.getActiveOrgId();
    const local = getStoredLocalTemplates().filter(
      (t) => !t.organization_id || t.organization_id === currentOrg || t.organization_id === 'default'
    );

    if (isLiveSupabaseConfigured) {
      try {
        let query = supabase.from('templates').select('*').eq('organization_id', orgId);
        if (category && category !== 'all') {
          query = query.eq('category', category);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          const combined = [...data];
          for (const l of local) {
            if (!combined.some((c) => c.id === l.id)) {
              combined.push(l);
            }
          }
          if (category && category !== 'all') {
            return combined.filter((t) => t.category === category);
          }
          return combined;
        }
      } catch (e) {
        console.warn('Supabase fetch templates failed, using local:', e);
      }
    }

    let result = local;
    if (category && category !== 'all') {
      result = result.filter((t) => t.category === category);
    }
    return result;
  },

  async getTemplateById(templateId: string): Promise<{ template: TemplateEntity; activeVersion: TemplateVersionEntity } | null> {
    const localTemplates = getStoredLocalTemplates();
    const localVersions = getStoredLocalVersions();

    // Check if we have a locally saved version for this template
    if (localVersions[templateId]) {
      const template = localTemplates.find((t) => t.id === templateId) || {
        id: templateId,
        organization_id: 'default',
        name: localVersions[templateId].design_data?.name || 'Custom Template',
        description: null,
        category: 'college' as const,
        is_active: true,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { template, activeVersion: localVersions[templateId] };
    }

    if (isLiveSupabaseConfigured) {
      try {
        const { data: template, error } = await supabase.from('templates').select('*').eq('id', templateId).single();
        if (!error && template) {
          const { data: version } = await supabase
            .from('template_versions')
            .select('*')
            .eq('template_id', templateId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();
          if (version) {
            return { template, activeVersion: version };
          }
        }
      } catch (e) {
        console.warn('Supabase getTemplateById failed, trying local fallback:', e);
      }
    }

    const template = localTemplates.find((t) => t.id === templateId);
    if (template && localVersions[templateId]) {
      return { template, activeVersion: localVersions[templateId] };
    }

    // Default template fallbacks
    if (templateId === 'ptec-primary-v1') {
      const ptecVersion: TemplateVersionEntity = {
        id: `ver-${templateId}-1`,
        template_id: templateId,
        version_number: 1,
        design_data: PTEC_TEMPLATE_DOC,
        thumbnail_url: null,
        is_published: true,
        created_by: null,
        created_at: new Date().toISOString(),
      };
      const ptecTmpl: TemplateEntity = {
        id: templateId,
        organization_id: 'default',
        name: PTEC_TEMPLATE_DOC.name,
        description: 'Primary Teachers Education College ID Card',
        category: 'college',
        is_active: true,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { template: ptecTmpl, activeVersion: ptecVersion };
    }

    if (template) {
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
    }

    return null;
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

    const doc: TemplateDocument = input.initialDoc
      ? { ...input.initialDoc, id: templateId, name: input.name, category: input.category }
      : {
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
                  content: '{{student_name}}',
                  fieldKey: 'student_name',
                  fallback: 'STUDENT NAME',
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
                  name: 'Roll Number',
                  x: 2,
                  y: 60,
                  width: 49.98,
                  height: 4,
                  rotation: 0,
                  opacity: 1,
                  locked: false,
                  visible: true,
                  zIndex: 4,
                  content: 'Roll No: {{roll_no}}',
                  fieldKey: 'roll_no',
                  fallback: '101',
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
            student_name: 'Candidate Name',
            roll_no: 'Roll Number',
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

    // 1. Save locally to guarantee offline / instant recovery
    const templates = getStoredLocalTemplates();
    templates.unshift(newTemplate);
    saveStoredLocalTemplates(templates);

    const versions = getStoredLocalVersions();
    versions[templateId] = newVersion;
    saveStoredLocalVersions(versions);

    // 2. Sync to Supabase if live
    if (isLiveSupabaseConfigured) {
      try {
        const { data: tData } = await supabase.from('templates').insert([newTemplate]).select().single();
        const { data: vData } = await supabase.from('template_versions').insert([newVersion]).select().single();
        if (tData && vData) {
          return { template: tData, version: vData };
        }
      } catch (err) {
        console.warn('Supabase createTemplate sync error, fallback to local storage:', err);
      }
    }

    return { template: newTemplate, version: newVersion };
  },

  async saveTemplateVersion(templateId: string, designData: TemplateDocument, isPublished: boolean = true): Promise<TemplateVersionEntity> {
    const localTemplates = getStoredLocalTemplates();
    const localVersions = getStoredLocalVersions();
    const activeOrg = organizationService.getActiveOrgId() || 'default';

    // Ensure template exists in local templates
    let tmpl = localTemplates.find((t) => t.id === templateId);
    if (!tmpl) {
      tmpl = {
        id: templateId,
        organization_id: activeOrg,
        name: designData.name || 'Custom ID Card Template',
        description: null,
        category: (designData.category as any) || 'college',
        is_active: true,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localTemplates.unshift(tmpl);
      saveStoredLocalTemplates(localTemplates);
    } else {
      tmpl.name = designData.name || tmpl.name;
      if (!tmpl.organization_id || tmpl.organization_id === 'default') {
        tmpl.organization_id = activeOrg;
      }
      tmpl.updated_at = new Date().toISOString();
      saveStoredLocalTemplates(localTemplates);
    }

    const existingVersion = localVersions[templateId];
    const nextVerNum = existingVersion ? existingVersion.version_number + 1 : 1;

    const newVersion: TemplateVersionEntity = {
      id: generateUUID(),
      template_id: templateId,
      version_number: nextVerNum,
      design_data: {
        ...designData,
        id: templateId,
        updatedAt: new Date().toISOString(),
      },
      thumbnail_url: null,
      is_published: isPublished,
      created_by: null,
      created_at: new Date().toISOString(),
    };

    // 1. Immediately persist to localStorage
    localVersions[templateId] = newVersion;
    saveStoredLocalVersions(localVersions);

    // 2. Sync to Supabase
    if (isLiveSupabaseConfigured) {
      try {
        // Ensure template row exists in public.templates before inserting version
        const { data: existingTmpl } = await supabase.from('templates').select('id').eq('id', templateId).maybeSingle();
        if (!existingTmpl) {
          await supabase.from('templates').insert([{
            id: templateId,
            organization_id: tmpl.organization_id || 'default',
            name: tmpl.name,
            category: tmpl.category,
            is_active: true,
          }]);
        }
        const { data } = await supabase.from('template_versions').insert([newVersion]).select().single();
        if (data) return data;
      } catch (err) {
        console.warn('Supabase saveTemplateVersion error, local copy preserved:', err);
      }
    }

    return newVersion;
  },

  async deleteTemplate(templateId: string): Promise<boolean> {
    if (isLiveSupabaseConfigured) {
      try {
        await supabase.from('templates').delete().eq('id', templateId);
      } catch (e) {
        console.warn('Supabase deleteTemplate error:', e);
      }
    }
    const localTemplates = getStoredLocalTemplates().filter((t) => t.id !== templateId);
    saveStoredLocalTemplates(localTemplates);

    const localVersions = getStoredLocalVersions();
    delete localVersions[templateId];
    saveStoredLocalVersions(localVersions);

    return true;
  },
};
