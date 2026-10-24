import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { mountExpeditionPortalReturn } from "./portalReturn.ts";

function anchor() {
  const attrs = new Map();
  return {
    hidden: true,
    set href(value) {
      attrs.set("href", value);
    },
    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null;
    },
    hasAttribute(name) {
      return attrs.has(name);
    },
    removeAttribute(name) {
      attrs.delete(name);
    },
  };
}

function screen(link) {
  return {
    classList: new Set(),
    querySelectorAll(selector) {
      return selector === "[data-portal-return]" ? [link] : [];
    },
  };
}

describe("expedition portal return", () => {
  it("is available after Begin Expedition and rejects other hosts", () => {
    const titleLink = anchor();
    const expeditionLink = anchor();
    const title = screen(titleLink);
    const expedition = screen(expeditionLink);
    title.classList.add("active");
    const doc = {
      getElementById(id) {
        if (id === "title-screen") return title;
        if (id === "game-screen") return expedition;
        return null;
      },
    };

    title.classList.delete("active");
    expedition.classList.add("active");
    mountExpeditionPortalReturn(doc, undefined);
    assert.equal(expeditionLink.hidden, false);
    assert.equal(expeditionLink.getAttribute("href"), "https://gunnchos.com");
    assert.equal(titleLink.hidden, true);
    assert.equal(titleLink.hasAttribute("href"), false);

    mountExpeditionPortalReturn(doc, "https://example.com/");
    assert.equal(expeditionLink.hidden, true);
    assert.equal(expeditionLink.hasAttribute("href"), false);
  });

  it("wires the expedition return to the screen opened by Begin Expedition", () => {
    const main = readFileSync(new URL("./main.ts", import.meta.url), "utf8");
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const switched = main.indexOf("getElementById('game-screen')!.classList.add('active')");
    const mounted = main.indexOf("mountExpeditionPortalReturn(document, import.meta.env.VITE_GUNNCHOS_PORTAL_URL)");
    assert.ok(switched > 0);
    assert.ok(mounted > switched);
    assert.match(html, /id="btn-new-game"[^>]*>Begin Expedition/);
    assert.match(html, /id="game-screen"[\s\S]*data-portal-return/);
  });
});
