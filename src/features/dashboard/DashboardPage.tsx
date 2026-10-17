import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Layout,
  FileCheck2,
  Printer,
  Plus,
  Upload,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { organizationService } from '../../services/organization.service';
import { templateService } from '../../services/template.service';
import { recordService } from '../../services/record.service';
import { formService } from '../../services/form.service';
import { TemplateEntity, RecordEntity, FormEntity } from '../../types/database';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateEntity[]>([]);
  const [records, setRecords] = useState<RecordEntity[]>([]);
  const [forms, setForms] = useState<FormEntity[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const orgId = organizationService.getActiveOrgId();

        const [tList, rList, fList] = await Promise.all([
          templateService.getTemplates(orgId),
          recordService.getRecords(orgId),
          formService.getForms(orgId),
        ]);

        setTemplates(tList);
        setRecords(rList.records);
        setForms(fList);
      } catch (e) {
        console.error('Failed to load dashboard metrics:', e);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const approvedRecords = records.filter((r) => r.status === 'approved').length;
  const pendingRecords = records.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Workspace Dashboard</h1>
          <p className="text-sm text-surface-500 mt-1">
            Manage ID templates, student & staff records, collection forms, and batch printing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/records?import=true')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-surface-700 bg-white border border-surface-300 hover:border-surface-400 rounded-lg shadow-subtle transition-colors"
          >
            <Upload className="w-4 h-4 text-surface-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => navigate('/templates?create=true')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-subtle transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New ID Template</span>
          </button>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">Total Records</span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-surface-900">{records.length}</span>
            <p className="text-xs text-surface-500 mt-0.5">
              <span className="font-semibold text-emerald-600">{approvedRecords} approved</span> • {pendingRecords} pending
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">Active Templates</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layout className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-surface-900">{templates.length}</span>
            <p className="text-xs text-surface-500 mt-0.5">Ready for individual & bulk batch exports</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">Collection Forms</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-surface-900">{forms.length}</span>
            <p className="text-xs text-surface-500 mt-0.5">
              {forms.filter((f) => f.is_published).length} published online
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">Cards Ready</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-surface-900">{approvedRecords}</span>
            <p className="text-xs text-surface-500 mt-0.5">Approved records ready for PDF printing</p>
          </div>
        </div>
      </div>

      {/* Templates Section Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-surface-900">Your ID Card Templates</h2>
            <p className="text-xs text-surface-500">Click to open directly in the visual drag-and-drop designer.</p>
          </div>
          <button
            onClick={() => navigate('/templates')}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            <span>View All Templates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-surface-300 p-8 text-center shadow-xs">
            <p className="text-xs font-bold text-surface-800 mb-1">No Templates Created Yet</p>
            <p className="text-xs text-surface-500 mb-3">Create your first card template with the Bihar PTEC preset or a blank canvas.</p>
            <button
              onClick={() => navigate('/templates?create=true')}
              className="px-3.5 py-2 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition-colors shadow-xs"
            >
              + Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => navigate(`/editor/${tmpl.id}`)}
                className="group bg-white rounded-xl border border-surface-200 hover:border-brand-500 hover:shadow-card transition-all cursor-pointer p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 bg-surface-100 rounded-lg border border-surface-200 flex items-center justify-center p-3 relative overflow-hidden group-hover:bg-brand-50/30 transition-colors">
                    {/* Decorative badge card preview outline */}
                    <div className="w-24 h-36 bg-white rounded shadow-sm border border-surface-300 p-2 flex flex-col items-center justify-between">
                      <div className="w-full h-3 bg-brand-600 rounded-xs" />
                      <div className="w-8 h-10 rounded bg-surface-200" />
                      <div className="w-full space-y-1">
                        <div className="w-12 h-1.5 bg-surface-800 rounded mx-auto" />
                        <div className="w-8 h-1 bg-surface-400 rounded mx-auto" />
                      </div>
                      <div className="w-5 h-5 bg-surface-300 rounded" />
                    </div>
                    <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white/90 border border-surface-200 text-surface-700">
                      {tmpl.category}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-semibold text-sm text-surface-900 group-hover:text-brand-600 transition-colors">
                      {tmpl.name}
                    </h3>
                    <p className="text-xs text-surface-500 line-clamp-2 mt-1 leading-relaxed">
                      {tmpl.description || 'Custom ID badge template configured for standard CR80 physical card dimensions.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between text-xs font-semibold text-brand-600">
                  <span>Launch Visual Editor</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two-Column Bottom Split: Recent Records & Public Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Records */}
        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-surface-900">Recent Records</h3>
              <p className="text-xs text-surface-500">People eligible for ID card printing</p>
            </div>
            <button
              onClick={() => navigate('/records')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Manage All
            </button>
          </div>

          {records.length === 0 ? (
            <div className="py-8 text-center text-xs text-surface-400">
              No student or staff records yet. Click <button type="button" onClick={() => navigate('/records?import=true')} className="font-bold text-brand-600 hover:underline">Import CSV</button> or share a <button type="button" onClick={() => navigate('/forms')} className="font-bold text-brand-600 hover:underline">Collection Form</button>.
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {records.slice(0, 4).map((rec) => (
                <div key={rec.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                      {rec.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-xs text-surface-900">{rec.full_name}</p>
                      <p className="text-[11px] text-surface-400 font-mono">{rec.identifier}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        rec.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Public Collection Forms */}
        <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-surface-900">Data Collection Forms</h3>
              <p className="text-xs text-surface-500">Shareable public forms for students/staff</p>
            </div>
            <button
              onClick={() => navigate('/forms')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Form Builder
            </button>
          </div>

          {forms.length === 0 ? (
            <div className="py-8 text-center text-xs text-surface-400">
              No collection forms created yet. Click <button type="button" onClick={() => navigate('/forms')} className="font-bold text-brand-600 hover:underline">Form Builder</button> to create a public link for students.
            </div>
          ) : (
            <div className="space-y-3">
              {forms.map((f) => (
                <div key={f.id} className="p-3 rounded-lg border border-surface-200 bg-surface-50/50 flex items-center justify-between">
                  <div className="truncate mr-3">
                    <p className="font-semibold text-xs text-surface-900 truncate">{f.title}</p>
                    <p className="text-[11px] text-surface-500 font-mono truncate">/form/{f.public_slug}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => window.open(`/form/${f.public_slug}`, '_blank')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded border border-brand-200 transition-colors"
                    >
                      <span>Open Form</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
