import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEditorStore } from './store/useEditorStore';
import { templateService } from '../../services/template.service';
import { EditorToolbar } from './components/EditorToolbar';
import { ElementsSidebar } from './components/ElementsSidebar';
import { CanvasViewport } from './canvas/CanvasViewport';
import { PropertiesSidebar } from './components/PropertiesSidebar';
import { OAKWOOD_TEMPLATE_DOC } from '../../services/mockData';

export const EditorPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { setDocument, document: doc } = useEditorStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplate() {
      try {
        setLoading(true);
        if (templateId && templateId !== 'new') {
          const res = await templateService.getTemplateById(templateId);
          if (res && res.activeVersion) {
            setDocument(res.activeVersion.design_data);
          } else {
            setDocument(OAKWOOD_TEMPLATE_DOC);
          }
        } else {
          setDocument(OAKWOOD_TEMPLATE_DOC);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load template.');
      } finally {
        setLoading(false);
      }
    }

    loadTemplate();
  }, [templateId, setDocument]);

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
