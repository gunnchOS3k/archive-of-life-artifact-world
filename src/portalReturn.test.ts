import { describe, expect, it } from "vitest";
import { mountPortalReturn, portalReturnHref } from "./portalReturn";

describe("portal return", () => {
  it("accepts an http(s) gateway and strips a trailing slash", () => {
    expect(portalReturnHref("https://gunnchos.com/")).toBe("https://gunnchos.com");
    expect(portalReturnHref("javascript:alert(1)")).toBeNull();
  });

  it("fills only configured anchors and leaves them hidden otherwise", () => {
    document.body.innerHTML =
      '<a data-portal-return hidden aria-label="Return to gunnchOS">← gunnchOS</a>';
    mountPortalReturn(document, undefined);
    const link = document.querySelector("a")!;
    expect(link.hidden).toBe(true);
    mountPortalReturn(document, "https://gunnchos-site.gunnchos-finds.workers.dev/");
    expect(link.hidden).toBe(false);
    expect(link.getAttribute("href")).toBe("https://gunnchos-site.gunnchos-finds.workers.dev");
  });
});
