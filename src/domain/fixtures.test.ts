import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadDocument } from './migrations';

// Every committed fixture except the deliberately corrupt one must load.
describe.each(readdirSync('tests/fixtures').filter((f) => f !== 'corrupt.json'))('%s', (file) => {
  it('is a valid document', () => {
    const result = loadDocument(readFileSync(`tests/fixtures/${file}`, 'utf8'));
    expect(result.ok ? 'ok' : result.error).toBe('ok');
  });
});
