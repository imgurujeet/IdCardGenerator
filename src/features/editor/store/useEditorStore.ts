import { create } from 'zustand';
import { TemplateDocument, TemplateElement } from '../../../types/template';
import { generateId } from '../../../lib/utils';
import { DEMO_RECORDS } from '../../../services/mockData';

interface EditorState {
  document: TemplateDocument | null;
  activeSide: 'front' | 'back';
  selectedElementId: string | null;
  zoom: number;
  gridSnap: boolean;
  gridSizeMm: number;
  isDirty: boolean;
  isSaving: boolean;
  sampleRecordIndex: number;
  availableSampleRecords: Array<Record<string, any>>;
  customFonts: string[];

  // History for undo/redo
  history: TemplateDocument[];
  historyIndex: number;

  // Actions
  setDocument: (doc: TemplateDocument) => void;
  setActiveSide: (side: 'front' | 'back') => void;
  setSelectedElementId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  toggleGridSnap: () => void;
  setSampleRecordIndex: (index: number) => void;
  setBackgroundImage: (side: 'front' | 'back', url: string, opacity?: number) => void;
  removeBackgroundImage: (side: 'front' | 'back') => void;
  addCustomFont: (fontName: string, fontUrl: string) => void;

  // Element actions
  addElement: (element: Partial<TemplateElement> & { type: TemplateElement['type']; name: string }) => void;
  updateElement: (id: string, updates: Partial<TemplateElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  reorderElement: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;

  // History actions
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
}

const MAX_HISTORY = 30;

export const useEditorStore = create<EditorState>((set, get) => ({
  document: null,
  activeSide: 'front',
  selectedElementId: null,
  zoom: 1.5,
  gridSnap: true,
  gridSizeMm: 1, // 1mm snap
  isDirty: false,
  isSaving: false,
  sampleRecordIndex: 0,
  availableSampleRecords: DEMO_RECORDS.map((r) => r.data),
  customFonts: ['Inter', 'Roboto', 'Montserrat', 'Oswald', 'Outfit', 'Playfair Display', 'Poppins'],

  history: [],
  historyIndex: -1,

  setBackgroundImage: (side, url, opacity = 1) => {
    const { document: doc, history, historyIndex } = get();
    if (!doc) return;

    const newDoc = JSON.parse(JSON.stringify(doc)) as TemplateDocument;
    if (side === 'back') {
      if (!newDoc.layouts.back) {
        newDoc.layouts.back = { backgroundColor: '#ffffff', elements: [] };
      }
      newDoc.layouts.back.backgroundImageUrl = url;
      newDoc.layouts.back.backgroundOpacity = opacity;
    } else {
      newDoc.layouts.front.backgroundImageUrl = url;
      newDoc.layouts.front.backgroundOpacity = opacity;
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newDoc)));
    set({
      document: newDoc,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  removeBackgroundImage: (side) => {
    const { document: doc, history, historyIndex } = get();
    if (!doc) return;

    const newDoc = JSON.parse(JSON.stringify(doc)) as TemplateDocument;
    if (side === 'back' && newDoc.layouts.back) {
      delete newDoc.layouts.back.backgroundImageUrl;
    } else {
      delete newDoc.layouts.front.backgroundImageUrl;
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newDoc)));
    set({
      document: newDoc,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  addCustomFont: (fontName, fontUrl) => {
    // Dynamically inject @font-face into document
    const fontFace = new FontFace(fontName, `url(${fontUrl})`);
    fontFace.load().then((loadedFont) => {
      document.fonts.add(loadedFont);
      set((state) => ({
        customFonts: Array.from(new Set([...state.customFonts, fontName])),
      }));
    }).catch((err) => {
      console.warn('Failed to load custom font:', err);
    });
  },

  setDocument: (doc) => {
    set({
      document: JSON.parse(JSON.stringify(doc)),
      history: [JSON.parse(JSON.stringify(doc))],
      historyIndex: 0,
      isDirty: false,
      selectedElementId: null,
    });
  },

  setActiveSide: (side) => {
    set({ activeSide: side, selectedElementId: null });
  },

  setSelectedElementId: (id) => {
    set({ selectedElementId: id });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.5, Math.min(3.5, zoom)) });
  },

  toggleGridSnap: () => {
    set((state) => ({ gridSnap: !state.gridSnap }));
  },

  setSampleRecordIndex: (index) => {
    set({ sampleRecordIndex: index });
  },

  addElement: (partialElem) => {
    const { document: doc, activeSide, history, historyIndex, gridSnap, gridSizeMm } = get();
    if (!doc) return;

    const currentLayout = activeSide === 'back' && doc.layouts.back ? doc.layouts.back : doc.layouts.front;
    const maxZ = currentLayout.elements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);

    const baseElem = {
      id: generateId(partialElem.type),
      x: 5,
      y: 10,
      width: partialElem.width || 30,
      height: partialElem.height || 10,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: maxZ + 1,
      ...partialElem,
    } as TemplateElement;

    if (gridSnap) {
      baseElem.x = Math.round(baseElem.x / gridSizeMm) * gridSizeMm;
      baseElem.y = Math.round(baseElem.y / gridSizeMm) * gridSizeMm;
    }

    const newDoc = JSON.parse(JSON.stringify(doc)) as TemplateDocument;
    if (activeSide === 'back') {
      if (!newDoc.layouts.back) {
        newDoc.layouts.back = { backgroundColor: '#ffffff', elements: [] };
      }
      newDoc.layouts.back.elements.push(baseElem);
    } else {
      newDoc.layouts.front.elements.push(baseElem);
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newDoc)));
    if (newHistory.length > MAX_HISTORY) newHistory.shift();

    set({
      document: newDoc,
      selectedElementId: baseElem.id,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  updateElement: (id, updates) => {
    const { document: doc, activeSide } = get();
    if (!doc) return;

    const newDoc = JSON.parse(JSON.stringify(doc)) as TemplateDocument;
    const layout = activeSide === 'back' && newDoc.layouts.back ? newDoc.layouts.back : newDoc.layouts.front;

    const elemIndex = layout.elements.findIndex((e) => e.id === id);
    if (elemIndex === -1) return;

    layout.elements[elemIndex] = {
      ...layout.elements[elemIndex],
      ...updates,
    } as TemplateElement;

    set({
      document: newDoc,
      isDirty: true,
    });
  },

  deleteElement: (id) => {
    const { document: doc, activeSide, history, historyIndex } = get();
    if (!doc) return;

    const newDoc = JSON.parse(JSON.stringify(doc)) as TemplateDocument;
    const layout = activeSide === 'back' && newDoc.layouts.back ? newDoc.layouts.back : newDoc.layouts.front;

    layout.elements = layout.elements.filter((e) => e.id !== id);

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newDoc)));
    if (newHistory.length > MAX_HISTORY) newHistory.shift();

    set({
      document: newDoc,
      selectedElementId: null,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  duplicateElement: (id) => {
    const { document: doc, activeSide, history, historyIndex } = get();
    if (!doc) return;

    const newDoc = JSON.parse(JSON.stringify(doc)) as TemplateDocument;
    const layout = activeSide === 'back' && newDoc.layouts.back ? newDoc.layouts.back : newDoc.layouts.front;

    const elem = layout.elements.find((e) => e.id === id);
    if (!elem) return;

    const cloned: TemplateElement = {
      ...JSON.parse(JSON.stringify(elem)),
      id: generateId(elem.type),
      name: `${elem.name} (Copy)`,
      x: elem.x + 3,
      y: elem.y + 3,
      zIndex: layout.elements.length + 1,
    };

    layout.elements.push(cloned);

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newDoc)));
    if (newHistory.length > MAX_HISTORY) newHistory.shift();

    set({
      document: newDoc,
      selectedElementId: cloned.id,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  reorderElement: (id, direction) => {
    const { document: doc, activeSide } = get();
    if (!doc) return;

    const newDoc = JSON.parse(JSON.stringify(doc)) as TemplateDocument;
    const layout = activeSide === 'back' && newDoc.layouts.back ? newDoc.layouts.back : newDoc.layouts.front;

    const elements = [...layout.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const idx = elements.findIndex((e) => e.id === id);
    if (idx === -1) return;

    if (direction === 'up' && idx < elements.length - 1) {
      const temp = elements[idx].zIndex;
      elements[idx].zIndex = elements[idx + 1].zIndex;
      elements[idx + 1].zIndex = temp;
    } else if (direction === 'down' && idx > 0) {
      const temp = elements[idx].zIndex;
      elements[idx].zIndex = elements[idx - 1].zIndex;
      elements[idx - 1].zIndex = temp;
    } else if (direction === 'top') {
      elements[idx].zIndex = elements[elements.length - 1].zIndex + 1;
    } else if (direction === 'bottom') {
      elements[idx].zIndex = Math.max(0, elements[0].zIndex - 1);
    }

    set({
      document: newDoc,
      isDirty: true,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevDoc = history[historyIndex - 1];
      set({
        document: JSON.parse(JSON.stringify(prevDoc)),
        historyIndex: historyIndex - 1,
        isDirty: true,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextDoc = history[historyIndex + 1];
      set({
        document: JSON.parse(JSON.stringify(nextDoc)),
        historyIndex: historyIndex + 1,
        isDirty: true,
      });
    }
  },

  markSaved: () => {
    set({ isDirty: false });
  },
}));
