import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  School,
  Building2,
  GraduationCap,
  Hospital,
  Ticket,
  X,
} from 'lucide-react';
import { organizationService } from '../../services/organization.service';
import { templateService } from '../../services/template.service';
import { TemplateEntity } from '../../types/database';
import { OAKWOOD_TEMPLATE_DOC, NEXACORP_TEMPLATE_DOC, PTEC_TEMPLATE_DOC } from '../../services/mockData';

const CATEGORIES = [
  { id: 'all', label: 'All Templates' },
  { id: 'college', label: 'Colleges & Universities', icon: GraduationCap },
  { id: 'school', label: 'Schools', icon: School },
  { id: 'corporate', label: 'Corporate', icon: Building2 },
  { id: 'hospital', label: 'Medical & Hospital', icon: Hospital },
  { id: 'event', label: 'Events & Badges', icon: Ticket },
];

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [templates, setTemplates] = useState<TemplateEntity[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // New Template Modal state
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('create') === 'true');
  const [newTmplName, setNewTmplName] = useState('');
  const [newTmplCategory, setNewTmplCategory] = useState<'school' | 'corporate' | 'college' | 'hospital' | 'event'>('college');
  const [newTmplPreset, setNewTmplPreset] = useState<'CR80_PORTRAIT' | 'CR80_LANDSCAPE' | 'EVENT_BADGE'>('CR80_PORTRAIT');
  const [starterLayout, setStarterLayout] = useState<'blank' | 'ptec' | 'school' | 'corporate'>('ptec');
  const [isCreating, setIsCreating] = useState(false);

  const orgId = organizationService.getActiveOrgId();

  const loadTemplates = async () => {
    try {
      const list = await templateService.getTemplates(orgId, selectedCategory);
      setTemplates(list);
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, orgId]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplName.trim()) return;

    try {
      setIsCreating(true);
      let initialDoc = undefined;

      if (starterLayout === 'ptec') {
        initialDoc = {
          ...PTEC_TEMPLATE_DOC,
          id: `tmpl-${Date.now()}`,
          name: newTmplName,
          category: newTmplCategory,
        };
      } else if (starterLayout === 'school') {
        initialDoc = {
          ...OAKWOOD_TEMPLATE_DOC,
          id: `tmpl-${Date.now()}`,
          name: newTmplName,
          category: newTmplCategory,
          orientation: (newTmplPreset === 'CR80_LANDSCAPE' ? 'landscape' : 'portrait') as any,
        };
      } else if (starterLayout === 'corporate') {
        initialDoc = {
          ...NEXACORP_TEMPLATE_DOC,
          id: `tmpl-${Date.now()}`,
          name: newTmplName,
          category: newTmplCategory,
          orientation: (newTmplPreset === 'CR80_LANDSCAPE' ? 'landscape' : 'portrait') as any,
        };
      }

      const res = await templateService.createTemplate(orgId, {
        name: newTmplName,
        category: newTmplCategory,
        initialDoc,
      });

      setShowCreateModal(false);
      navigate(`/editor/${res.template.id}`);
    } catch (err) {
      console.error('Failed to create template:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this template?')) {
      await templateService.deleteTemplate(templateId);
      loadTemplates();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">ID Card Templates</h1>
          <p className="text-sm text-surface-500 mt-1">
            Design, customize, and maintain physical ID badge layouts with millimetric precision.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-subtle transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Template</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-surface-100">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 border border-brand-200'
                  : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100 border border-transparent'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Templates Grid or Empty State */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-surface-900 mb-1">No ID Card Templates Yet</h3>
          <p className="text-xs text-surface-500 mb-6 leading-relaxed">
            Create your first ID card template for this college. You can start with our Bihar PTEC Both-Sided preset or start with a custom blank canvas.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setNewTmplName('PTEC Barh Both-Sided Student Card');
                setStarterLayout('ptec');
                setShowCreateModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Use PTEC Both-Sided Preset</span>
            </button>
            <button
              onClick={() => {
                setNewTmplName('');
                setStarterLayout('blank');
                setShowCreateModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Blank Custom Template</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => navigate(`/editor/${tmpl.id}`)}
              className="group bg-white rounded-xl border border-surface-200 hover:border-brand-500 hover:shadow-card transition-all cursor-pointer p-4 flex flex-col justify-between"
            >
              <div>
                {/* Preview Thumbnail Box */}
                <div className="h-48 bg-surface-100 rounded-lg border border-surface-200 flex items-center justify-center p-4 relative overflow-hidden group-hover:bg-brand-50/20 transition-colors">
                  {tmpl.category === 'corporate' ? (
                    /* Landscape Preview Outline */
                    <div className="w-44 h-28 bg-surface-900 rounded-md shadow-md border border-surface-700 p-2.5 flex items-center gap-3">
                      <div className="w-1.5 h-full bg-brand-500 rounded" />
                      <div className="w-12 h-16 rounded bg-surface-800 border border-surface-600 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="w-20 h-2 bg-white rounded" />
                        <div className="w-14 h-1.5 bg-brand-400 rounded" />
                        <div className="w-16 h-1 bg-surface-500 rounded" />
                      </div>
                    </div>
                  ) : (
                    /* Portrait Preview Outline */
                    <div className="w-28 h-40 bg-white rounded-md shadow-md border border-surface-300 p-2.5 flex flex-col items-center justify-between">
                      <div className="w-full h-4 bg-brand-700 rounded-xs" />
                      <div className="w-10 h-12 rounded bg-surface-200 border border-brand-200" />
                      <div className="w-full space-y-1">
                        <div className="w-16 h-1.5 bg-surface-900 rounded mx-auto" />
                        <div className="w-10 h-1 bg-surface-400 rounded mx-auto" />
                      </div>
                      <div className="w-6 h-6 bg-surface-300 rounded" />
                    </div>
                  )}

                  <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white/90 border border-surface-200 text-surface-700 shadow-xs">
                    {tmpl.category}
                  </span>
                </div>

                {/* Title & Description */}
                <div className="mt-3.5">
                  <h3 className="font-semibold text-sm text-surface-900 group-hover:text-brand-600 transition-colors">
                    {tmpl.name}
                  </h3>
                  <p className="text-xs text-surface-500 line-clamp-2 mt-1 leading-relaxed">
                    {tmpl.description || 'Custom ID badge template configured for standard CR80 physical card dimensions.'}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-brand-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Open in Canvas <Sliders className="w-3.5 h-3.5 ml-1" />
                </span>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/editor/${tmpl.id}`);
                    }}
                    title="Open editor and generate registration form"
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>Create Form</span>
                  </button>

                  <button
                    onClick={(e) => handleDelete(tmpl.id, e)}
                    title="Delete Template"
                    className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create New Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card border border-surface-200 w-full max-w-lg p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-surface-400 hover:text-surface-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-brand-600" />
              <h2 className="text-lg font-bold text-surface-900">Create New ID Template</h2>
            </div>
            <p className="text-xs text-surface-500 mb-5">
              Choose card orientation, physical dimensions preset, and starting design layout.
            </p>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={newTmplName}
                  onChange={(e) => setNewTmplName(e.target.value)}
                  placeholder="e.g. 2026-27 High School Student Badge"
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs text-surface-900 focus:border-brand-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">Category</label>
                  <select
                    value={newTmplCategory}
                    onChange={(e) => setNewTmplCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs text-surface-900 focus:border-brand-500 outline-none bg-white"
                  >
                    <option value="school">School / K-12</option>
                    <option value="college">University / College</option>
                    <option value="corporate">Corporate / Employee</option>
                    <option value="hospital">Hospital & Healthcare</option>
                    <option value="event">Event & VIP Pass</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-700 block mb-1">Dimensions Preset</label>
                  <select
                    value={newTmplPreset}
                    onChange={(e) => setNewTmplPreset(e.target.value as any)}
                    className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs text-surface-900 focus:border-brand-500 outline-none bg-white"
                  >
                    <option value="CR80_PORTRAIT">CR80 Portrait (54×85.6mm)</option>
                    <option value="CR80_LANDSCAPE">CR80 Landscape (85.6×54mm)</option>
                    <option value="EVENT_BADGE">Event Badge (102×152mm)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-700 block mb-1">Starting Layout</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setStarterLayout('ptec')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      starterLayout === 'ptec'
                        ? 'border-brand-500 bg-brand-50 text-brand-900 font-semibold ring-1 ring-brand-500'
                        : 'border-surface-200 text-surface-700 hover:bg-surface-50'
                    }`}
                  >
                    <p className="font-semibold text-brand-700">⭐ Bihar PTEC</p>
                    <p className="text-[10px] text-surface-500 font-normal mt-0.5">Two-sided with college bg</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStarterLayout('school')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      starterLayout === 'school'
                        ? 'border-brand-500 bg-brand-50 text-brand-900 font-semibold ring-1 ring-brand-500'
                        : 'border-surface-200 text-surface-700 hover:bg-surface-50'
                    }`}
                  >
                    <p className="font-semibold">Academic</p>
                    <p className="text-[10px] text-surface-500 font-normal mt-0.5">Photo + QR + blood group</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStarterLayout('corporate')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      starterLayout === 'corporate'
                        ? 'border-brand-500 bg-brand-50 text-brand-900 font-semibold'
                        : 'border-surface-200 text-surface-700 hover:bg-surface-50'
                    }`}
                  >
                    <p className="font-semibold">Corporate</p>
                    <p className="text-[10px] text-surface-500 font-normal">Dark tech + horizontal pass</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStarterLayout('blank')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      starterLayout === 'blank'
                        ? 'border-brand-500 bg-brand-50 text-brand-900 font-semibold'
                        : 'border-surface-200 text-surface-700 hover:bg-surface-50'
                    }`}
                  >
                    <p className="font-semibold">Blank Canvas</p>
                    <p className="text-[10px] text-surface-500 font-normal">Minimal starter elements</p>
                  </button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-surface-600 hover:text-surface-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create & Open Editor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
