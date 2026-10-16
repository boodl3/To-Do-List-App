import { describe, expect, it } from 'vitest';
import { ACCENTS, emptyDocument } from './defaults';
import {
  applyPositions,
  bringToFront,
  createSection,
  deleteSection,
  editNote,
  isNote,
  isImage,
  sectionName,
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

  it('adds an empty note with the note option', () => {
    const b = createSection(board(), { id: 'a', x: 0, y: 0, now: 0, note: true });
    expect(b.sections[0]).toMatchObject({ note: '', tasks: [] });
    expect(isNote(b.sections[0]!)).toBe(true);
    expect('note' in createSection(board(), { id: 'b', x: 0, y: 0, now: 0 }).sections[0]!).toBe(
      false,
    );
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
      connections: [
        {
          id: 'c',
          from: 'a',
          to: 'b',
          style: 'arrow' as const,
          shape: 'straight' as const,
          label: '',
        },
      ],
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

describe('editNote', () => {
  const withNote = () => createSection(board(), { id: 'n', x: 0, y: 0, now: 0, note: true });

  it('stores the HTML, capped at the schema limit; same board back when unchanged', () => {
    const b = editNote(withNote(), 'n', '<b>hi</b>');
    expect(b.sections[0]!.note).toBe('<b>hi</b>');
    expect(editNote(b, 'n', '<b>hi</b>')).toBe(b);
    expect(editNote(b, 'n', 'x'.repeat(100_001)).sections[0]!.note).toHaveLength(100_000);
  });

  it('leaves task sections alone', () => {
    const b = createSection(board(), { id: 's', x: 0, y: 0, now: 0 });
    expect(editNote(b, 's', 'x')).toBe(b);
  });
});

describe('image cards', () => {
  const image = { src: 'data:image/webp;base64,UklGRg==', width: 1600, height: 900 };
  const add = (img = image) => createSection(board(), { id: 'i', x: 0, y: 0, now: 0, image: img });
  const card = (b: ReturnType<typeof add>) => b.sections[0]!;
  const ratio = (s: ReturnType<typeof card>) => s.width / s.height;

  it('starts fitted in a 320 square at the picture ratio', () => {
    const s = card(add());
    expect(isImage(s) && !isNote(s)).toBe(true);
    expect(sectionName(s)).toBe('Untitled image');
    expect(s.width).toBe(320);
    expect(s.height).toBe(180);
    const tall = card(add({ ...image, width: 300, height: 900 }));
    expect(tall.width).toBe(240); // 320 tall would be 107 wide: the minimum width wins
    expect(tall.height).toBe(720);
  });

  it('keeps the aspect ratio when resized by width, by height, or from the top', () => {
    const b = add();
    const wide = card(resizeSection(b, 'i', { x: 0, y: 0, width: 640, height: 999 }));
    expect([wide.width, wide.height]).toEqual([640, 360]);

    const taller = card(resizeSection(b, 'i', { x: 0, y: 0, width: 320, height: 360 }));
    expect([taller.width, taller.height]).toEqual([640, 360]);

    const s = card(b);
    const fromTop = card(
      resizeSection(b, 'i', { x: 0, y: -100, width: 480, height: s.height + 100 }),
    );
    expect(fromTop.y + fromTop.height).toBe(s.y + s.height); // bottom edge stays put
    expect(ratio(fromTop)).toBeCloseTo(16 / 9, 1);
  });

  it('never shrinks below the minimum card size', () => {
    const s = card(resizeSection(add(), 'i', { x: 0, y: 0, width: 10, height: 10 }));
    // A 16:9 picture needs 284 of width to reach the 160 minimum height.
    expect([s.width, s.height]).toEqual([284, 160]);
  });
});
