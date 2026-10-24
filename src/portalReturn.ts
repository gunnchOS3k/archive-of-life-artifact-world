const GUEST_PORTAL_URL = "https://gunnchos.com";

function allowedPortalUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password || url.port) return null;
  if (url.hostname !== "gunnchos.com") return null;
  if (url.pathname !== "/" || url.search || url.hash) return null;
  return GUEST_PORTAL_URL;
}

export function portalReturnHref(value: string | undefined): string | null {
  if (value == null || !value.trim()) return GUEST_PORTAL_URL;
  return allowedPortalUrl(value.trim());
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
