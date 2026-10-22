import { useEffect, useState } from 'react';
import { Building, Users, Plus, X, Copy, Check, Mail, Clock, Trash2 } from 'lucide-react';
import { organizationService, OrganizationInvite } from '../../services/organization.service';
import { Organization, OrganizationMember } from '../../types/database';

export const SettingsPage: React.FC = () => {
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<OrganizationInvite[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'designer' | 'data_operator' | 'viewer'>('admin');
  const [generatedInvite, setGeneratedInvite] = useState<OrganizationInvite | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const orgId = organizationService.getActiveOrgId();

  const loadOrgData = async () => {
    const [org, mems, invites] = await Promise.all([
      organizationService.getOrganizationById(orgId),
      organizationService.getMembers(orgId),
      organizationService.getPendingInvites(orgId),
    ]);
    setActiveOrg(org);
    setMembers(mems);
    setPendingInvites(invites);
  };

  useEffect(() => {
    loadOrgData();
  }, [orgId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      const invite = await organizationService.inviteMember(orgId, inviteEmail, inviteRole);
      setGeneratedInvite(invite);
      setPendingInvites((prev) => [invite, ...prev]);
    } catch (err: any) {
      alert('Failed to generate invitation: ' + err.message);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;
    await organizationService.revokeInvite(orgId, inviteId);
    setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
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

        {/* Pending Workspace Invitations */}
        {pendingInvites.length > 0 && (
          <div className="pt-4 border-t border-surface-200 space-y-2">
            <h3 className="text-xs font-bold text-surface-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Pending Invitations ({pendingInvites.length})</span>
            </h3>

            <div className="divide-y divide-surface-100 bg-surface-50 rounded-xl border border-surface-200 overflow-hidden">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-surface-900 font-mono">{inv.email}</p>
                    <div className="flex items-center gap-2 text-[11px] text-surface-500">
                      <span className="capitalize font-medium text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded border border-brand-200">
                        {inv.role.replace('_', ' ')}
                      </span>
                      <span>•</span>
                      <span>Sent {new Date(inv.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyLink(inv.invite_link)}
                      className="px-2.5 py-1 bg-white hover:bg-surface-100 border border-surface-300 text-surface-700 rounded-md font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                      title="Copy invitation link"
                    >
                      <Copy className="w-3 h-3 text-surface-500" />
                      <span>Copy Link</span>
                    </button>
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      className="p-1 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Revoke invitation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card border border-surface-200 w-full max-w-md p-6 relative">
            <button
              onClick={() => {
                setShowInviteModal(false);
                setGeneratedInvite(null);
              }}
              className="absolute top-4 right-4 text-surface-400 hover:text-surface-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-surface-900 mb-1">Invite Team Member</h2>
            <p className="text-xs text-surface-500 mb-5">
              Send an invitation link with role-based permissions to collaborate in this workspace.
            </p>

            {generatedInvite ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Invitation Link Generated!</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Share this link with <strong>{generatedInvite.email}</strong>. Once they click, they will automatically join as <strong>{generatedInvite.role.replace('_', ' ')}</strong>.
                  </p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={generatedInvite.invite_link}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded font-mono text-emerald-950 outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(generatedInvite.invite_link)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shrink-0 flex items-center gap-1 shadow-xs transition-colors"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`mailto:${generatedInvite.email}?subject=Invitation to join ${activeOrg?.name || 'Workspace'}&body=Hello,%0D%0A%0D%0AYou have been invited to join ${activeOrg?.name || 'our organization'} on the ID Card Generator platform.%0D%0A%0D%0AClick the link below to accept and get started:%0D%0A${encodeURIComponent(generatedInvite.invite_link)}`}
                    className="flex-1 py-2 px-3 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Link</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedInvite(null);
                      setInviteEmail('');
                    }}
                    className="py-2 px-3 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Invite Another
                  </button>
                </div>
              </div>
            ) : (
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
                    Generate Invite Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
