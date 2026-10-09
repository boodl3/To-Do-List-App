import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppDocumentSchema } from './schema';
import { emptyDocument } from './defaults';

const NOW = Date.UTC(2026, 9, 10, 12);
const ID = '0b5c0f9e-6a43-4c1e-9a77-3f1d2b8e4c11';

function withSection(overrides: Record<string, unknown>) {
  const doc = emptyDocument(NOW);
  return {
    ...doc,
    board: {
      ...doc.board,
      sections: [
        {
          id: ID,
          title: 'A',
          accent: 'orange',
          x: 0,
          y: 0,
          width: 320,
          height: 240,
          tasks: [],
          createdAt: NOW,
          ...overrides,
        },
      ],
    },
  };
}

describe('AppDocumentSchema', () => {
  it('accepts the empty document', () => {
    expect(AppDocumentSchema.safeParse(emptyDocument(NOW)).success).toBe(true);
  });

  it.each([0.2, 2.1])('rejects zoom %s', (zoom) => {
    const doc = emptyDocument(NOW);
    const bad = { ...doc, board: { ...doc.board, viewport: { x: 0, y: 0, zoom } } };
    expect(AppDocumentSchema.safeParse(bad).success).toBe(false);
  });

  it.each([0, 5941, 1.5])('rejects estimateMin %s', (estimateMin) => {
    const bad = withSection({
      tasks: [{ id: ID, text: 't', done: false, estimateMin, subtasks: [] }],
    });
    expect(AppDocumentSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects unknown properties', () => {
    expect(AppDocumentSchema.safeParse({ ...emptyDocument(NOW), extra: 1 }).success).toBe(false);
  });

  it('rejects a section narrower than 240', () => {
    expect(AppDocumentSchema.safeParse(withSection({ width: 239 })).success).toBe(false);
  });

  it('rejects a bad UUID', () => {
    expect(AppDocumentSchema.safeParse(withSection({ id: 'not-a-uuid' })).success).toBe(false);
  });

  it('rejects a connection label over 40 chars and dangling connections', () => {
    const doc = withSection({});
    const conn = { id: ID, from: ID, to: ID, style: 'arrow', label: 'x'.repeat(41) };
    const long = { ...doc, board: { ...doc.board, connections: [conn] } };
    expect(AppDocumentSchema.safeParse(long).success).toBe(false);

    const other = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
    const dangling = {
      ...doc,
      board: { ...doc.board, connections: [{ ...conn, to: other, label: '' }] },
    };
    expect(AppDocumentSchema.safeParse(dangling).success).toBe(false);
  });

  it('generates the published contract (research R5)', async () => {
    const json = JSON.stringify(z.toJSONSchema(AppDocumentSchema), null, 2) + '\n';
    await expect(json).toMatchFileSnapshot(
      '../../specs/001-sections-board/contracts/app-document.schema.json',
    );
  });
});
