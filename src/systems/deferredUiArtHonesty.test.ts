import { describe, expect, it } from 'vitest';
import {
  DEFERRED_UI_ART_HONESTY,
  DEFERRED_UI_SURFACE_IDS,
  assessDeferredUiArtHonesty,
} from '@/systems/deferredUiArtHonesty';
import { buildVisualPackHarness } from '@/systems/visualPackHarness';

describe('deferred UI art honesty — deferred ≠ finished', () => {
  it('keeps deferred UI surfaces unfinished', () => {
    const report = assessDeferredUiArtHonesty();
    expect(report.schema).toBe('archive.deferred_ui_art_honesty/v1');
    expect(report.uiArtFinished).toBe(false);
    expect(report.proceduralNeqFinished).toBe(true);
    expect(report.deferredUiSurfaces).toBe(DEFERRED_UI_SURFACE_IDS.length);
    expect(report.VISUAL_MODEL_REVIEW).toBe('UNAVAILABLE');
    expect(report.HUMAN).toBe(false);
    expect(report.RC2).toBe(false);
    expect(report.V1).toBe(false);
    expect(report.honestyBanner).toContain(DEFERRED_UI_ART_HONESTY.slice(0, 20));
  });

  it('harness lists deferred UI captures', () => {
    const harness = buildVisualPackHarness();
    for (const id of DEFERRED_UI_SURFACE_IDS) {
      expect(harness.surfaces.some((s) => s.id === id && s.capture === 'DEFERRED')).toBe(true);
    }
  });
});
