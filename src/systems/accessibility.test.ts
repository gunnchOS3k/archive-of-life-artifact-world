import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_A11Y,
  applyAccessibilitySettings,
  loadAccessibilitySettings,
  saveAccessibilitySettings,
} from '@/systems/accessibility';

describe('accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('persists and applies a11y settings to document root', () => {
    const settings = {
      ...DEFAULT_A11Y,
      reducedMotion: true,
      highContrast: true,
      largeText: true,
    };
    saveAccessibilitySettings(settings);
    expect(loadAccessibilitySettings()).toEqual(settings);
    applyAccessibilitySettings(settings);
    expect(document.documentElement.classList.contains('a11y-reduced-motion')).toBe(true);
    expect(document.documentElement.classList.contains('a11y-high-contrast')).toBe(true);
    expect(document.documentElement.classList.contains('a11y-large-text')).toBe(true);
    expect(document.documentElement.dataset.a11yReducedMotion).toBe('true');
  });
});
