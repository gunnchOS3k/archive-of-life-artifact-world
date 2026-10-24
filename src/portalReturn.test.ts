import { describe, expect, it } from "vitest";
import { mountPortalReturn, portalReturnHref } from "./portalReturn";

describe("portal return", () => {
  it("defaults an unset gateway to gunnchos.com and rejects other URLs", () => {
    expect(portalReturnHref(undefined)).toBe("https://gunnchos.com");
    expect(portalReturnHref("")).toBe("https://gunnchos.com");
    expect(portalReturnHref("   ")).toBe("https://gunnchos.com");
    expect(portalReturnHref("https://gunnchos.com/")).toBe("https://gunnchos.com");
    expect(portalReturnHref("javascript:alert(1)")).toBeNull();
    expect(portalReturnHref("https://gunnchos-site.gunnchos-finds.workers.dev/")).toBeNull();
    expect(portalReturnHref("https://example.com")).toBeNull();
  });

  it("fills the return anchor with the allowed gateway only", () => {
    document.body.innerHTML =
      '<a data-portal-return hidden aria-label="Return to gunnchOS">← gunnchOS</a>';
    mountPortalReturn(document, undefined);
    const link = document.querySelector("a")!;
    expect(link.hidden).toBe(false);
    expect(link.getAttribute("href")).toBe("https://gunnchos.com");
    mountPortalReturn(document, "https://example.com/");
    expect(link.hidden).toBe(true);
    expect(link.hasAttribute("href")).toBe(false);
  });
});
