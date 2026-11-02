import { describe, expect, it } from 'vitest';
import {
  PROCEDURAL_PROXY_SURFACE_HONESTY,
  PROCEDURAL_PROXY_SURFACE_IDS,
  assessProceduralProxySurfaceHonesty,
} from '@/systems/proceduralProxySurfaceHonesty';
import { buildVisualPackHarness } from '@/systems/visualPackHarness';

describe('procedural-proxy surface honesty — procedural ≠ finished', () => {
  it('keeps museum/region surfaces as PROCEDURAL_PROXY', () => {
    const report = assessProceduralProxySurfaceHonesty();
    expect(report.schema).toBe('archive.procedural_proxy_surface_honesty/v1');
    expect(report.proceduralProxySurfaces).toBe(PROCEDURAL_PROXY_SURFACE_IDS.length);
    expect(report.allProceduralProxy).toBe(true);
    expect(report.paintedRemasterClaimed).toBe(false);
    expect(report.proceduralNeqFinished).toBe(true);
    expect(report.deferredHeavyWorkCount).toBeGreaterThanOrEqual(4);
    expect(report.VISUAL_MODEL_REVIEW).toBe('UNAVAILABLE');
    expect(report.HUMAN).toBe(false);
    expect(report.RC2).toBe(false);
    expect(report.V1).toBe(false);
    expect(report.honestyBanner).toContain(PROCEDURAL_PROXY_SURFACE_HONESTY.slice(0, 24));
  });

  it('harness lists procedural-proxy world captures', () => {
    const harness = buildVisualPackHarness();
    for (const id of PROCEDURAL_PROXY_SURFACE_IDS) {
      expect(harness.surfaces.some((s) => s.id === id && s.capture === 'PROCEDURAL_PROXY')).toBe(
        true,
      );
    }
  });
});
