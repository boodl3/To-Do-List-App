import type { Board, Connection } from './schema';

/** Connections between sections (FR-016 – FR-018). Rejected/no-op changes return the same board. */
export function canConnect(board: Board, from: string, to: string): boolean {
  const ids = new Set(board.sections.map((s) => s.id));
  return (
    from !== to &&
    ids.has(from) &&
    ids.has(to) &&
    !board.connections.some((c) => c.from === from && c.to === to)
  );
}

export function connect(
  board: Board,
  { id, from, to }: { id: string; from: string; to: string },
): Board {
  if (!canConnect(board, from, to)) return board;
  const c: Connection = { id, from, to, style: 'arrow', label: '' };
  return { ...board, connections: [...board.connections, c] };
}

function update(board: Board, id: string, fn: (c: Connection) => Connection): Board {
  const i = board.connections.findIndex((c) => c.id === id);
  if (i === -1) return board;
  const next = fn(board.connections[i]!);
  return next === board.connections[i]
    ? board
    : { ...board, connections: board.connections.with(i, next) };
}

export function restyle(board: Board, id: string, style: Connection['style']): Board {
  return update(board, id, (c) => (c.style === style ? c : { ...c, style }));
}

export function setLabel(board: Board, id: string, label: string): Board {
  const value = label.trim().slice(0, 40);
  return update(board, id, (c) => (c.label === value ? c : { ...c, label: value }));
}

/** Swap direction, unless the reversed connection already exists. */
export function reverse(board: Board, id: string): Board {
  const c = board.connections.find((x) => x.id === id);
  if (!c || board.connections.some((x) => x.from === c.to && x.to === c.from)) return board;
  return update(board, id, () => ({ ...c, from: c.to, to: c.from }));
}

export function removeConnection(board: Board, id: string): Board {
  return board.connections.some((c) => c.id === id)
    ? { ...board, connections: board.connections.filter((c) => c.id !== id) }
    : board;
}
