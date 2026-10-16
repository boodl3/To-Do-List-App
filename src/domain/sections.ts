import { ACCENTS, DEFAULT_SECTION, MIN_SECTION } from './defaults';
import type { Rect } from './layout/placement';
import {
  NOTE_MAX_LENGTH,
  type Accent,
  type Board,
  type Section,
  type SectionImage,
} from './schema';

/** Section operations on the board (FR-007 – FR-009). Unchanged input → same board back. */
export function updateSection(board: Board, id: string, fn: (s: Section) => Section): Board {
  const i = board.sections.findIndex((s) => s.id === id);
  if (i === -1) return board;
  const current = board.sections[i]!;
  const next = fn(current);
  return next === current ? board : { ...board, sections: board.sections.with(i, next) };
}

/** Notes are sections that hold rich text instead of tasks. */
export const isNote = (s: Section): boolean => s.note !== undefined;

/** Image cards show a picture instead of tasks, at its own aspect ratio. */
export const isImage = (s: Section): boolean => s.image !== undefined;

export const sectionKind = (s: Section): 'section' | 'note' | 'image' =>
  isImage(s) ? 'image' : isNote(s) ? 'note' : 'section';

export const sectionName = (s: Section): string => s.title || `Untitled ${sectionKind(s)}`;

/** Card size at about `width` with the picture's aspect ratio (the picture is the whole card). */
function imageFit(image: SectionImage, width: number): { width: number; height: number } {
  const ratio = image.height / image.width;
  const w = Math.round(Math.max(width, MIN_SECTION.width, MIN_SECTION.height / ratio));
  return { width: w, height: Math.round(w * ratio) };
}

/** A new card's size; a picture starts fitted inside a DEFAULT_SECTION.width square. */
export function sectionSize(image?: SectionImage): { width: number; height: number } {
  if (!image) return DEFAULT_SECTION;
  const box = DEFAULT_SECTION.width;
  return imageFit(image, Math.min(box, (box * image.width) / image.height));
}

/**
 * Minimum size for anything; image cards also keep their aspect ratio. The width leads unless
 * only the height changed (keyboard). Resized from the top, the bottom edge stays put.
 */
function fitRect(s: Section, r: Rect): Rect {
  if (!s.image) {
    const width = Math.max(MIN_SECTION.width, r.width);
    return { x: r.x, y: r.y, width, height: Math.max(MIN_SECTION.height, r.height) };
  }
  const byHeight = r.width === s.width && r.height !== s.height;
  const lead = byHeight ? (r.height * s.image.width) / s.image.height : r.width;
  const size = imageFit(s.image, lead);
  return { x: r.x, y: r.y === s.y ? r.y : r.y + r.height - size.height, ...size };
}

export function createSection(
  board: Board,
  {
    id,
    x,
    y,
    now,
    note = false,
    image,
  }: { id: string; x: number; y: number; now: number; note?: boolean; image?: SectionImage },
): Board {
  const section: Section = {
    id,
    title: '',
    accent: ACCENTS[board.sections.length % ACCENTS.length] ?? 'orange',
    x,
    y,
    ...sectionSize(image),
    tasks: [],
    createdAt: now,
    ...(note && { note: '' }),
    ...(image && { image }),
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

/** Resize (possibly from the left/top edge, which also moves it); see `fitRect`. */
export function resizeSection(board: Board, id: string, r: Rect): Board {
  return updateSection(board, id, (s) => {
    const { x, y, width, height } = fitRect(s, r);
    return s.x === x && s.y === y && s.width === width && s.height === height
      ? s
      : { ...s, x, y, width, height };
  });
}

/** `html` is already sanitized by the editor; only the length is enforced here. */
export function editNote(board: Board, id: string, html: string): Board {
  const value = html.slice(0, NOTE_MAX_LENGTH);
  return updateSection(board, id, (s) =>
    !isNote(s) || s.note === value ? s : { ...s, note: value },
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
