import type { CSSProperties } from 'react';
import { onColor, readableOn } from '../../domain/color';
import type { Accent } from '../../domain/schema';

/** --surface-card per theme; contrast.test.ts checks these match themes.css. */
export const SURFACE_CARD = { light: '#ffffff', dark: '#141418' } as const;

export const isCustomAccent = (accent: Accent): boolean => accent.startsWith('#');

/**
 * Inline variables for a custom `#rrggbb` accent (tokens.css `[data-accent^='#']` picks the
 * text colour for the active theme). Presets need none: their tokens are hand-tuned.
 */
export function customAccentStyle(accent: Accent): CSSProperties | undefined {
  if (!isCustomAccent(accent)) return undefined;
  return {
    '--custom': accent,
    '--custom-text-light': readableOn(accent, SURFACE_CARD.light),
    '--custom-text-dark': readableOn(accent, SURFACE_CARD.dark),
    '--custom-on': onColor(accent),
  } as CSSProperties;
}
