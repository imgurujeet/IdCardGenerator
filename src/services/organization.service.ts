import { Organization, OrganizationMember } from '../types/database';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { DEMO_ORGANIZATIONS } from './mockData';

// Local reactive cache for non-live demo mode
let localOrgs = [...DEMO_ORGANIZATIONS];
let activeOrgId = localOrgs[0].id;

export const organizationService = {
  getActiveOrgId(): string {
    const saved = localStorage.getItem('idforge_active_org_id');
    if (saved && localOrgs.some((o) => o.id === saved)) {
      activeOrgId = saved;
    }
    return activeOrgId;
  },

  setActiveOrgId(id: string) {
    activeOrgId = id;
    localStorage.setItem('idforge_active_org_id', id);
  },

  async getOrganizations(): Promise<Organization[]> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase.from('organizations').select('*').order('name');
      if (!error && data) return data;
    }
    return [...localOrgs];
  },

  async getOrganizationById(id: string): Promise<Organization | null> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase.from('organizations').select('*').eq('id', id).single();
      if (!error && data) return data;
    }
    return localOrgs.find((o) => o.id === id) || null;
  },

  async createOrganization(input: { name: string; industry?: string }): Promise<Organization> {
    const newOrg: Organization = {
      id: `org-${Date.now()}`,
      name: input.name,
      slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      industry: input.industry || 'General',
      logo_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase.from('organizations').insert([newOrg]).select().single();
      if (!error && data) {
        localOrgs.unshift(data);
        return data;
      }
    }

    localOrgs.unshift(newOrg);
    this.setActiveOrgId(newOrg.id);
    return newOrg;
  },

  async getMembers(orgId: string): Promise<OrganizationMember[]> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase
        .from('organization_members')
        .select('*, profile:profiles(*)')
        .eq('organization_id', orgId);
      if (!error && data) return data;
    }
    return [
      {
        id: 'mem-1',
        organization_id: orgId,
        user_id: 'user-0001',
        role: 'owner',
        created_at: new Date().toISOString(),
        profile: {
          id: 'user-0001',
          email: 'sarah.jenkins@oakwood.edu',
          full_name: 'Dr. Sarah Jenkins',
          avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
          created_at: '2026-10-15T00:00:00Z',
          updated_at: '2026-10-15T00:00:00Z',
        },
      },
      {
        id: 'mem-2',
        organization_id: orgId,
        user_id: 'user-0002',
        role: 'designer',
        created_at: new Date().toISOString(),
        profile: {
          id: 'user-0002',
          email: 'marcus.vance@oakwood.edu',
          full_name: 'Marcus Vance',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
          created_at: '2026-10-15T00:00:00Z',
          updated_at: '2026-10-15T00:00:00Z',
        },
      },
    ];
  },
};
