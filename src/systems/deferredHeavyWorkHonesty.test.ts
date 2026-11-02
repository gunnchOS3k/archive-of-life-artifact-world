import { describe, expect, it } from 'vitest';
import {
  DEFERRED_HEAVY_WORK_HONESTY,
  assessDeferredHeavyWorkHonesty,
} from '@/systems/deferredHeavyWorkHonesty';
import { buildVisualPackHarness } from '@/systems/visualPackHarness';

describe('deferred heavy-work honesty — deferred ≠ finished', () => {
  it('keeps heavy remaster/capture work deferred', () => {
    const report = assessDeferredHeavyWorkHonesty();
    expect(report.schema).toBe('archive.deferred_heavy_work_honesty/v1');
    expect(report.deferredHeavyWorkCount).toBeGreaterThanOrEqual(4);
    expect(report.paintedRemasterDeferred).toBe(true);
    expect(report.qemuSoakDeferred).toBe(true);
    expect(report.proceduralNeqFinished).toBe(true);
    expect(report.VISUAL_MODEL_REVIEW).toBe('UNAVAILABLE');
    expect(report.HUMAN).toBe(false);
    expect(report.RC2).toBe(false);
    expect(report.V1).toBe(false);
    expect(report.honestyBanner).toContain(DEFERRED_HEAVY_WORK_HONESTY.slice(0, 20));
  });

  it('harness lists deferred heavy work', () => {
    const harness = buildVisualPackHarness();
    expect(harness.deferred_heavy_work.length).toBeGreaterThanOrEqual(4);
  });
});
