/**
 * Mobile museum HUD must stay inside a 390px parent.
 * November runtime measured #hud-museum-honesty-host at ~449.5px and
 * .museum-honesty copy at ~435px inside a 390px viewport (page scrollWidth 691).
 * jsdom does not lay out CSS, so this locks the stylesheet contract that
 * replaces the 28rem/92vw cap with the parent width.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderMuseumHubHonestyHtml } from '@/systems/museumDexPresentation';

const CSS = readFileSync(join(process.cwd(), 'css/styles.css'), 'utf8');
const VIEWPORT_PX = 390;
const ROOT_PX = 16;
const NOVEMBER_HOST_PX = 449.546875;

/** Mirrors `max-width: min(28rem, 100%)` when the parent is the viewport. */
function honestyHostCapPx(parentPx: number, rootPx = ROOT_PX): number {
  return Math.min(28 * rootPx, parentPx);
}

/** Mirrors `max-width: min(36rem, 100%)` for the honesty card. */
function honestyCardCapPx(parentPx: number, rootPx = ROOT_PX): number {
  return Math.min(36 * rootPx, parentPx);
}

function block(selector: string): string {
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  const match = CSS.match(re);
  expect(match, `missing ${selector}`).toBeTruthy();
  return match?.[1] ?? '';
}

describe('museum HUD at 390px', () => {
  it('caps the honesty host and card to the 390px parent instead of the November overflow width', () => {
    expect(block('#hud-museum-honesty-host:not([hidden])')).toMatch(/max-width:\s*min\(28rem,\s*100%\)/);
    expect(block('#hud-museum-honesty-host:not([hidden])')).not.toMatch(/92vw/);
    expect(block('.museum-honesty')).toMatch(/max-width:\s*min\(36rem,\s*100%\)/);
    expect(block('.museum-honesty')).toMatch(/overflow-wrap:\s*anywhere/);
    const start = CSS.indexOf('@media (max-width: 390px)');
    expect(start).toBeGreaterThan(-1);
    const rules = CSS.slice(start, start + 900);
    expect(rules).toContain('#hud-museum-honesty-host');
    expect(rules).toContain('.museum-honesty-title');
    expect(rules).toContain('.museum-honesty-subtitle');
    expect(rules).toContain('.museum-honesty-floors');
    expect(rules).toMatch(/overflow-wrap:\s*anywhere/);
    expect(rules).toMatch(/white-space:\s*normal/);
    expect(honestyHostCapPx(VIEWPORT_PX)).toBe(VIEWPORT_PX);
    expect(honestyHostCapPx(VIEWPORT_PX)).toBeLessThan(NOVEMBER_HOST_PX);
    expect(honestyCardCapPx(VIEWPORT_PX)).toBe(VIEWPORT_PX);
    expect(honestyCardCapPx(VIEWPORT_PX)).toBeLessThan(36 * ROOT_PX);
  });

  it('mounts the honesty HUD in a 390px parent without nowrap or a fixed min width', () => {
    const viewport = document.createElement('div');
    viewport.dataset.viewport = '390';
    viewport.style.width = '390px';
    viewport.style.maxWidth = '390px';
    viewport.style.boxSizing = 'border-box';
    const host = document.createElement('div');
    host.id = 'hud-museum-honesty-host';
    host.dataset.museumHonestyHost = '1';
    host.innerHTML = renderMuseumHubHonestyHtml();
    viewport.append(host);
    document.body.append(viewport);

    expect(host.style.minWidth).toBe('');
    expect(viewport.getAttribute('data-viewport')).toBe('390');
    for (const sel of ['.museum-honesty', '.museum-honesty-title', '.museum-honesty-subtitle', '.museum-honesty-floors']) {
      const el = host.querySelector<HTMLElement>(sel);
      expect(el, sel).toBeTruthy();
      expect(el?.style.whiteSpace).not.toBe('nowrap');
    }
    const text = host.textContent ?? '';
    expect(text).toMatch(/IUCN/);
    expect(text).toContain('blocked_external');
    expect(text).toContain('not Earth-complete');
    expect(text).toContain('0/17');
    expect(text).not.toContain('source_verified release=true');
    viewport.remove();
  });
});
