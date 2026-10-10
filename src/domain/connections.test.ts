import { describe, expect, it } from 'vitest';
import { BoardSchema } from './schema';
import {
  canConnect,
  connect,
  removeConnection,
  reshape,
  restyle,
  reverse,
  setLabel,
} from './connections';
import { emptyDocument } from './defaults';
import { createSection } from './sections';

const A = '40016d9b-c8cf-4068-b880-b0f78bf4bac1';
const B = '74a19df9-66c3-4f90-bc2c-12cde0177822';
const C1 = 'af4639e6-f906-4673-ad72-5747ccab7967';
const C2 = '909d42ef-51ed-421f-a79f-ca5ff61335b2';

function board() {
  let b = emptyDocument(0).board;
  b = createSection(b, { id: A, x: 0, y: 0, now: 0 });
  return createSection(b, { id: B, x: 400, y: 0, now: 0 });
}

describe('connections', () => {
  it('connects two sections with an unlabelled arrow', () => {
    const b = connect(board(), { id: C1, from: A, to: B });
    expect(b.connections).toEqual([
      { id: C1, from: A, to: B, style: 'arrow', shape: 'straight', label: '' },
    ]);
    expect(BoardSchema.safeParse(b).success).toBe(true);
  });

  it('rejects self-connections, duplicates and unknown sections (FR-018)', () => {
    const b = connect(board(), { id: C1, from: A, to: B });
    expect(canConnect(b, A, A)).toBe(false);
    expect(canConnect(b, A, B)).toBe(false);
    expect(canConnect(b, A, 'nope')).toBe(false);
    expect(connect(b, { id: C2, from: A, to: B })).toBe(b);
    expect(connect(b, { id: C2, from: A, to: A })).toBe(b);
  });

  it('allows the opposite direction', () => {
    const b = connect(board(), { id: C1, from: A, to: B });
    expect(canConnect(b, B, A)).toBe(true);
    expect(connect(b, { id: C2, from: B, to: A }).connections).toHaveLength(2);
  });

  it('restyles, relabels (max 40 chars) and removes', () => {
    let b = connect(board(), { id: C1, from: A, to: B });
    b = restyle(b, C1, 'line');
    b = setLabel(b, C1, 'x'.repeat(50));
    expect(b.connections[0]).toMatchObject({ style: 'line', label: 'x'.repeat(40) });
    expect(restyle(b, C1, 'line')).toBe(b);
    expect(removeConnection(b, C1).connections).toEqual([]);
  });

  it('switches between straight and curved; the same shape is a no-op', () => {
    let b = connect(board(), { id: C1, from: A, to: B });
    b = reshape(b, C1, 'curved');
    expect(b.connections[0]).toMatchObject({ shape: 'curved', style: 'arrow' });
    expect(reshape(b, C1, 'curved')).toBe(b);
    expect(BoardSchema.safeParse(b).success).toBe(true);
  });

  it('reverses unless that would duplicate an existing connection', () => {
    let b = connect(board(), { id: C1, from: A, to: B });
    b = reverse(b, C1);
    expect(b.connections[0]).toMatchObject({ from: B, to: A });
    const both = connect(b, { id: C2, from: A, to: B });
    expect(reverse(both, C1)).toBe(both);
  });
});
