/**
 * Player panels (ArchiveDex, Journal, Time Atlas, …) behave as modal dialogs:
 * a backdrop hides the HUD behind them, the HUD is inert, Tab stays inside the
 * panel, and focus returns to whatever opened it.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let opener: HTMLElement | null = null;
let trapped: HTMLElement | null = null;

function visibleFocusables(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest('.hidden') && !el.hidden);
}

function ensureBackdrop(panel: HTMLElement): HTMLElement {
  const host = panel.parentElement ?? document.body;
  let backdrop = document.getElementById('panel-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'panel-backdrop';
    backdrop.className = 'panel-backdrop hidden';
    backdrop.setAttribute('aria-hidden', 'true');
    host.insertBefore(backdrop, host.firstElementChild?.nextSibling ?? null);
  }
  return backdrop;
}

function onTrapKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !trapped) return;
  const items = visibleFocusables(trapped);
  if (!items.length) {
    e.preventDefault();
    trapped.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement as HTMLElement | null;
  const inside = active ? trapped.contains(active) : false;
  if (e.shiftKey && (active === first || !inside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !inside)) {
    e.preventDefault();
    first.focus();
  }
}

export function openPanelModal(panel: HTMLElement, from: Element | null = document.activeElement) {
  if (trapped && trapped !== panel) closePanelModal({ restoreFocus: false });
  opener = from instanceof HTMLElement && from !== document.body ? from : opener;
  trapped = panel;

  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  const heading = panel.querySelector('.panel-header h2');
  if (heading) {
    if (!heading.id) heading.id = `${panel.id}-title`;
    panel.setAttribute('aria-labelledby', heading.id);
  }
  if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');

  ensureBackdrop(panel).classList.remove('hidden');
  document.getElementById('hud')?.setAttribute('inert', '');
  document.addEventListener('keydown', onTrapKeydown, true);

  const target = panel.querySelector<HTMLElement>('.panel-close') ?? visibleFocusables(panel)[0] ?? panel;
  target.focus();
}

export function closePanelModal(opts: { restoreFocus?: boolean } = {}) {
  document.getElementById('panel-backdrop')?.classList.add('hidden');
  document.getElementById('hud')?.removeAttribute('inert');
  document.removeEventListener('keydown', onTrapKeydown, true);
  trapped = null;
  const back = opener;
  opener = null;
  if (opts.restoreFocus !== false && back && back.isConnected) back.focus();
}
