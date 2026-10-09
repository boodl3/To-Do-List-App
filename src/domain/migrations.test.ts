import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadDocument } from './migrations';
import { CURRENT_SCHEMA_VERSION } from './schema';

const fixture = (name: string) => readFileSync(`tests/fixtures/${name}.json`, 'utf8');

describe('loadDocument', () => {
  it('loads a valid v1 document', () => {
    const result = loadDocument(fixture('v1'));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc.board.sections).toHaveLength(2);
  });

  it('rejects invalid JSON', () => {
    expect(loadDocument(fixture('corrupt')).ok).toBe(false);
  });

  it('rejects a schema-invalid document', () => {
    const doc = JSON.parse(fixture('v1')) as { board: { viewport: { zoom: number } } };
    doc.board.viewport.zoom = 9;
    expect(loadDocument(JSON.stringify(doc)).ok).toBe(false);
  });

  it('rejects documents from a newer app version', () => {
    const doc = JSON.parse(fixture('v1')) as { schemaVersion: number };
    doc.schemaVersion = CURRENT_SCHEMA_VERSION + 1;
    const result = loadDocument(JSON.stringify(doc));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/newer/);
  });

  it('rejects non-objects and missing schemaVersion', () => {
    expect(loadDocument('[]').ok).toBe(false);
    expect(loadDocument('{}').ok).toBe(false);
  });
});
