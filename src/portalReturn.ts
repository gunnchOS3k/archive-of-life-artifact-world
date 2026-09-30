export function portalReturnHref(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.replace(/\/+$/, "");
}

export function mountPortalReturn(doc: Document, value: string | undefined): void {
  const href = portalReturnHref(value);
  for (const el of doc.querySelectorAll<HTMLAnchorElement>("[data-portal-return]")) {
    if (!href) {
      el.hidden = true;
      el.removeAttribute("href");
      continue;
    }
    el.href = href;
    el.hidden = false;
  }
}
