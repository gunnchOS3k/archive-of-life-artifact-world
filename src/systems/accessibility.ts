/**
 * Accessibility settings — persisted locally, applied to document root.
 */

export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderHints: boolean;
}

const STORAGE_KEY = 'aol_a11y_settings';

export const DEFAULT_A11Y: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  screenReaderHints: true,
};

export function loadAccessibilitySettings(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      return { ...DEFAULT_A11Y, reducedMotion: !!prefersReduced };
    }
    const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>;
    return { ...DEFAULT_A11Y, ...parsed };
  } catch {
    return { ...DEFAULT_A11Y };
  }
}

export function saveAccessibilitySettings(settings: AccessibilitySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function applyAccessibilitySettings(
  settings: AccessibilitySettings,
  root: HTMLElement = document.documentElement,
): void {
  root.classList.toggle('a11y-reduced-motion', settings.reducedMotion);
  root.classList.toggle('a11y-high-contrast', settings.highContrast);
  root.classList.toggle('a11y-large-text', settings.largeText);
  root.classList.toggle('a11y-sr-hints', settings.screenReaderHints);
  root.dataset.a11yReducedMotion = String(settings.reducedMotion);
  root.dataset.a11yHighContrast = String(settings.highContrast);
  root.dataset.a11yLargeText = String(settings.largeText);
  root.dataset.a11ySrHints = String(settings.screenReaderHints);
}

/** True when settings or OS prefers-reduced-motion ask for stillness. */
export function isReducedMotionActive(
  root: HTMLElement | Document = typeof document !== 'undefined' ? document.documentElement : (undefined as unknown as HTMLElement),
): boolean {
  try {
    const el =
      root && 'documentElement' in (root as Document)
        ? (root as Document).documentElement
        : (root as HTMLElement | undefined);
    if (el?.classList?.contains('a11y-reduced-motion')) return true;
    if (el?.dataset?.a11yReducedMotion === 'true') return true;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Visually hidden SR hint — only emitted when screenReaderHints is on. */
export function screenReaderHintHtml(text: string, enabled?: boolean): string {
  const on =
    enabled ??
    (typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('a11y-sr-hints') ||
        document.documentElement.dataset.a11ySrHints === 'true'));
  if (!on || !text.trim()) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<span class="a11y-sr-only" data-a11y-sr-hint="1">${escaped}</span>`;
}

export function observationReducedMotionAnnouncement(): string {
  return 'Reduced motion active: organism holds a calm observe pose; locomotion animation suppressed.';
}
