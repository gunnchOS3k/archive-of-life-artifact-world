import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertLockedScienceSurround,
  buildLockedScienceSurroundReport,
  renderLockedScienceSurroundHtml,
} from './lockedScienceSurroundExperience';

describe('lockedScienceSurroundExperience', () => {
  it('finishes surrounding expedition UX while IUCN and 0/17 maps stay locked', () => {
    const report = buildLockedScienceSurroundReport('2026-10-30T16:00:00.000Z');
    assertLockedScienceSurround(report);

    expect(report.iucnGate).toBe('blocked_external');
    expect(report.temporalMapsUnlocked).toBe(0);
    expect(report.temporalMapsExpected).toBe(17);
    expect(report.scienceContinuesWithoutIucn).toBe(true);
    expect(report.humanRc2V1).toBe(false);
    expect(report.playerBeats.length).toBeGreaterThanOrEqual(5);

    const html = renderLockedScienceSurroundHtml();
    expect(html).toContain('blocked_external');
    expect(html).toContain('0/17');
    expect(html).toContain('Continue the expedition');
    expect(html).toContain('procedural');
    expect(html).toContain('lifeling-honesty');
    expect(html).toContain('data-conservation-badges="false"');

    const outDir = join(process.cwd(), 'artifacts/science');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'LOCKED_SCIENCE_SURROUND.json'), JSON.stringify(report, null, 2) + '\n');
  });
});
