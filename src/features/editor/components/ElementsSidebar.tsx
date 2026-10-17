import React, { useState } from 'react';
import {
  Type,
  Square,
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
  Upload,
  Palette,
  FileUp,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { storageService } from '../../../services/storage.service';

export const ElementsSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'elements' | 'background' | 'layers'>('elements');
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
    setBackgroundImage,
    removeBackgroundImage,
    addCustomFont,
  } = useEditorStore();

  if (!doc) return null;

  const currentLayout = activeSide === 'back' && doc.layouts.back ? doc.layouts.back : doc.layouts.front;
  const elements = [...currentLayout.elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const res = await storageService.uploadBackground(file);
        setBackgroundImage(activeSide, res.url, 1);
      } catch (err) {
        console.error('Failed to upload/compress background:', err);
      }
    }
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
      const fontUrl = URL.createObjectURL(file);
      addCustomFont(fontName, fontUrl);
      alert(`Font "${fontName}" uploaded successfully and added to your font selector!`);
    }
  };

  return (
    <aside className="w-72 bg-white border-r border-surface-200 flex flex-col shrink-0 select-none z-10">
      {/* 3-Way Tab Switcher */}
      <div className="flex border-b border-surface-200 p-1 bg-surface-50">
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'elements' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600 hover:text-surface-900'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
        <button
          onClick={() => setActiveTab('background')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'background' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-600 hover:text-surface-900'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-brand-600" />
          <span>Card BG</span>
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-surface-900 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-600" /> Dynamic Data Fields
              </span>
            </div>
            <p className="text-[11px] text-surface-500 mb-2 leading-relaxed">
              Auto-filled per candidate during single & bulk printing.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  addElement({
                    type: 'dynamic-text',
                    name: 'Candidate Name',
                    content: '{{student_name}}',
                    fieldKey: 'student_name',
                    fallback: 'ABHISHEK KUMAR',
                    fontSize: 6.8,
                    fontWeight: 'bold',
                    color: '#dc2626',
                    underline: true,
                    textAlign: 'center',
                    width: 48,
                    height: 6,
                  })
                }
                className="flex items-center gap-2 p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <Type className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="truncate">Student Name</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'dynamic-text',
                    name: 'Roll No',
                    content: 'Roll No- {{roll_no}}',
                    fieldKey: 'roll_no',
                    fallback: 'Roll No- 141',
                    fontSize: 4.8,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    width: 32,
                    height: 5.5,
                  })
                }
                className="flex items-center gap-2 p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <Type className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="truncate">Roll Number</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'dynamic-text',
                    name: 'Session Banner',
                    content: 'Session\n{{session}}',
                    fieldKey: 'session',
                    fallback: 'Session\n24-26',
                    fontSize: 4.2,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    textAlign: 'center',
                    width: 25,
                    height: 7,
                  })
                }
                className="flex items-center gap-2 p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <Type className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Academic Session</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'dynamic-text',
                    name: 'Blood Group',
                    content: '{{blood_group}}',
                    fieldKey: 'blood_group',
                    fallback: 'A+',
                    fontSize: 5,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    textAlign: 'center',
                    width: 14,
                    height: 5,
                  })
                }
                className="flex items-center gap-2 p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <Type className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="truncate">Blood Group</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'dynamic-text',
                    name: 'Father Name',
                    content: 'F. Name:- {{father_name}}',
                    fieldKey: 'father_name',
                    fallback: 'F. Name:- DILIP PASWAN',
                    fontSize: 4.2,
                    fontWeight: 'bold',
                    color: '#172554',
                    textAlign: 'left',
                    width: 50,
                    height: 4.5,
                  })
                }
                className="flex items-center gap-2 p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <Type className="w-3.5 h-3.5 text-blue-800 shrink-0" />
                <span className="truncate">Father's Name</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'dynamic-text',
                    name: 'Date of Birth',
                    content: 'D.O.B-\n{{dob}}',
                    fieldKey: 'dob',
                    fallback: 'D.O.B-\n08-03-2003',
                    fontSize: 4,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    width: 28,
                    height: 7,
                  })
                }
                className="flex items-center gap-2 p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <Type className="w-3.5 h-3.5 text-surface-800 shrink-0" />
                <span className="truncate">Date of Birth</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'dynamic-text',
                    name: 'Address Info',
                    content: 'Add:-{{address}}\nPS-{{police_station}}\nDIST- {{district}}\nMob:-{{mobile}}',
                    fieldKey: 'address',
                    fallback: 'Add:-VILL+PO- RAILLI\nPS-NTPC,BARH\nDIST- PATNA-803221\nMob:-8102327260',
                    fontSize: 3.8,
                    fontWeight: 'bold',
                    color: '#172554',
                    textAlign: 'left',
                    width: 50,
                    height: 18,
                  })
                }
                className="col-span-2 flex items-center gap-2 p-2 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-left text-xs font-medium text-surface-800 transition-colors"
              >
                <Type className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                <span className="truncate">Full Address & Contact Block</span>
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
                    name: 'Student Portrait',
                    src: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
                    fieldKey: 'photo_url',
                    objectFit: 'cover',
                    borderRadius: 3.5,
                    borderColor: '#000000',
                    borderWidth: 0.6,
                    width: 25,
                    height: 30,
                  })
                }
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-center gap-1.5 text-xs font-medium text-surface-800 transition-colors"
              >
                <User className="w-5 h-5 text-brand-600" />
                <span>Student Photo Frame</span>
              </button>

              <button
                onClick={() =>
                  addElement({
                    type: 'logo',
                    name: 'Official Logo / Seal',
                    src: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=200&q=80',
                    objectFit: 'contain',
                    width: 16,
                    height: 16,
                  })
                }
                className="flex flex-col items-center justify-center p-3 rounded-lg border border-surface-200 hover:border-brand-500 hover:bg-brand-50/50 text-center gap-1.5 text-xs font-medium text-surface-800 transition-colors"
              >
                <ImageIcon className="w-5 h-5 text-brand-600" />
                <span>Logo / Seal</span>
              </button>
            </div>
          </div>

          {/* Verification Codes */}
          <div>
            <span className="text-xs font-semibold text-surface-900 uppercase tracking-wider block mb-2">
              Verification QR & Barcode
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  addElement({
                    type: 'qr-code',
                    name: 'Verification QR',
                    dataContent: 'https://ptecbarh.online/verify/{{roll_no}}',
                    fieldKey: 'roll_no',
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
                    name: 'Library Barcode',
                    dataContent: '{{roll_no}}',
                    fieldKey: 'roll_no',
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

          {/* Custom Font Upload */}
          <div className="pt-2 border-t border-surface-100">
            <span className="text-xs font-semibold text-surface-900 uppercase tracking-wider block mb-2">
              Custom Fonts (Photoshop Style)
            </span>
            <label className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-surface-300 hover:border-brand-500 bg-surface-50 hover:bg-brand-50/30 text-xs font-semibold text-brand-700 cursor-pointer transition-colors">
              <FileUp className="w-4 h-4" />
              <span>Upload Font (.ttf / .woff2)</span>
              <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} className="hidden" />
            </label>
            <p className="text-[10px] text-surface-400 mt-1.5 leading-relaxed">
              Uploaded fonts apply immediately across canvas elements and export PDFs.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Card Background (Custom Image & Colors) */}
      {activeTab === 'background' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="bg-surface-50 p-3 rounded-lg border border-surface-200">
            <span className="text-xs font-bold text-surface-900 block mb-0.5 capitalize">
              Editing: {activeSide} Background
            </span>
            <p className="text-[11px] text-surface-500 leading-relaxed">
              Upload your own Photoshop design or background image for the {activeSide} of the card.
            </p>
          </div>

          {/* Upload Button */}
          <div>
            <label className="text-xs font-semibold text-surface-700 block mb-1.5">
              Upload Background Image
            </label>
            <label className="w-full flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-brand-300 hover:border-brand-500 bg-brand-50/40 hover:bg-brand-50/80 cursor-pointer transition-colors text-center">
              <Upload className="w-6 h-6 text-brand-600 mb-1" />
              <span className="text-xs font-bold text-brand-900">Choose Image File</span>
              <span className="text-[10px] text-surface-400 mt-0.5">PNG, JPG, WebP (Photoshop export)</span>
              <input type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
            </label>
          </div>

          {/* Preset Backgrounds */}
          <div>
            <span className="text-xs font-semibold text-surface-700 block mb-2">
              Ready-Made Preset Backgrounds
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBackgroundImage(activeSide, '/templates/ptec/ptec_front_bg.png')}
                className="p-2 border border-surface-200 rounded-lg hover:border-brand-500 text-left text-xs bg-white space-y-1 transition-colors"
              >
                <div className="h-16 rounded overflow-hidden bg-surface-100 border border-surface-200">
                  <img src="/templates/ptec/ptec_front_bg.png" alt="PTEC Front" className="w-full h-full object-cover" />
                </div>
                <p className="font-semibold text-surface-900 text-[11px] truncate">PTEC College Front</p>
              </button>

              <button
                type="button"
                onClick={() => setBackgroundImage(activeSide, '/templates/ptec/ptec_back_bg.png')}
                className="p-2 border border-surface-200 rounded-lg hover:border-brand-500 text-left text-xs bg-white space-y-1 transition-colors"
              >
                <div className="h-16 rounded overflow-hidden bg-surface-100 border border-surface-200">
                  <img src="/templates/ptec/ptec_back_bg.png" alt="PTEC Back" className="w-full h-full object-cover" />
                </div>
                <p className="font-semibold text-surface-900 text-[11px] truncate">PTEC College Back</p>
              </button>
            </div>
          </div>

          {/* Remove Background Option */}
          {currentLayout.backgroundImageUrl && (
            <div className="pt-3 border-t border-surface-100">
              <button
                type="button"
                onClick={() => removeBackgroundImage(activeSide)}
                className="w-full py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Background Image</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Layers Manager */}
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
                      type="button"
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
                      <Trash2 className="w-3.5 h-3.5" />
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
