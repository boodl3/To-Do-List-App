/** Colour maths for custom section accents (FR-007): hex ⇄ HSV and WCAG contrast. */

export interface Hsv {
  /** 0–360 */
  h: number;
  /** 0–1 */
  s: number;
  /** 0–1 */
  v: number;
}

/** `#rgb`, `#rrggbb`, with or without `#`, any case → `#rrggbb`; anything else → null. */
export function parseHex(input: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, '$&$&') : m[1]!;
  return `#${h.toLowerCase()}`;
}

function channels(hex: string): [number, number, number] {
  const h = parseHex(hex);
  if (!h) throw new Error(`not a hex colour: ${hex}`);
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

const toHex = (rgb: number[]) =>
  `#${rgb
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

export function hexToHsv(hex: string): Hsv {
  const [r, g, b] = channels(hex);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return toHex([f(5), f(3), f(1)]);
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.2 contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;

/**
 * `hex` as text on `surface`, darkened (light surface) or lightened (dark surface) just enough
 * to reach 4.5:1. Black/white always pass on the app's surfaces, so this terminates.
 */
export function readableOn(hex: string, surface: string): string {
  const target = luminance(surface) > 0.18 ? 0 : 1;
  const rgb = channels(hex);
  for (let t = 0; t <= 1; t += 0.02) {
    const mixed = toHex(rgb.map((c) => c + (target - c) * t));
    if (contrast(mixed, surface) >= AA) return mixed;
  }
  return target ? '#ffffff' : '#000000';
}

/** Text on a filled `hex` (buttons, progress): the app's near-black if it passes, else white. */
export function onColor(hex: string): string {
  if (contrast('#111114', hex) >= AA) return '#111114';
  return contrast('#ffffff', hex) >= AA ? '#ffffff' : '#000000';
}
