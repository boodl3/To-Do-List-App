import { describe, expect, it } from 'vitest';
import { zoomStep } from './zoomStep';

describe('zoomStep', () => {
  it('moves 10 percentage points from an on-grid zoom', () => {
    expect(zoomStep(1, 1)).toBe(1.1);
    expect(zoomStep(1, -1)).toBe(0.9);
    expect(zoomStep(0.3, -1)).toBe(0.2);
  });

  it('snaps an off-grid zoom (Ctrl+scroll, pinch) to the next 10 in that direction', () => {
    expect(zoomStep(1.15, 1)).toBe(1.2);
    expect(zoomStep(1.15, -1)).toBe(1.1);
  });

  it('ignores float noise near the grid', () => {
    expect(zoomStep(1.1000000001, 1)).toBe(1.2);
    expect(zoomStep(0.8999999, -1)).toBe(0.8);
  });
});
