import { describe, expect, it } from 'vitest';
import { sanitizeNote } from './noteHtml';

describe('sanitizeNote', () => {
  it('keeps the editor formatting', () => {
    const html = '<b>a</b><i>b</i><u>c</u><strike>d</strike><ul><li>e</li></ul><ol><li>f</li></ol>';
    expect(sanitizeNote(html)).toBe(html);
    expect(sanitizeNote('<div>a<br></div>')).toBe('<div>a<br></div>');
  });

  it('strips attributes, scripts and unknown tags', () => {
    expect(sanitizeNote('<b onclick="x()" style="color:red">a</b>')).toBe('<b>a</b>');
    expect(sanitizeNote('<img src=x onerror="alert(1)">a<script>alert(2)</script>')).toBe('a');
    expect(sanitizeNote('<a href="javascript:x()"><span>link</span></a>')).toBe('link');
    expect(sanitizeNote('<!-- c --><style>p{}</style>t')).toBe('t');
  });
});
