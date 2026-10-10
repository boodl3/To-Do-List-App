import { invoke } from '@tauri-apps/api/core';
import type { DocumentStore, LoadResult } from '../ports';

export const tauriDocumentStore: DocumentStore = {
  load: ({ quarantine = false } = {}) => invoke<LoadResult>('load_document', { quarantine }),
  save: (json) => invoke<undefined>('save_document', { json }),
};
