import { describe, expect, it } from 'vitest';
import { contrast, hexToHsv, hsvToHex, onColor, parseHex, readableOn } from './color';

describe('parseHex', () => {
  it.each([
    ['#7038F4', '#7038f4'],
    ['7038f4', '#7038f4'],
    [' #abc ', '#aabbcc'],
  ])('%s → %s', (input, hex) => {
    expect(parseHex(input)).toBe(hex);
  });

  it.each(['', '#12345', '#7038f408', 'blue', '#ggg'])('rejects %s', (input) => {
    expect(parseHex(input)).toBeNull();
  });
});

describe('HSV', () => {
  it.each(['#000000', '#ffffff', '#ff0000', '#7038f4', '#2ee6a6', '#808080'])(
    'round-trips %s',
    (hex) => {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    },
  );

  it('maps known colours', () => {
    expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe('#00ff00');
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe('#ff0000');
  });
});

describe('contrast()', () => {
  it('matches known values', () => {
    expect(contrast('#000', '#fff')).toBeCloseTo(21, 5);
    expect(contrast('#777', '#fff')).toBeCloseTo(4.48, 2);
  });
});

// Every custom colour must stay readable (FR-007, FR-027): sweep the hue/value space.
const SWEEP = Array.from({ length: 24 }, (_, i) => i * 15).flatMap((h) =>
  [0.2, 0.5, 0.8, 1].flatMap((v) => [0, 0.5, 1].map((s) => hsvToHex({ h, s, v }))),
);
const SURFACES = { light: '#ffffff', dark: '#141418' }; // --surface-card per theme

describe('readableOn', () => {
  it.each(Object.entries(SURFACES))('keeps accent text ≥ 4.5:1 on the %s card', (_, surface) => {
    for (const hex of SWEEP)
      expect(contrast(readableOn(hex, surface), surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('returns a colour unchanged when it already passes', () => {
    expect(readableOn('#000000', SURFACES.light)).toBe('#000000');
  });
});

describe('onColor', () => {
  it('keeps text on a filled custom accent ≥ 4.5:1', () => {
    for (const hex of SWEEP) expect(contrast(onColor(hex), hex)).toBeGreaterThanOrEqual(4.5);
  });
});
