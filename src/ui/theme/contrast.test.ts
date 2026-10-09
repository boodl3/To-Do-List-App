import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Parses `--token: value;` declarations from the theme files and checks WCAG 2.2 AA pairs. */
const css = (f: string) => readFileSync(`src/ui/theme/${f}`, 'utf8');

function declarations(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]),
  );
}

function blockAfter(source: string, selector: string): string {
  const start = source.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = source.indexOf('{', start);
  return source.slice(open + 1, source.indexOf('}', open));
}

const tokens = declarations(blockAfter(css('tokens.css'), ':root {'));
const themes = css('themes.css');
const THEMES = {
  light: { ...tokens, ...declarations(blockAfter(themes, ":root,\n[data-theme='light']")) },
  dark: { ...tokens, ...declarations(blockAfter(themes, "[data-theme='dark']")) },
};

function resolve(vars: Record<string, string>, name: string): string {
  let value = vars[name];
  for (let i = 0; value?.startsWith('var(') && i < 5; i++) value = vars[value.slice(4, -1)];
  if (!value?.startsWith('#')) throw new Error(`${name} is not a hex colour: ${String(value)}`);
  return value;
}

function luminance(hex: string): number {
  const h = hex.length === 4 ? hex.slice(1).replace(/./g, '$&$&') : hex.slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const SURFACES = ['--surface-board', '--surface-card', '--surface-raised'];
const ACCENTS = ['orange', 'mint', 'pink', 'yellow', 'violet', 'sky'];

describe.each(Object.entries(THEMES))('%s theme meets WCAG 2.2 AA', (_, vars) => {
  const ratio = (fg: string, bg: string) => contrast(resolve(vars, fg), resolve(vars, bg));

  it.each(SURFACES.flatMap((bg) => ['--text', '--text-muted', '--danger'].map((fg) => [fg, bg])))(
    'body text %s on %s ≥ 4.5:1',
    (fg, bg) => {
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(ACCENTS)('accent text %s on cards ≥ 4.5:1', (accent) => {
    expect(ratio(`--accent-${accent}-text`, '--surface-card')).toBeGreaterThanOrEqual(4.5);
  });

  it.each(ACCENTS)('text on a filled %s accent ≥ 4.5:1', (accent) => {
    expect(ratio('--on-accent', `--accent-${accent}`)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SURFACES)('focus ring and control borders on %s ≥ 3:1', (bg) => {
    expect(ratio('--focus-ring', bg)).toBeGreaterThanOrEqual(3);
    expect(ratio('--control-border', bg)).toBeGreaterThanOrEqual(3);
  });
});

describe('contrast()', () => {
  it('matches known values', () => {
    expect(contrast('#000', '#fff')).toBeCloseTo(21, 5);
    expect(contrast('#777', '#fff')).toBeCloseTo(4.48, 2);
  });
});
