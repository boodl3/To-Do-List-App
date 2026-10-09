import { newId } from '../domain/ids';
import { createSection, renameSection, updateSection } from '../domain/sections';
import type { Section } from '../domain/schema';
import * as T from '../domain/tasks';
import type { AppStore } from './store';

/** Focus id for a section's "Add a task" row. */
export const addRowFocusId = (sectionId: string) => `add:${sectionId}`;
/** Focus id for a section's title field. */
export const titleFocusId = (sectionId: string) => `title:${sectionId}`;

/** User intents → pure domain functions → one store update (and undo step) each. */
export function createActions(store: AppStore, now: () => number) {
  const state = () => store.getState();
  const inSection = (sectionId: string, fn: (s: Section) => Section) => {
    state().updateBoard((b) => updateSection(b, sectionId, fn));
  };
  const flatIds = (sectionId: string) =>
    state()
      .doc.board.sections.find((s) => s.id === sectionId)
      ?.tasks.flatMap((t) => [t.id, ...t.subtasks.map((s) => s.id)]) ?? [];

  return {
    addSection(x: number, y: number): string {
      const id = newId();
      state().updateBoard((b) => createSection(b, { id, x, y, now: now() }));
      state().requestFocus(titleFocusId(id));
      return id;
    },
    renameSection(sectionId: string, title: string) {
      state().updateBoard((b) => renameSection(b, sectionId, title));
    },

    /** Appends from the "Add a task" row (focus stays there), or inserts after `afterId`. */
    addTask(sectionId: string, text: string, afterId?: string): string {
      const id = newId();
      inSection(sectionId, (s) => T.addTask(s, id, text, afterId));
      if (afterId) state().requestFocus(id);
      return id;
    },
    addSubtask(sectionId: string, parentId: string, afterId: string): string {
      const id = newId();
      inSection(sectionId, (s) => T.addSubtask(s, parentId, id, '', afterId));
      state().requestFocus(id);
      return id;
    },
    editText(sectionId: string, itemId: string, text: string) {
      inSection(sectionId, (s) => T.editText(s, itemId, text));
    },
    setEstimate(sectionId: string, itemId: string, minutes: number | null) {
      inSection(sectionId, (s) => T.setEstimate(s, itemId, minutes));
    },
    toggleDone(sectionId: string, itemId: string) {
      inSection(sectionId, (s) => T.toggleDone(s, itemId));
    },
    indent(sectionId: string, itemId: string) {
      inSection(sectionId, (s) => T.indent(s, itemId));
      state().requestFocus(itemId);
    },
    outdent(sectionId: string, itemId: string) {
      inSection(sectionId, (s) => T.outdent(s, itemId));
      state().requestFocus(itemId);
    },
    moveTo(sectionId: string, itemId: string, toIndex: number) {
      inSection(sectionId, (s) => T.moveItem(s, itemId, toIndex));
    },
    moveBy(sectionId: string, itemId: string, delta: number) {
      inSection(sectionId, (s) => T.moveItem(s, itemId, T.indexOfItem(s, itemId) + delta));
      state().requestFocus(itemId);
    },
    /** Deletes an item; with `focusPrevious`, focus moves to the item above (or the add row). */
    deleteItem(sectionId: string, itemId: string, { focusPrevious = false } = {}) {
      const ids = flatIds(sectionId);
      const previous = ids[ids.indexOf(itemId) - 1];
      inSection(sectionId, (s) => T.deleteItem(s, itemId));
      if (focusPrevious) state().requestFocus(previous ?? addRowFocusId(sectionId));
    },
  };
}

export type Actions = ReturnType<typeof createActions>;
