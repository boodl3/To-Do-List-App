import { AppDocumentSchema, CURRENT_SCHEMA_VERSION, type AppDocument } from './schema';

/** migrations[n] upgrades a version-n document to n + 1. Each one ships with a fixture test. */
export const migrations: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> =
  {};

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
