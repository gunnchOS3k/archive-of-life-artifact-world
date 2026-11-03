import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closePanelModal, openPanelModal } from './panelModal';

const root = join(__dirname, '..', '..');
const css = (name: string) => readFileSync(join(root, 'css', name), 'utf8');

function ruleBody(sheet: string, selector: string): string {
  const at = sheet.indexOf(`${selector} {`);
  expect(at, `missing rule ${selector}`).toBeGreaterThanOrEqual(0);
  return sheet.slice(sheet.indexOf('{', at) + 1, sheet.indexOf('}', at));
}

function declared(body: string, prop: string): string {
  const m = body.match(new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+);`));
  expect(m, `missing ${prop}`).not.toBeNull();
  return m![1].trim();
}

function resolveVar(value: string, sheet: string): string {
  const m = value.match(/^var\((--[\w-]+)\)$/);
  if (!m) return value;
  const def = sheet.match(new RegExp(`${m[1]}\\s*:\\s*([^;]+);`));
  expect(def, `undefined ${m[1]}`).not.toBeNull();
  return resolveVar(def![1].trim(), sheet);
}

function alphaOf(color: string): number {
  if (/^#[0-9a-f]{6}$/i.test(color) || /^rgb\(/i.test(color)) return 1;
  const m = color.match(/^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/i);
  if (m) return Number(m[1]);
  throw new Error(`unparsed color ${color}`);
}

describe('player panel opacity', () => {
  it('living-archive panels paint an opaque background so the HUD cannot bleed through', () => {
    const sheet = css('living-archive.css');
    const bg = resolveVar(declared(ruleBody(sheet, 'body.vxp4-living-archive .panel'), 'background'), sheet);
    expect(alphaOf(bg)).toBe(1);
  });

  it('a dimming backdrop sits directly beneath panels', () => {
    const sheet = css('styles.css');
    const backdrop = ruleBody(sheet, '.panel-backdrop');
    const panel = ruleBody(sheet, '.panel');
    expect(Number(declared(backdrop, 'z-index'))).toBe(Number(declared(panel, 'z-index')) - 1);
    expect(declared(backdrop, 'inset')).toBe('0');
    expect(alphaOf(declared(backdrop, 'background'))).toBeGreaterThanOrEqual(0.5);
  });
});

describe('ArchiveDex panel as a modal dialog', () => {
  let panel: HTMLElement;
  let opener: HTMLElement;

  beforeEach(() => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    document.body.innerHTML = html.slice(html.indexOf('<body'), html.lastIndexOf('</body>')).replace(/^<body[^>]*>/, '');
    panel = document.getElementById('panel-archive')!;
    opener = document.getElementById('btn-archive')!;
    opener.focus();
    panel.classList.remove('hidden');
    openPanelModal(panel);
  });

  afterEach(() => {
    closePanelModal({ restoreFocus: false });
    document.body.innerHTML = '';
  });

  it('exposes dialog semantics labelled by the panel heading', () => {
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    const label = document.getElementById(panel.getAttribute('aria-labelledby')!);
    expect(label?.textContent).toContain('ArchiveDex');
  });

  it('shows the backdrop, makes the HUD inert, and moves focus into the panel', () => {
    expect(document.getElementById('panel-backdrop')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('hud')?.hasAttribute('inert')).toBe(true);
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it('wraps Tab and Shift+Tab inside the panel', () => {
    const items = [...panel.querySelectorAll<HTMLElement>('button, input, select')].filter((el) => !el.closest('.hidden'));
    const first = items[0];
    const last = items[items.length - 1];
    last.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);
  });

  it('pulls stray focus from outside back into the panel', () => {
    opener.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it('restores HUD and focus on close', () => {
    panel.classList.add('hidden');
    closePanelModal();
    expect(document.getElementById('panel-backdrop')?.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('hud')?.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });
});
