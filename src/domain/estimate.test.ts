import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatEstimate, MAX_ESTIMATE_MIN, parseEstimate } from './estimate';

describe('parseEstimate', () => {
  it.each([
    ['25m', 25],
    ['1h', 60],
    ['1h 30m', 90],
    ['1h30m', 90],
    ['1.5h', 90],
    ['90', 90],
    ['2 hrs', 120],
    ['45 min', 45],
    ['1HR 5M', 65],
    ['  10 m ', 10],
    ['99h', MAX_ESTIMATE_MIN],
    ['0.25h', 15],
  ])('parses %j as %i minutes', (input, minutes) => {
    expect(parseEstimate(input)).toEqual({ ok: true, value: minutes });
  });

  it.each(['', '   ', '0', '0m', '0h'])('treats %j as clearing the estimate', (input) => {
    expect(parseEstimate(input)).toEqual({ ok: true, value: null });
  });

  it.each(['abc', '-5', '5941', '100h', '1.5m', '1h 70m', 'h', '1x'])('rejects %j', (input) => {
    const result = parseEstimate(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
  });
});

describe('formatEstimate', () => {
  it.each([
    [25, '25m'],
    [60, '1h'],
    [90, '1h 30m'],
    [5940, '99h'],
    [0, ''],
  ])('formats %i as %j', (minutes, text) => {
    expect(formatEstimate(minutes)).toBe(text);
  });

  it('round-trips every valid value', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: MAX_ESTIMATE_MIN }), (m) => {
        expect(parseEstimate(formatEstimate(m))).toEqual({ ok: true, value: m });
      }),
    );
  });
});
