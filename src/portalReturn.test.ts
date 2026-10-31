import { describe, expect, it } from "vitest";
import { mountExpeditionPortalReturn, mountPortalReturn, portalReturnHref } from "./portalReturn";

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

  it("shows the expedition return after Begin Expedition and rejects other hosts", () => {
    document.body.innerHTML = `
      <div id="title-screen" class="screen active">
        <button id="btn-new-game">Begin Expedition</button>
        <a data-portal-return hidden>← gunnchOS</a>
      </div>
      <div id="game-screen" class="screen">
        <a data-portal-return hidden>← gunnchOS</a>
      </div>`;
    document.getElementById("title-screen")!.classList.remove("active");
    document.getElementById("game-screen")!.classList.add("active");
    mountExpeditionPortalReturn(document, undefined);
    const expedition = document.querySelector("#game-screen a")!;
    const title = document.querySelector("#title-screen a")!;
    expect(expedition.hidden).toBe(false);
    expect(expedition.getAttribute("href")).toBe("https://gunnchos.com");
    expect(title.hidden).toBe(true);
    mountExpeditionPortalReturn(document, "https://example.com/");
    expect(expedition.hidden).toBe(true);
    expect(expedition.hasAttribute("href")).toBe(false);
  });
});
