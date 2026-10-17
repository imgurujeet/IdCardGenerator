import React, { useState } from 'react';
import {
  Type,
  Square,
  Circle,
  QrCode,
  Barcode,
  Image as ImageIcon,
  User,
  Layers,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Minus,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

export const ElementsSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'elements' | 'layers'>('elements');
  const {
    document: doc,
    activeSide,
    selectedElementId,
    addElement,
    setSelectedElementId,
    updateElement,
    deleteElement,
    duplicateElement,
    reorderElement,
  } = useEditorStore();

  if (!doc) return null;

  const currentLayout = activeSide === 'back' && doc.layouts.back ? doc.layouts.back : doc.layouts.front;
  const elements = [...currentLayout.elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)); // Top layers first

  return (
    <aside className="w-72 bg-white border-r border-surface-200 flex flex-col shrink-0 select-none z-10">
      {/* Tab Switcher */}
      <div className="flex border-b border-surface-200 p-1 bg-surface-50">
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'elements' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600 hover:text-surface-900'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Elements</span>
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'layers' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600 hover:text-surface-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Layers ({currentLayout.elements.length})</span>
        </button>
      </div>

      {/* Tab 1: Elements Library */}
      {activeTab === 'elements' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Dynamic Data Fields */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-surface-900 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-600" /> Dynamic Data Fields
              </span>
            </div>
            <p className="text-[11px] text-surface-500 mb-2 leading-relaxed">
              Binds to record fields automatically during single & bulk printing.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  addElement({
                    type: 'dynamic-text',
                    name: 'Student Name',
                    content: '{{student_name}}',
                    fieldKey: 'student_name',
                    fallback: 'FULL NAME',
                    fontSize: 6.5,
                    fontWeight: 'bold',
                    width: 45,
                    height: 6,
                  })
                }
                className="flex items-center gap-2 p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <Type className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="truncate">Full Name</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'dynamic-text',
                    name: 'Student ID',
                    content: '{{student_id}}',
                    fieldKey: 'student_id',
                    fallback: 'ID-00000',
                    fontSize: 4,
                    fontWeight: 'semibold',
                    width: 30,
                    height: 4,
                  })
                }
                className="flex items-center gap-2 p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <Type className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="truncate">ID Number</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'dynamic-text',
                    name: 'Grade / Class',
                    content: '{{grade}} - {{section}}',
                    fieldKey: 'grade',
                    fallback: 'Grade 10',
                    fontSize: 4,
                    fontWeight: 'medium',
                    width: 30,
                    height: 4,
                  })
                }
                className="flex items-center gap-2 p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <Type className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="truncate">Class / Grade</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'dynamic-text',
                    name: 'Blood Group',
                    content: '{{blood_group}}',
                    fieldKey: 'blood_group',
                    fallback: 'O+',
                    fontSize: 4,
                    fontWeight: 'bold',
                    color: '#dc2626',
                    width: 20,
                    height: 4,
                  })
                }
                className="flex items-center gap-2 p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <Type className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="truncate">Blood Group</span>
              </button>
            </div>
          </div>

          {/* Static Typography */}
          <div>
            <span className="text-xs font-semibold text-surface-900 uppercase tracking-wider block mb-2">
              Static Text
            </span>
            <div className="space-y-1.5">
              <button
                onClick={() =>
                  addElement({
                    type: 'text',
                    name: 'Card Header',
                    content: 'ORGANIZATION NAME',
                    fontSize: 7.5,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    width: 45,
                    height: 6,
                  })
                }
                className="w-full flex items-center justify-between p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/40 text-left text-xs font-semibold text-surface-900 transition-colors"
              >
                <span>Add Header Title</span>
                <span className="text-[10px] text-surface-400">Bold 7.5pt</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'text',
                    name: 'Subtitle',
                    content: 'STUDENT IDENTIFICATION',
                    fontSize: 4.2,
                    fontWeight: 'medium',
                    textAlign: 'center',
                    width: 40,
                    height: 4,
                  })
                }
                className="w-full flex items-center justify-between p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/40 text-left text-xs text-surface-700 transition-colors"
              >
                <span>Add Subtitle / Badge Type</span>
                <span className="text-[10px] text-surface-400">Medium 4.2pt</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'text',
                    name: 'Field Label',
                    content: 'EXPIRY DATE: 2027',
                    fontSize: 3.5,
                    fontWeight: 'normal',
                    width: 35,
                    height: 3.5,
                  })
                }
                className="w-full flex items-center justify-between p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/40 text-left text-xs text-surface-600 transition-colors"
              >
                <span>Add Small Body / Label</span>
                <span className="text-[10px] text-surface-400">Regular 3.5pt</span>
              </button>
            </div>
          </div>

          {/* Photo & Logo Frames */}
          <div>
            <span className="text-xs font-semibold text-surface-900 uppercase tracking-wider block mb-2">
              Photo & Imagery
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  addElement({
                    type: 'portrait',
                    name: 'Portrait Photo',
                    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
                    fieldKey: 'photo_url',
                    objectFit: 'cover',
                    borderRadius: 2,
                    borderColor: '#1e3a8a',
                    borderWidth: 0.5,
                    width: 25,
                    height: 30,
                  })
                }
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-center gap-1.5 text-xs font-medium text-surface-800 transition-colors"
              >
                <User className="w-5 h-5 text-brand-600" />
                <span>Portrait Box</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'logo',
                    name: 'Org Logo',
                    src: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=200&q=80',
                    objectFit: 'contain',
                    width: 15,
                    height: 15,
                  })
                }
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-center gap-1.5 text-xs font-medium text-surface-800 transition-colors"
              >
                <ImageIcon className="w-5 h-5 text-brand-600" />
                <span>Logo Frame</span>
              </button>
            </div>
          </div>

          {/* Shapes & Accents */}
          <div>
            <span className="text-xs font-semibold text-surface-900 uppercase tracking-wider block mb-2">
              Shapes & Accents
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() =>
                  addElement({
                    type: 'shape',
                    shapeType: 'rectangle',
                    name: 'Header Banner',
                    fillColor: '#1e3a8a',
                    width: 53.98,
                    height: 16,
                  })
                }
                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-center gap-1 text-xs font-medium text-surface-800 transition-colors"
              >
                <Square className="w-4 h-4 text-surface-700" />
                <span className="text-[11px]">Banner</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'shape',
                    shapeType: 'circle',
                    name: 'Seal Circle',
                    fillColor: '#e0e7ff',
                    strokeColor: '#4f46e5',
                    strokeWidth: 0.5,
                    width: 16,
                    height: 16,
                  })
                }
                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-center gap-1 text-xs font-medium text-surface-800 transition-colors"
              >
                <Circle className="w-4 h-4 text-surface-700" />
                <span className="text-[11px]">Circle</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'shape',
                    shapeType: 'rectangle',
                    name: 'Divider Line',
                    fillColor: '#cbd5e1',
                    width: 45,
                    height: 0.5,
                  })
                }
                className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-center gap-1 text-xs font-medium text-surface-800 transition-colors"
              >
                <Minus className="w-4 h-4 text-surface-700" />
                <span className="text-[11px]">Line</span>
              </button>
            </div>
          </div>

          {/* Verification Codes */}
          <div>
            <span className="text-xs font-semibold text-surface-900 uppercase tracking-wider block mb-2">
              Verification Codes
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  addElement({
                    type: 'qr-code',
                    name: 'Verification QR',
                    dataContent: 'https://idforge.io/verify/{{student_id}}',
                    fieldKey: 'student_id',
                    width: 14,
                    height: 14,
                  })
                }
                className="flex items-center gap-2 p-2.5 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <QrCode className="w-4 h-4 text-brand-600 shrink-0" />
                <span>QR Code</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'barcode',
                    name: 'Card Barcode',
                    dataContent: '{{student_id}}',
                    fieldKey: 'student_id',
                    barcodeFormat: 'CODE128',
                    width: 35,
                    height: 10,
                  })
                }
                className="flex items-center gap-2 p-2.5 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <Barcode className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Barcode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Layers Manager */}
      {activeTab === 'layers' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {elements.length === 0 ? (
            <div className="text-center py-10 text-xs text-surface-400">
              No elements on this card side.
            </div>
          ) : (
            elements.map((elem) => {
              const isSelected = elem.id === selectedElementId;
              return (
                <div
                  key={elem.id}
                  onClick={() => setSelectedElementId(elem.id)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-brand-50 border-brand-400 text-brand-900 font-medium'
                      : 'border-surface-200 hover:bg-surface-50 text-surface-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {elem.type.includes('text') ? (
                      <Type className="w-3.5 h-3.5 text-surface-500 shrink-0" />
                    ) : elem.type === 'shape' ? (
                      <Square className="w-3.5 h-3.5 text-surface-500 shrink-0" />
                    ) : elem.type === 'qr-code' ? (
                      <QrCode className="w-3.5 h-3.5 text-surface-500 shrink-0" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-surface-500 shrink-0" />
                    )}
                    <span className="truncate">{elem.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => reorderElement(elem.id, 'up')}
                      title="Move Up"
                      className="p-1 rounded hover:bg-surface-200 text-surface-500"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => reorderElement(elem.id, 'down')}
                      title="Move Down"
                      className="p-1 rounded hover:bg-surface-200 text-surface-500"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => updateElement(elem.id, { visible: elem.visible === false ? true : false })}
                      title={elem.visible === false ? 'Show' : 'Hide'}
                      className="p-1 rounded hover:bg-surface-200 text-surface-500"
                    >
                      {elem.visible === false ? <EyeOff className="w-3 h-3 text-surface-400" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => updateElement(elem.id, { locked: !elem.locked })}
                      title={elem.locked ? 'Unlock' : 'Lock'}
                      className="p-1 rounded hover:bg-surface-200 text-surface-500"
                    >
                      {elem.locked ? <Lock className="w-3 h-3 text-amber-600" /> : <Unlock className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => duplicateElement(elem.id)}
                      title="Duplicate"
                      className="p-1 rounded hover:bg-surface-200 text-surface-500"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteElement(elem.id)}
                      title="Delete"
                      className="p-1 rounded hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
};
