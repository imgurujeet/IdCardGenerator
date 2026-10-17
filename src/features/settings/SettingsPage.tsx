import { useEffect, useState } from 'react';
import { Building, Users, Plus, X } from 'lucide-react';
import { organizationService } from '../../services/organization.service';
import { Organization, OrganizationMember } from '../../types/database';

export const SettingsPage: React.FC = () => {
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'designer' | 'data_operator' | 'viewer'>('designer');
  const orgId = organizationService.getActiveOrgId();

  useEffect(() => {
    async function loadOrgData() {
      const [org, mems] = await Promise.all([
        organizationService.getOrganizationById(orgId),
        organizationService.getMembers(orgId),
      ]);
      setActiveOrg(org);
      setMembers(mems);
    }
    loadOrgData();
  }, [orgId]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newMember: OrganizationMember = {
      id: `mem-${Date.now()}`,
      organization_id: orgId,
      user_id: `user-${Date.now()}`,
      role: inviteRole,
      created_at: new Date().toISOString(),
      profile: {
        id: `user-${Date.now()}`,
        email: inviteEmail,
        full_name: inviteEmail.split('@')[0],
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    setMembers([...members, newMember]);
    setShowInviteModal(false);
    setInviteEmail('');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900">Organization Settings</h1>
        <p className="text-sm text-surface-500 mt-1">
          Manage workspace identity, security, roles, and member access.
        </p>
      </div>

      {/* Organization Identity */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-subtle p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-surface-100 pb-3">
          <Building className="w-5 h-5 text-brand-600" />
          <h2 className="text-base font-semibold text-surface-900">Workspace Profile</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-surface-700 block mb-1">Organization Legal Name</label>
            <input
              type="text"
              readOnly
              value={activeOrg?.name || 'Oakwood International Academy'}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg bg-surface-50 text-surface-900 outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-surface-700 block mb-1">Industry / Sector</label>
            <input
              type="text"
              readOnly
              value={activeOrg?.industry || 'K-12 Education'}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg bg-surface-50 text-surface-900 outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-surface-700 block mb-1">Workspace Slug</label>
            <input
              type="text"
              readOnly
              value={activeOrg?.slug || 'oakwood-academy'}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg bg-surface-50 text-surface-900 font-mono outline-none"
            />
          </div>
        </div>
      </div>

      {/* Team Members & Roles */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-subtle p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-surface-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-surface-900">Team Members & Access</h2>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-subtle transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Invite Member</span>
          </button>
        </div>

        <div className="divide-y divide-surface-100">
          {members.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center">
                  {m.profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-surface-900">{m.profile?.full_name}</p>
                  <p className="text-[11px] text-surface-500 font-mono">{m.profile?.email}</p>
                </div>
              </div>

              <span className="capitalize px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-100 text-surface-700 border border-surface-200">
                {m.role.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card border border-surface-200 w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-surface-400 hover:text-surface-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-surface-900 mb-1">Invite Team Member</h2>
            <p className="text-xs text-surface-500 mb-5">
              Send an invitation to join your workspace with role-based permissions.
            </p>

            <form onSubmit={handleInvite} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-surface-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@organization.edu"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-semibold text-surface-700 block mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg outline-none focus:border-brand-500 bg-white"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="designer">Designer (Templates & Assets)</option>
                  <option value="data_operator">Data Operator (Records & Printing)</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                </select>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 font-semibold text-surface-600 hover:text-surface-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
