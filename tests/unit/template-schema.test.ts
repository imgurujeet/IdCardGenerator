import { describe, it, expect } from 'vitest';
import { TemplateDocumentSchema } from '../../src/schemas/template.schema';
import { OAKWOOD_TEMPLATE_DOC, NEXACORP_TEMPLATE_DOC } from '../../src/services/mockData';

describe('Template Document Schema Validation', () => {
  it('successfully validates standard CR80 Oakwood template', () => {
    const parseResult = TemplateDocumentSchema.safeParse(OAKWOOD_TEMPLATE_DOC);
    expect(parseResult.success).toBe(true);
  });

  it('successfully validates landscape NexaCorp corporate template', () => {
    const parseResult = TemplateDocumentSchema.safeParse(NEXACORP_TEMPLATE_DOC);
    expect(parseResult.success).toBe(true);
  });

  it('rejects corrupt documents missing required fields', () => {
    const invalidDoc = {
      schemaVersion: 1,
      // Missing id, name, category, dimensions
      layouts: {
        front: { backgroundColor: '#fff', elements: [] },
      },
    };

    const parseResult = TemplateDocumentSchema.safeParse(invalidDoc);
    expect(parseResult.success).toBe(false);
  });

  it('correctly creates and positions a blank text box below an existing element', async () => {
    const { useEditorStore } = await import('../../src/features/editor/store/useEditorStore');
    useEditorStore.getState().setDocument(OAKWOOD_TEMPLATE_DOC);

    const initialCount = useEditorStore.getState().document?.layouts.front.elements.length || 0;
    const firstElem = useEditorStore.getState().document?.layouts.front.elements[0]!;

    // Trigger addTextBoxBelow targeting firstElem
    useEditorStore.getState().addTextBoxBelow(firstElem.id);

    const doc = useEditorStore.getState().document!;
    const newCount = doc.layouts.front.elements.length;
    expect(newCount).toBe(initialCount + 1);

    const newlyAdded = doc.layouts.front.elements[newCount - 1];
    expect(newlyAdded.type).toBe('text');
    expect((newlyAdded as any).content).toBe('');
    expect(newlyAdded.x).toBe(firstElem.x);
    // Positioned below firstElem.y + firstElem.height
    expect(newlyAdded.y).toBeGreaterThanOrEqual(firstElem.y + firstElem.height);
    // Newly added element is selected
    expect(useEditorStore.getState().selectedElementId).toBe(newlyAdded.id);
  });
});
