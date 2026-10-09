import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyDocument } from '../domain/defaults';
import { loadDocument } from '../domain/migrations';
import type { AppDocument } from '../domain/schema';
import { startAutosave } from './autosave';

function setup(save = vi.fn((_json: string) => Promise.resolve())) {
  let doc: AppDocument = emptyDocument(0);
  const listeners = new Set<() => void>();
  const source = {
    getDoc: () => doc,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  const notify = () => {
    listeners.forEach((fn) => {
      fn();
    });
  };
  const change = () => {
    doc = { ...doc, prefs: { ...doc.prefs, pinned: !doc.prefs.pinned } };
    notify();
  };
  const onError = vi.fn();
  const autosave = startAutosave(source, { load: vi.fn(), save }, { onError });
  return { change, notify, save, onError, autosave, getDoc: () => doc };
}

describe('startAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('saves once, 500 ms after the last change', () => {
    const { change, save } = setup();
    change();
    vi.advanceTimersByTime(300);
    change();
    vi.advanceTimersByTime(499);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('saves at most 1 s after the first unsaved change under continuous edits', () => {
    const { change, save } = setup();
    for (let t = 0; t < 1000; t += 100) {
      change();
      vi.advanceTimersByTime(100);
    }
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('ignores notifications that did not change the document', () => {
    const { notify, save } = setup();
    notify();
    vi.advanceTimersByTime(2000);
    expect(save).not.toHaveBeenCalled();
  });

  it('saves JSON that round-trips through loadDocument', () => {
    const { change, save, getDoc } = setup();
    change();
    vi.advanceTimersByTime(500);
    const json = save.mock.calls[0]![0];
    const loaded = loadDocument(json);
    expect(loaded.ok && loaded.doc).toEqual(getDoc());
  });

  it('reports a failed save and retries on the next change', async () => {
    const save = vi.fn((_json: string): Promise<void> => Promise.reject(new Error('disk full')));
    const { change, onError } = setup(save);
    change();
    await vi.advanceTimersByTimeAsync(500);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    save.mockImplementation(() => Promise.resolve());
    change();
    await vi.advanceTimersByTimeAsync(500);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('flush() saves pending changes immediately', async () => {
    const { change, save, autosave } = setup();
    change();
    await autosave.flush();
    expect(save).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
