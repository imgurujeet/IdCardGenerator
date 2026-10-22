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

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: 'owner' | 'admin' | 'designer' | 'data_operator' | 'viewer';
  token: string;
  invite_link: string;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
}

const STORAGE_INVITES_PREFIX = 'idforge_pending_invites_';

function getStoredInvites(orgId: string): OrganizationInvite[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_INVITES_PREFIX}${orgId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredInvites(orgId: string, list: OrganizationInvite[]) {
  try {
    localStorage.setItem(`${STORAGE_INVITES_PREFIX}${orgId}`, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save invites:', e);
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
      try {
        const { data: rpcOrg, error: rpcError } = await supabase.rpc('create_organization', {
          p_name: input.name,
          p_industry: input.industry || 'College',
        });

        if (!rpcError && rpcOrg) {
          const org: Organization = rpcOrg;
          this.setActiveOrgId(org.id);
          const current = getStoredLocalOrgs().filter((o) => o.id !== org.id);
          saveStoredLocalOrgs([org, ...current]);
          return org;
        } else if (rpcError) {
          console.warn('create_organization RPC returned error, trying direct insert:', rpcError.message);
        }
      } catch (rpcEx) {
        console.warn('RPC call failed:', rpcEx);
      }

      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;

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

  /**
   * Generates a persistent workspace invite link with role delegation
   */
  async inviteMember(
    orgId: string,
    email: string,
    role: 'owner' | 'admin' | 'designer' | 'data_operator' | 'viewer' = 'admin'
  ): Promise<OrganizationInvite> {
    const token = generateUUID();
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteLink = `${baseUrl}/invite?orgId=${orgId}&token=${token}&role=${role}&email=${encodeURIComponent(email)}`;

    const invite: OrganizationInvite = {
      id: generateUUID(),
      organization_id: orgId,
      email: email.trim().toLowerCase(),
      role,
      token,
      invite_link: inviteLink,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Save to local cache
    const current = getStoredInvites(orgId);
    saveStoredInvites(orgId, [invite, ...current]);

    // Also persist in Supabase if configured
    if (isLiveSupabaseConfigured) {
      try {
        await supabase.from('organization_invites').insert([
          {
            organization_id: orgId,
            email: invite.email,
            role: invite.role,
            token: invite.token,
          },
        ]);
      } catch (e) {
        console.warn('Supabase invite insert exception:', e);
      }
    }

    return invite;
  },

  async getPendingInvites(orgId: string): Promise<OrganizationInvite[]> {
    return getStoredInvites(orgId).filter((i) => i.status === 'pending');
  },

  async revokeInvite(orgId: string, inviteId: string): Promise<boolean> {
    const list = getStoredInvites(orgId);
    const updated = list.map((i) => (i.id === inviteId ? { ...i, status: 'revoked' as const } : i));
    saveStoredInvites(orgId, updated);
    return true;
  },

  async acceptInvite(
    orgId: string,
    token: string,
    _email?: string,
    _role?: string
  ): Promise<{ success: boolean; org?: Organization | null }> {
    this.setActiveOrgId(orgId);
    const org = await this.getOrganizationById(orgId);

    // Mark as accepted locally
    const list = getStoredInvites(orgId);
    const updated = list.map((i) => (i.token === token ? { ...i, status: 'accepted' as const } : i));
    saveStoredInvites(orgId, updated);

    return { success: true, org };
  },
};
