// Generates tests/fixtures/large-board-50x100.json: the Constitution V performance board
// (50 sections × 10 tasks, 100 connections). Deterministic, so the file only changes on purpose.
import { writeFileSync } from 'node:fs';

let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const hex = (n) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join('');
const uuid = () =>
  `${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[Math.floor(rand() * 4)]}${hex(3)}-${hex(12)}`;

const ACCENTS = ['orange', 'mint', 'pink', 'yellow', 'violet', 'sky'];
const COLS = 10;
const sections = Array.from({ length: 50 }, (_, i) => ({
  id: uuid(),
  title: `Section ${i + 1}`,
  accent: ACCENTS[i % ACCENTS.length],
  x: (i % COLS) * (320 + 24),
  y: Math.floor(i / COLS) * (320 + 24),
  width: 320,
  height: 320,
  createdAt: 1791633600000 + i,
  tasks: Array.from({ length: 10 }, (_, t) => ({
    id: uuid(),
    text: `Task ${t + 1}`,
    done: t % 3 === 0,
    estimateMin: 15 + t * 5,
    subtasks: [],
  })),
}));

const pairs = new Set();
const connections = [];
while (connections.length < 100) {
  const a = Math.floor(rand() * sections.length);
  const b = Math.floor(rand() * sections.length);
  if (a === b || pairs.has(`${a}>${b}`)) continue;
  pairs.add(`${a}>${b}`);
  connections.push({
    id: uuid(),
    from: sections[a].id,
    to: sections[b].id,
    style: connections.length % 2 ? 'line' : 'arrow',
    label: '',
  });
}

const doc = {
  schemaVersion: 1,
  board: { sections, connections, viewport: { x: 0, y: 0, zoom: 0.5 } },
  pomodoro: {
    settings: { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, longBreakEvery: 4, sound: true },
    mode: 'focus',
    status: { kind: 'idle' },
    sessionId: null,
    focusStreak: 0,
    completedToday: { date: '2026-10-10', count: 0 },
    linkedTaskId: null,
    widget: { x: 24, y: 80, visible: false },
  },
  prefs: { theme: 'system', pinned: false },
};

writeFileSync('tests/fixtures/large-board-50x100.json', JSON.stringify(doc, null, 2) + '\n');
console.log(`wrote ${sections.length} sections, ${connections.length} connections`);
