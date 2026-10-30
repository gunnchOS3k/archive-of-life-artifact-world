import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_A11Y,
  applyAccessibilitySettings,
  isReducedMotionActive,
  loadAccessibilitySettings,
  observationReducedMotionAnnouncement,
  saveAccessibilitySettings,
  screenReaderHintHtml,
} from '@/systems/accessibility';

describe('accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    delete document.documentElement.dataset.a11yReducedMotion;
    delete document.documentElement.dataset.a11ySrHints;
  });

  it('persists and applies a11y settings to document root', () => {
    const settings = {
      ...DEFAULT_A11Y,
      reducedMotion: true,
      highContrast: true,
      largeText: true,
      screenReaderHints: true,
    };
    saveAccessibilitySettings(settings);
    expect(loadAccessibilitySettings()).toEqual(settings);
    applyAccessibilitySettings(settings);
    expect(document.documentElement.classList.contains('a11y-reduced-motion')).toBe(true);
    expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(true);
    expect(document.documentElement.classList.contains('a11y-large-text')).toBe(true);
    expect(document.documentElement.classList.contains('a11y-sr-hints')).toBe(true);
    expect(document.documentElement.dataset.a11yReducedMotion).toBe('true');
    expect(isReducedMotionActive()).toBe(true);
  });

  it('emits screen-reader hints only when a11y-sr-hints is active', () => {
    expect(screenReaderHintHtml('quiet observe', false)).toBe('');
    const html = screenReaderHintHtml('quiet observe', true);
    expect(html).toContain('data-a11y-sr-hint');
    expect(html).toContain('quiet observe');
    expect(observationReducedMotionAnnouncement()).toMatch(/Reduced motion/i);
  });
});
