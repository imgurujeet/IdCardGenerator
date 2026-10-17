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
});
