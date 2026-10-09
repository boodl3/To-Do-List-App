import { ACCENTS, DEFAULT_SECTION, MIN_SECTION } from './defaults';
import type { Rect } from './layout/placement';
import type { Accent, Board, Section } from './schema';

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

export function moveSection(board: Board, id: string, x: number, y: number): Board {
  return updateSection(board, id, (s) => (s.x === x && s.y === y ? s : { ...s, x, y }));
}

/** Resize (possibly from the left/top edge, which also moves it) with the minimum size kept. */
export function resizeSection(board: Board, id: string, r: Rect): Board {
  const width = Math.max(MIN_SECTION.width, r.width);
  const height = Math.max(MIN_SECTION.height, r.height);
  return updateSection(board, id, (s) =>
    s.x === r.x && s.y === r.y && s.width === width && s.height === height
      ? s
      : { ...s, x: r.x, y: r.y, width, height },
  );
}

export function recolorSection(board: Board, id: string, accent: Accent): Board {
  return updateSection(board, id, (s) => (s.accent === accent ? s : { ...s, accent }));
}

/** Array order is z-order; the last section is drawn on top. */
export function bringToFront(board: Board, id: string): Board {
  const i = board.sections.findIndex((s) => s.id === id);
  if (i === -1 || i === board.sections.length - 1) return board;
  return { ...board, sections: [...board.sections.toSpliced(i, 1), board.sections[i]!] };
}

/** Removes the section and every connection touching it (FR-017). */
export function deleteSection(board: Board, id: string): Board {
  if (!board.sections.some((s) => s.id === id)) return board;
  return {
    ...board,
    sections: board.sections.filter((s) => s.id !== id),
    connections: board.connections.filter((c) => c.from !== id && c.to !== id),
  };
}

/** Applies many positions at once (Tidy up) as one board update. */
export function applyPositions(
  board: Board,
  positions: readonly { id: string; x: number; y: number }[],
): Board {
  return positions.reduce((b, p) => moveSection(b, p.id, p.x, p.y), board);
}
