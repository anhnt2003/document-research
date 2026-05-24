const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlight(text: string, query: string): string {
  const safe = escapeHtml(text);
  if (!query.trim()) return safe;
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .map(escapeRegex);
  if (terms.length === 0) return safe;
  const re = new RegExp(`(${terms.join('|')})`, 'gi');
  return safe.replace(re, '<mark>$1</mark>');
}

export function makeSnippet(
  text: string,
  query: string,
  contextChars = 90
): string {
  if (!text) return '';
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (terms.length === 0) {
    return text.slice(0, contextChars * 2) + (text.length > contextChars * 2 ? '…' : '');
  }
  const lower = text.toLowerCase();
  let idx = -1;
  for (const t of terms) {
    const i = lower.indexOf(t.toLowerCase());
    if (i !== -1 && (idx === -1 || i < idx)) idx = i;
  }
  if (idx === -1) {
    return text.slice(0, contextChars * 2) + (text.length > contextChars * 2 ? '…' : '');
  }
  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + contextChars * 2);
  const slice = text.slice(start, end);
  return (start > 0 ? '… ' : '') + slice + (end < text.length ? ' …' : '');
}
