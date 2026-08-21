/** Escape untrusted scientific/citation strings before HTML insertion. */
export function escapeHtml(raw: unknown): string {
  const s = raw == null ? '' : String(raw);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Render user-visible text only — never interpret markup from sources. */
export function safeTextSpan(className: string, raw: unknown): string {
  return `<span class="${escapeHtml(className)}">${escapeHtml(raw)}</span>`;
}

export function containsActiveHtmlPayload(raw: string): boolean {
  return /<\s*script\b/i.test(raw) || /\bon\w+\s*=/i.test(raw) || /javascript:/i.test(raw);
}
