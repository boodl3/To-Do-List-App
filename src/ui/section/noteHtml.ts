/** Formatting the note editor produces; everything else is unwrapped to its text. */
const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'UL', 'OL', 'LI']);
const BLOCKS = new Set(['DIV', 'P', 'BR']);
/** Dropped with their contents: their text is code, not note text. */
const DROPPED = new Set(['SCRIPT', 'STYLE', 'TEMPLATE']);

function clean(parent: ParentNode) {
  for (const child of [...parent.childNodes]) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (!(child instanceof Element) || DROPPED.has(child.tagName)) {
      child.remove();
      continue;
    }
    clean(child);
    if (ALLOWED.has(child.tagName) || BLOCKS.has(child.tagName)) {
      for (const a of [...child.attributes]) child.removeAttribute(a.name);
    } else {
      child.replaceWith(...child.childNodes);
    }
  }
}

/**
 * Note HTML is read from disk and from the editor, so it's rebuilt from an allowlist with every
 * attribute (event handlers, styles, links) removed. Parsing in a <template> runs nothing.
 */
export function sanitizeNote(html: string): string {
  const t = document.createElement('template');
  t.innerHTML = html;
  clean(t.content);
  return t.innerHTML;
}
