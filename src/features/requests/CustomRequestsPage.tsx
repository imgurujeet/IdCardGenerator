import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { formatDate } from '../../lib/utils';

interface RequestItem {
  id: string;
  title: string;
  orgType: string;
  description: string;
  status: 'submitted' | 'in_review' | 'in_progress' | 'completed';
  createdAt: string;
}

const STORAGE_REQUESTS_KEY = 'idforge_design_requests';

function getStoredRequests(): RequestItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredRequests(list: RequestItem[]) {
  try {
    localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save requests:', e);
  }
}

export const CustomRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<RequestItem[]>(getStoredRequests);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [orgType, setOrgType] = useState('College');
  const [desc, setDesc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) return;

    const newReq: RequestItem = {
      id: `req-${Date.now()}`,
      title,
      orgType,
      description: desc,
      status: 'submitted',
      createdAt: new Date().toISOString(),
    };

    const updated = [newReq, ...requests];
    setRequests(updated);
    saveStoredRequests(updated);
    setShowModal(false);
    setTitle('');
    setDesc('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Professional Template Requests</h1>
          <p className="text-sm text-surface-500 mt-1">
            Request our design team to craft custom, print-certified ID card layouts for your organization.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-subtle transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Request Custom Design</span>
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-surface-900 mb-1">No Custom Design Requests Yet</h3>
          <p className="text-xs text-surface-500 mb-6 leading-relaxed">
            Need a custom ID card layout for your college or school? Submit your requirements and our design team will prepare it for you.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Your First Request</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 shadow-subtle overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 border-b border-surface-200 text-surface-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Request Title</th>
                <th className="px-5 py-3">Organization Type</th>
                <th className="px-5 py-3">Requirements</th>
                <th className="px-5 py-3">Date Submitted</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-surface-50/70 transition-colors">
                  <td className="px-5 py-4 font-semibold text-surface-900 text-sm">{req.title}</td>
                  <td className="px-5 py-4 text-surface-700">{req.orgType}</td>
                  <td className="px-5 py-4 text-surface-600 max-w-xs truncate">{req.description}</td>
                  <td className="px-5 py-4 text-surface-500 font-mono">{formatDate(req.createdAt)}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                        req.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : req.status === 'in_progress'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {req.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card border border-surface-200 w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-surface-400 hover:text-surface-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-surface-900 mb-1">New Template Design Request</h2>
            <p className="text-xs text-surface-500 mb-5">
              Provide your brand guidelines, required fields, and card dimensions.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-surface-700 block mb-1">Request Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. University Faculty & Staff Pass"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="font-semibold text-surface-700 block mb-1">Organization Type</label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg outline-none focus:border-brand-500 bg-white"
                >
                  <option value="School">School / K-12</option>
                  <option value="University">College / University</option>
                  <option value="Hospital">Hospital / Healthcare</option>
                  <option value="Corporate">Corporate Office</option>
                  <option value="Event">Event / Conference</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-surface-700 block mb-1">Detailed Specifications</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State front/back requirements, hex colors, barcodes, or layout references..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg outline-none focus:border-brand-500"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-surface-600 hover:text-surface-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
