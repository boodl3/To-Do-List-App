import { ACCENTS, DEFAULT_SECTION } from './defaults';
import type { Board, Section } from './schema';

/** Section operations on the board (FR-007 – FR-009). Unchanged input → same board back. */
export function updateSection(board: Board, id: string, fn: (s: Section) => Section): Board {
  const i = board.sections.findIndex((s) => s.id === id);
  if (i === -1) return board;
  const current = board.sections[i]!;
  const next = fn(current);
  return next === current ? board : { ...board, sections: board.sections.with(i, next) };
}

export function createSection(
  board: Board,
  { id, x, y, now }: { id: string; x: number; y: number; now: number },
): Board {
  const section: Section = {
    id,
    title: '',
    accent: ACCENTS[board.sections.length % ACCENTS.length] ?? 'orange',
    x,
    y,
    ...DEFAULT_SECTION,
    tasks: [],
    createdAt: now,
  };
  return { ...board, sections: [...board.sections, section] };
}

export function renameSection(board: Board, id: string, title: string): Board {
  const value = title.trim().slice(0, 120);
  return updateSection(board, id, (s) => (s.title === value ? s : { ...s, title: value }));
}
