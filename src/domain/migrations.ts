import { AppDocumentSchema, CURRENT_SCHEMA_VERSION, type AppDocument } from './schema';

type Doc = Record<string, unknown>;

/**
 * migrations[n] upgrades a version-n document to n + 1. Each one ships with a fixture test.
 * Values are frozen literals: a migration must keep producing the same output forever.
 */
export const migrations: Record<number, (doc: Doc) => Doc> = {
  // v2: timer width. (Custom `#rrggbb` accents are additive: v1 accents stay valid.)
  1: (doc) => {
    const pomodoro = doc.pomodoro as Doc | undefined;
    const widget = pomodoro?.widget as Doc | undefined;
    if (!pomodoro || !widget) return doc; // invalid either way; validation reports it
    return { ...doc, pomodoro: { ...pomodoro, widget: { ...widget, width: 248 } } };
  },
  // v3: timer height (resized independently of width), straight/curved connections.
  2: (doc) => {
    const pomodoro = doc.pomodoro as Doc | undefined;
    const widget = pomodoro?.widget as Doc | undefined;
    const board = doc.board as Doc | undefined;
    const connections = board?.connections;
    if (!pomodoro || !widget || !board || !Array.isArray(connections)) return doc; // invalid anyway
    return {
      ...doc,
      board: { ...board, connections: connections.map((c: Doc) => ({ ...c, shape: 'straight' })) },
      pomodoro: { ...pomodoro, widget: { ...widget, height: 216 } },
    };
  },
};

export type LoadDocumentResult = { ok: true; doc: AppDocument } | { ok: false; error: string };

export function loadDocument(json: string): LoadDocumentResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: `not valid JSON: ${String(e)}` };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'not a document object' };
  }
  let doc = raw as Record<string, unknown>;
  const version = doc.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'missing schemaVersion' };
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    return { ok: false, error: `saved by a newer app version (schema ${version})` };
  }
  for (let v = version; v < CURRENT_SCHEMA_VERSION; v++) {
    const step = migrations[v];
    if (!step) return { ok: false, error: `no migration from schema ${v}` };
    doc = { ...step(doc), schemaVersion: v + 1 };
  }
  const parsed = AppDocumentSchema.safeParse(doc);
  return parsed.success
    ? { ok: true, doc: parsed.data }
    : { ok: false, error: parsed.error.issues.map((i) => i.message).join('; ') };
}
