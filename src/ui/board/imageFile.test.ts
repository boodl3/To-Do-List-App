import { describe, expect, it } from 'vitest';
import { tone } from './imageFile';

const pixels = (...rgba: number[][]) => new Uint8ClampedArray(rgba.flat());

describe('tone', () => {
  it('is dark or light by luminance, weighting each pixel by its alpha', () => {
    expect(tone(pixels([20, 20, 30, 255], [60, 50, 40, 255]))).toBe('dark');
    expect(tone(pixels([240, 240, 230, 255], [200, 200, 200, 255]))).toBe('light');
    expect(tone(pixels([0, 0, 255, 255]))).toBe('dark'); // pure blue looks dark
    expect(tone(pixels([255, 255, 255, 255], [0, 0, 0, 20]))).toBe('light');
  });

  it('is null when transparent, so the card behind decides', () => {
    expect(tone(pixels([0, 0, 0, 0], [255, 255, 255, 0]))).toBeNull();
  });
});
