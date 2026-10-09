import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fakeDocumentStore } from '../platform/fake';
import { loadInitialDocument } from './boot';

const v1 = readFileSync('tests/fixtures/v1.json', 'utf8');
const NOW = Date.UTC(2026, 9, 10);

function memoryStorage(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    clear: () => {
      map.clear();
    },
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

const schemaInvalid = JSON.stringify({ ...JSON.parse(v1), schemaVersion: 1, prefs: 'nope' });

describe('loadInitialDocument', () => {
  it('starts with an empty board on first launch, without a notice', async () => {
    const r = await loadInitialDocument(fakeDocumentStore(memoryStorage()), NOW);
    expect(r.doc.board.sections).toEqual([]);
    expect(r.notice).toBeNull();
  });

  it('loads a saved board', async () => {
    const r = await loadInitialDocument(
      fakeDocumentStore(memoryStorage({ 'focusboard.json': v1 })),
      NOW,
    );
    expect(r.doc.board.sections).toHaveLength(2);
    expect(r.notice).toBeNull();
  });

  it('falls back to the backup when the main file fails validation, keeping the bad file', async () => {
    const storage = memoryStorage({ 'focusboard.json': schemaInvalid, 'focusboard.json.bak': v1 });
    const r = await loadInitialDocument(fakeDocumentStore(storage), NOW);
    expect(r.doc.board.sections).toHaveLength(2);
    expect(r.notice).toMatch(/backup/);
    expect(storage.getItem('focusboard.corrupt-0.json')).toBe(schemaInvalid);
  });

  it('starts fresh with a notice when every file is unusable, setting all of them aside', async () => {
    const storage = memoryStorage({
      'focusboard.json': schemaInvalid,
      'focusboard.json.bak': '{broken',
    });
    const r = await loadInitialDocument(fakeDocumentStore(storage), NOW);
    expect(r.doc.board.sections).toEqual([]);
    expect(r.notice).toMatch(/set aside/);
    expect(storage.getItem('focusboard.corrupt-0.json')).toBe(schemaInvalid);
    expect(storage.getItem('focusboard.corrupt-1.json')).toBe('{broken');
  });
});
