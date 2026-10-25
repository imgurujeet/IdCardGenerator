import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Radio,
} from 'lucide-react';
import { formService } from '../../services/form.service';
import { FormEntity, FormSubmissionEntity } from '../../types/database';
import { formatDate } from '../../lib/utils';
import { subscribeToSync } from '../../lib/sync';

export const FormSubmissionsPage: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormEntity | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmissionEntity[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const loadData = async () => {
    if (!formId) return;
    try {
      const [formData, subsData] = await Promise.all([
        formService.getFormById(formId),
        formService.getSubmissions(formId),
      ]);
      setForm(formData);
      setSubmissions(subsData);
    } catch (e) {
      console.error('Failed to load submissions:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [formId]);

  // Real-time synchronization across browser tabs and windows
  useEffect(() => {
    const unsubscribe = subscribeToSync((payload) => {
      if (
        payload.type === 'SUBMISSIONS_UPDATED' ||
        payload.type === 'ALL' ||
        payload.type === 'FORMS_UPDATED'
      ) {
        loadData();
      }
    });
    return unsubscribe;
  }, [formId]);

  const handleToggleAutoApprove = async () => {
    if (!form) return;
    const nextVal = form.auto_approve === false ? true : false;
    setForm({ ...form, auto_approve: nextVal });
    try {
      await formService.updateForm(form.id, { auto_approve: nextVal });
    } catch (e) {
      console.error('Failed to toggle auto_approve:', e);
    }
  };

  const handleApproveAllPending = async () => {
    const pending = submissions.filter((s) => s.status === 'submitted');
    if (pending.length === 0) return;
    setIsApprovingAll(true);
    try {
      await formService.bulkApproveSubmissions(pending.map((s) => s.id));
      await loadData();
    } catch (err: any) {
      console.error('Failed to bulk approve:', err);
      alert(err.message || 'Error bulk approving submissions');
    } finally {
      setIsApprovingAll(false);
    }
  };

  const handleUpdateStatus = async (subId: string, status: 'approved' | 'rejected') => {
    setUpdatingId(subId);
    try {
      const success = await formService.updateSubmissionStatus(subId, status, true);
      if (success) {
        await loadData();
      } else {
        alert('Failed to update submission status.');
      }
    } catch (err: any) {
      console.error('Failed to update submission status:', err);
      alert(err.message || 'Error updating status');
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = submissions.filter((s) => s.status === 'submitted').length;

  const filteredSubs = submissions.filter((s) => {
    if (statusFilter === 'all') return true;
    return s.status === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/forms')}
            className="p-1.5 rounded-lg border border-surface-200 text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-surface-900">
                {form?.title || 'Form Submissions'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-surface-500 mt-0.5">
              Review and approve public student/employee submissions into verified organization records.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Auto-Approve Toggle */}
          {form && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-200 bg-surface-50 text-xs shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-surface-700 font-medium">Auto-Approve:</span>
              <button
                type="button"
                role="switch"
                aria-checked={form.auto_approve !== false}
                onClick={handleToggleAutoApprove}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.auto_approve !== false ? 'bg-emerald-600' : 'bg-surface-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    form.auto_approve !== false ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <span
                className={`font-semibold ${
                  form.auto_approve !== false ? 'text-emerald-700' : 'text-surface-500'
                }`}
              >
                {form.auto_approve !== false ? 'ON' : 'OFF'}
              </span>
            </div>
          )}

          {/* Bulk Approve Pending Button */}
          {pendingCount > 0 && (
            <button
              disabled={isApprovingAll}
              onClick={handleApproveAllPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              {isApprovingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Approve All Pending ({pendingCount})</span>
            </button>
          )}

          {form && (
            <button
              onClick={() => window.open(`/form/${form.public_slug}`, '_blank')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition-colors"
            >
              <span>Open Public Form</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'submitted', 'approved', 'rejected'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
              statusFilter === st
                ? 'bg-surface-900 text-white'
                : 'text-surface-600 hover:bg-surface-100'
            }`}
          >
            {st} ({submissions.filter((s) => (st === 'all' ? true : s.status === st)).length})
          </button>
        ))}
      </div>

      {/* Submissions List Table */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-subtle overflow-hidden">
        {filteredSubs.length === 0 ? (
          <div className="text-center py-12 text-surface-400 text-xs">
            No submissions found under this filter.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 border-b border-surface-200 text-surface-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Submitter / Candidate</th>
                <th className="px-5 py-3">Photo Preview</th>
                <th className="px-5 py-3">Details</th>
                <th className="px-5 py-3">Submission Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredSubs.map((sub) => {
                const data = sub.data || {};
                const name =
                  data['student_name'] ||
                  data['candidate_name'] ||
                  data['full_name'] ||
                  data['name'] ||
                  data['employee_name'] ||
                  'Unknown';
                const id =
                  data['student_roll'] ||
                  data['roll_no'] ||
                  data['roll'] ||
                  data['student_id'] ||
                  data['employee_id'] ||
                  data['Mobile_number'] ||
                  data['mobile'] ||
                  data['identifier'] ||
                  'N/A';
                const photo = data['photo_url'] || data['photo'] || data['image'];
                const isUpdating = updatingId === sub.id;

                return (
                  <tr key={sub.id} className="hover:bg-surface-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-surface-900 text-sm">{name}</p>
                      <p className="text-surface-500 font-mono text-xs">{id}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {photo ? (
                        <img
                          src={photo}
                          alt={name}
                          className="w-10 h-12 object-cover rounded border border-surface-200 shadow-2xs"
                        />
                      ) : (
                        <div className="w-10 h-12 rounded bg-surface-100 flex items-center justify-center text-[9px] text-surface-400 border border-surface-200">
                          No Photo
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs text-surface-600 space-y-0.5">
                        {data['student_roll'] && (
                          <p>
                            <span className="font-medium text-surface-700">Roll:</span> {data['student_roll']}
                          </p>
                        )}
                        {data['session'] && (
                          <p>
                            <span className="font-medium text-surface-700">Session:</span> {data['session']}
                          </p>
                        )}
                        {data['Father_name'] && (
                          <p>
                            <span className="font-medium text-surface-700">Father:</span> {data['Father_name']}
                          </p>
                        )}
                        {data['Mobile_number'] && (
                          <p>
                            <span className="font-medium text-surface-700">Mobile:</span> {data['Mobile_number']}
                          </p>
                        )}
                        {data['blood_group'] && (
                          <p>
                            <span className="font-medium text-surface-700">Blood:</span>{' '}
                            <span className="font-bold text-red-600">{data['blood_group']}</span>
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-surface-500 font-mono text-[11px]">
                      {formatDate(sub.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          sub.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sub.status === 'rejected'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {sub.status === 'submitted' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(sub.id, 'approved')}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Approve</span>
                          </button>
                          <button
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(sub.id, 'rejected')}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : sub.status === 'approved' ? (
                        <button
                          onClick={() => navigate('/records')}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 underline"
                        >
                          View in Records
                        </button>
                      ) : (
                        <span className="text-surface-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
