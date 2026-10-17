import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEditorStore } from './store/useEditorStore';
import { templateService } from '../../services/template.service';
import { formService } from '../../services/form.service';
import { EditorToolbar } from './components/EditorToolbar';
import { ElementsSidebar } from './components/ElementsSidebar';
import { CanvasViewport } from './canvas/CanvasViewport';
import { PropertiesSidebar } from './components/PropertiesSidebar';
import { organizationService } from '../../services/organization.service';
import { recordService } from '../../services/record.service';
import { PTEC_TEMPLATE_DOC } from '../../services/mockData';

export const EditorPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const linkedFormId = searchParams.get('formId');
  const navigate = useNavigate();
  const { setDocument, setAvailableSampleRecords, document: doc } = useEditorStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplate() {
      try {
        setLoading(true);
        const orgId = organizationService.getActiveOrgId();

        // 1. If linked to a specific form, fetch its schema and generate mock preview records
        let formSampleRecord: Record<string, any> | null = null;
        if (linkedFormId) {
          const form = await formService.getFormById(linkedFormId);
          if (form && Array.isArray(form.fields_schema)) {
            const sample: Record<string, any> = {};
            form.fields_schema.forEach((f) => {
              if (f.key) {
                if (f.type === 'number') sample[f.key] = '101';
                else if (f.type === 'select') sample[f.key] = f.options?.[0] || 'A+';
                else if (f.type === 'date') sample[f.key] = '2003-08-15';
                else if (f.type === 'india_pincode') sample[f.key] = '803221';
                else if (f.type === 'image_upload') sample[f.key] = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
                else if (f.key.includes('name')) sample[f.key] = 'Aditya Kumar';
                else sample[f.key] = f.label || 'Sample Data';
              }
            });
            formSampleRecord = sample;
          }
        }

        // 2. Load college records for live preview in canvas toolbar
        const recRes = await recordService.getRecords(orgId);
        const recordsList: Record<string, any>[] = [];
        if (formSampleRecord) {
          recordsList.push(formSampleRecord);
        }
        if (recRes.records && recRes.records.length > 0) {
          recordsList.push(...recRes.records.map((r) => r.data));
        }
        if (recordsList.length > 0) {
          setAvailableSampleRecords(recordsList);
        }

        // 3. Load or initialize template document
        if (templateId && templateId !== 'new') {
          const res = await templateService.getTemplateById(templateId);
          if (res && res.activeVersion) {
            setDocument(res.activeVersion.design_data);
          } else {
            setDocument(PTEC_TEMPLATE_DOC);
          }
        } else {
          setDocument(PTEC_TEMPLATE_DOC);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load template.');
      } finally {
        setLoading(false);
      }
    }

    loadTemplate();
  }, [templateId, linkedFormId, setDocument, setAvailableSampleRecords]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-surface-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
        <p className="text-sm font-medium text-surface-600">Initializing Canvas Editor Engine...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-surface-50 p-6 text-center">
        <div className="p-4 bg-red-50 text-red-700 rounded-xl max-w-md border border-red-200 mb-4">
          <p className="font-semibold mb-1">Editor Error</p>
          <p className="text-sm">{error || 'Could not load template document.'}</p>
        </div>
        <button
          onClick={() => navigate('/templates')}
          className="flex items-center gap-2 px-4 py-2 bg-surface-900 text-white rounded-lg text-sm font-medium hover:bg-surface-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Templates Gallery</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-surface-100">
      {/* Top Controls Toolbar */}
      <EditorToolbar />

      {/* Main 3-Panel Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Elements & Layers */}
        <ElementsSidebar />

        {/* Center Interactive Canvas */}
        <CanvasViewport />

        {/* Right Properties Inspector */}
        <PropertiesSidebar />
      </div>
    </div>
  );
};
