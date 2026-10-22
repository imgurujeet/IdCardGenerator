import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, ArrowRight, Building } from 'lucide-react';
import { organizationService } from '../../services/organization.service';

export const InviteAcceptPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orgId = searchParams.get('orgId');
  const token = searchParams.get('token');
  const role = searchParams.get('role') || 'admin';
  const email = searchParams.get('email') || '';

  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState<string>('Workspace');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveInvite() {
      if (!orgId || !token) {
        setError('Invalid or incomplete invitation link. Please request a new invite.');
        setLoading(false);
        return;
      }

      try {
        const org = await organizationService.getOrganizationById(orgId);
        if (org) {
          setOrgName(org.name);
        }
      } catch (err) {
        console.warn('Failed to load org for invite:', err);
      } finally {
        setLoading(false);
      }
    }

    resolveInvite();
  }, [orgId, token]);

  const handleAccept = async () => {
    if (!orgId || !token) return;
    try {
      setLoading(true);
      await organizationService.acceptInvite(orgId, token, email, role);
      setAccepted(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
        <p className="text-sm font-medium text-surface-600">Verifying Workspace Invitation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-surface-200 shadow-card text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-surface-900">Invitation Error</h2>
          <p className="text-xs text-surface-500 leading-relaxed">{error}</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <span>Go to Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-surface-200 shadow-card text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-surface-900">Welcome to {orgName}!</h2>
          <p className="text-xs text-surface-500 leading-relaxed">
            Your invitation as <strong>{role.replace('_', ' ')}</strong> has been activated. Redirecting you to your workspace dashboard...
          </p>
          <Loader2 className="w-5 h-5 animate-spin text-brand-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-surface-200 shadow-card text-center space-y-5">
        <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto border border-brand-200 shadow-sm">
          <Building className="w-7 h-7" />
        </div>

        <div>
          <span className="text-[11px] font-bold text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Workspace Invitation
          </span>
          <h1 className="text-xl font-bold text-surface-900 mt-2">Join {orgName}</h1>
          <p className="text-xs text-surface-500 mt-1">
            You have been invited to collaborate with role permissions:
          </p>
        </div>

        <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 text-left space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-500">Email:</span>
            <span className="font-semibold text-surface-900 font-mono">{email || 'You'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-500">Delegated Role:</span>
            <span className="capitalize font-bold text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded">
              {role.replace('_', ' ')}
            </span>
          </div>
        </div>

        <button
          onClick={handleAccept}
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Accept Invitation & Enter Workspace</span>
        </button>

        <p className="text-[11px] text-surface-400">
          Already have an account? Your login will be automatically associated with this organization.
        </p>
      </div>
    </div>
  );
};
