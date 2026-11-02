import { describe, expect, it } from 'vitest';
import {
  MUSEUM_ART_HONESTY,
  assessMuseumArtHonesty,
} from '@/systems/museumArtHonesty';
import { buildVisualPackHarness } from '@/systems/visualPackHarness';

describe('museum art honesty — procedural ≠ finished', () => {
  it('keeps museum hub art unfinished while gameplay may be implemented', () => {
    const report = assessMuseumArtHonesty();
    expect(report.schema).toBe('archive.museum_art_honesty/v1');
    expect(report.museumHubGameplayImplemented).toBe(true);
    expect(report.museumArtFinished).toBe(false);
    expect(report.proceduralNeqFinished).toBe(true);
    expect(report.visual.VISUAL_MODEL_REVIEW).toBe('UNAVAILABLE');
    expect(report.visual.museumHubCapture).toBe('PROCEDURAL_PROXY');
    expect(report.visual.paintedRemasterClaimed).toBe(false);
    expect(report.HUMAN).toBe(false);
    expect(report.RC2).toBe(false);
    expect(report.V1).toBe(false);
    expect(report.honestyBanner).toContain(MUSEUM_ART_HONESTY.slice(0, 24));
  });

  it('visual harness lists museum as procedural proxy and defers finished art', () => {
    const harness = buildVisualPackHarness();
    expect(harness.surfaces.some((s) => s.id === 'museum_hub' && s.capture === 'PROCEDURAL_PROXY')).toBe(
      true,
    );
    expect(harness.surfaces.some((s) => s.id === 'region_field' && s.capture === 'PROCEDURAL_PROXY')).toBe(
      true,
    );
    expect(harness.deferred_heavy_work.some((d) => /procedural≠finished|procedural!=finished/i.test(d) || d.includes('procedural≠finished') || d.includes('museum hub finished art'))).toBe(
      true,
    );
    expect(harness.notes.toLowerCase()).toContain('procedural');
    expect(harness.VISUAL_MODEL_REVIEW).toBe('UNAVAILABLE');
  });
});
