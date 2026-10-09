import { describe, expect, it } from 'vitest';
import { ACCENTS, emptyDocument } from './defaults';
import {
  applyPositions,
  bringToFront,
  createSection,
  deleteSection,
  moveSection,
  recolorSection,
  renameSection,
  resizeSection,
  updateSection,
} from './sections';

const board = () => emptyDocument(0).board;

describe('createSection', () => {
  it('adds a 320×240 untitled section on top of the z-order', () => {
    const b = createSection(board(), { id: 'a', x: 16, y: 24, now: 5 });
    expect(b.sections).toEqual([
      {
        id: 'a',
        title: '',
        accent: 'orange',
        x: 16,
        y: 24,
        width: 320,
        height: 240,
        tasks: [],
        createdAt: 5,
      },
    ]);
  });

  it('cycles accents through the palette', () => {
    let b = board();
    for (let i = 0; i < ACCENTS.length + 1; i++)
      b = createSection(b, { id: `s${i}`, x: 0, y: 0, now: 0 });
    expect(b.sections.map((s) => s.accent)).toEqual([...ACCENTS, ACCENTS[0]]);
  });
});

describe('renameSection', () => {
  it('trims and clamps to 120 characters', () => {
    let b = createSection(board(), { id: 'a', x: 0, y: 0, now: 0 });
    b = renameSection(b, 'a', `  ${'t'.repeat(130)}  `);
    expect(b.sections[0]!.title).toBe('t'.repeat(120));
  });

  it('returns the same board when unchanged', () => {
    const b = renameSection(createSection(board(), { id: 'a', x: 0, y: 0, now: 0 }), 'a', 'T');
    expect(renameSection(b, 'a', ' T ')).toBe(b);
  });
});

describe('updateSection', () => {
  it('returns the same board for unknown ids or no-op updates', () => {
    const b = createSection(board(), { id: 'a', x: 0, y: 0, now: 0 });
    expect(updateSection(b, 'zzz', (s) => ({ ...s, title: 'x' }))).toBe(b);
    expect(updateSection(b, 'a', (s) => s)).toBe(b);
  });
});

describe('move / resize / recolor / z-order / delete', () => {
  const two = () => {
    let b = createSection(board(), { id: 'a', x: 0, y: 0, now: 0 });
    b = createSection(b, { id: 'b', x: 400, y: 0, now: 0 });
    return {
      ...b,
      connections: [{ id: 'c', from: 'a', to: 'b', style: 'arrow' as const, label: '' }],
    };
  };

  it('moves a section', () => {
    expect(moveSection(two(), 'a', 16, 24).sections[0]).toMatchObject({ x: 16, y: 24 });
  });

  it('resizes with a minimum of 240×160', () => {
    const b = resizeSection(two(), 'a', { x: 8, y: 8, width: 100, height: 400 });
    expect(b.sections[0]).toMatchObject({ x: 8, y: 8, width: 240, height: 400 });
  });

  it('recolors', () => {
    expect(recolorSection(two(), 'a', 'sky').sections[0]!.accent).toBe('sky');
  });

  it('brings a section to the front (end of the array)', () => {
    expect(bringToFront(two(), 'a').sections.map((s) => s.id)).toEqual(['b', 'a']);
    const b = two();
    expect(bringToFront(b, 'b')).toBe(b);
  });

  it('deletes a section with every connection touching it', () => {
    const b = deleteSection(two(), 'b');
    expect(b.sections.map((s) => s.id)).toEqual(['a']);
    expect(b.connections).toEqual([]);
  });

  it('applies tidy positions in one update', () => {
    const b = applyPositions(two(), [{ id: 'b', x: 264, y: 0 }]);
    expect(b.sections[1]).toMatchObject({ x: 264, y: 0 });
  });
});
