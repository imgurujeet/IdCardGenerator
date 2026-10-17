import { Organization, OrganizationMember } from '../types/database';
import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { generateUUID } from '../lib/utils';

const STORAGE_CUSTOM_ORGS_KEY = 'idforge_user_created_orgs';
const STORAGE_ACTIVE_ORG_KEY = 'idforge_active_org_id';

function getStoredLocalOrgs(): Organization[] {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_ORGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLocalOrgs(list: Organization[]) {
  try {
    localStorage.setItem(STORAGE_CUSTOM_ORGS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save orgs to localStorage:', e);
  }
}

export const organizationService = {
  getActiveOrgId(): string {
    const saved = localStorage.getItem(STORAGE_ACTIVE_ORG_KEY);
    if (saved) return saved;
    const list = getStoredLocalOrgs();
    return list.length > 0 ? list[0].id : '';
  },

  setActiveOrgId(id: string) {
    localStorage.setItem(STORAGE_ACTIVE_ORG_KEY, id);
  },

  async getOrganizations(): Promise<Organization[]> {
    const local = getStoredLocalOrgs();
    if (isLiveSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Merge Supabase orgs and local orgs seamlessly, deduplicated by ID
          const combined = [...data];
          for (const l of local) {
            if (!combined.some((c) => c.id === l.id || c.name.toLowerCase() === l.name.toLowerCase())) {
              combined.push(l);
            }
          }
          return combined;
        }
      } catch (err) {
        console.warn('Failed to query Supabase organizations:', err);
      }
    }

    return local;
  },

  async getOrganizationById(id: string): Promise<Organization | null> {
    if (isLiveSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('organizations').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('getOrganizationById error:', e);
      }
    }

    const localList = getStoredLocalOrgs();
    return localList.find((o) => o.id === id) || null;
  },

  async createOrganization(input: { name: string; industry?: string }): Promise<Organization> {
    const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 6)}`;

    if (isLiveSupabaseConfigured) {
      // 1. Try atomic database RPC function first
      try {
        const { data: rpcOrg, error: rpcError } = await supabase.rpc('create_organization', {
          p_name: input.name,
          p_industry: input.industry || 'College',
        });

        if (!rpcError && rpcOrg) {
          const org: Organization = rpcOrg;
          this.setActiveOrgId(org.id);
          // Also save in local cache for speed
          const current = getStoredLocalOrgs().filter((o) => o.id !== org.id);
          saveStoredLocalOrgs([org, ...current]);
          return org;
        } else if (rpcError) {
          console.warn('create_organization RPC returned error, trying direct insert:', rpcError.message);
        }
      } catch (rpcEx) {
        console.warn('RPC call failed:', rpcEx);
      }

      // 2. Direct insert fallback into Supabase
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;

        // Ensure user profile exists
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          });
        }

        const { data: directOrg, error: directError } = await supabase
          .from('organizations')
          .insert([
            {
              name: input.name,
              slug,
              industry: input.industry || 'College',
            },
          ])
          .select()
          .single();

        if (!directError && directOrg) {
          if (user) {
            await supabase.from('organization_members').insert([
              {
                organization_id: directOrg.id,
                user_id: user.id,
                role: 'owner',
              },
            ]);
          }

          this.setActiveOrgId(directOrg.id);
          const current = getStoredLocalOrgs().filter((o) => o.id !== directOrg.id);
          saveStoredLocalOrgs([directOrg, ...current]);
          return directOrg;
        } else if (directError) {
          console.warn('Direct Supabase org insert error:', directError.message);
        }
      } catch (insertEx) {
        console.warn('Direct Supabase insert exception:', insertEx);
      }
    }

    // 3. Fallback: Local persistent storage (ensures zero user disruption)
    const fallbackOrg: Organization = {
      id: generateUUID(),
      name: input.name,
      slug,
      industry: input.industry || 'College',
      logo_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const current = getStoredLocalOrgs().filter((o) => o.id !== fallbackOrg.id);
    saveStoredLocalOrgs([fallbackOrg, ...current]);
    this.setActiveOrgId(fallbackOrg.id);
    return fallbackOrg;
  },

  async getMembers(orgId: string): Promise<OrganizationMember[]> {
    if (isLiveSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('organization_members')
          .select('*, profile:profiles(*)')
          .eq('organization_id', orgId);
        if (!error && data) return data;
      } catch (e) {
        console.warn('getMembers error:', e);
      }
    }
    return [];
  },
};
