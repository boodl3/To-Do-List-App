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

  it('migrates v1 → v3: the timer gets the default size, connections are straight, accents kept', () => {
    const v1 = JSON.parse(fixture('v1')) as { board: { sections: { accent: string }[] } };
    const result = loadDocument(fixture('v1'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.schemaVersion).toBe(3);
    expect(result.doc.pomodoro.widget).toMatchObject({ width: 248, height: 216 });
    expect(result.doc.board.connections.every((c) => c.shape === 'straight')).toBe(true);
    expect(result.doc.board.sections.map((s) => s.accent)).toEqual(
      v1.board.sections.map((s) => s.accent),
    );
  });

  it('migrates v2 (width-only timer, custom colours) → v3, keeping the width and colours', () => {
    const result = loadDocument(fixture('v2'));
    expect(result.ok ? 'ok' : result.error).toBe('ok');
    if (!result.ok) return;
    expect(result.doc.pomodoro.widget).toMatchObject({ width: 300, height: 216 });
    expect(result.doc.board.sections[1]!.accent).toBe('#1d3557');
    expect(result.doc.board.connections.map((c) => c.shape)).toEqual(['straight']);
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
