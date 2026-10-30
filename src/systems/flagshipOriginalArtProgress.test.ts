import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROCEDURAL_ART_WAVE1,
  assertFlagshipOriginalArtProgress,
  buildFlagshipOriginalArtProgressReport,
  buildSilhouetteBrief,
  renderFlagshipOriginalArtProgressHtml,
} from './flagshipOriginalArtProgress';
import { buildFlagshipArtHonestyReport, assertFlagshipArtHonestyReport } from './flagshipArtHonestyPresentation';

describe('flagshipOriginalArtProgress', () => {
  it('advances wave-1 flagships to procedural silhouette briefs without claiming finished art', () => {
    const report = buildFlagshipOriginalArtProgressReport('2026-10-30T16:00:00.000Z');
    assertFlagshipOriginalArtProgress(report);

    expect(report.flagshipCount).toBe(24);
    expect(report.proceduralCandidateCount).toBeGreaterThanOrEqual(PROCEDURAL_ART_WAVE1.length);
    expect(report.finishedModelsClaimed).toBe(false);
    expect(report.emojiEqualsFinished).toBe(false);
    expect(report.anyHumanApprovedFinal).toBe(false);

    for (const id of PROCEDURAL_ART_WAVE1) {
      const row = report.rows.find((r) => r.taxonId === id);
      expect(row?.currentStatus).toBe('procedural_candidate');
      expect(row?.silhouetteBrief?.assetKind).toBe('silhouette_brief');
      expect(row?.silhouetteBrief?.finishedModel).toBe(false);
      expect(row?.emojiEqualsFinished).toBe(false);
    }

    expect(buildSilhouetteBrief('panthera_leo')?.anatomyFocus.length).toBeGreaterThan(0);
    expect(buildSilhouetteBrief('equus_caballus_ferus')?.habitatBackdrop).toMatch(/steppe/i);

    const html = renderFlagshipOriginalArtProgressHtml(report);
    expect(html).toContain('emoji ≠ finished');
    expect(html).toContain('data-emoji-finished="false"');

    // Honesty report still refuses finished/approved claims after procedural progress.
    const honesty = buildFlagshipArtHonestyReport('2026-10-30T16:00:00.000Z');
    assertFlagshipArtHonestyReport(honesty);
    expect(honesty.emojiEqualsFinished).toBe(false);
    expect(honesty.finishedModelsClaimed).toBe(false);

    const outDir = join(process.cwd(), 'artifacts/science');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'FLAGSHIP_ART_PROGRESS.json'), JSON.stringify(report, null, 2) + '\n');
    writeFileSync(join(outDir, 'FLAGSHIP_ART_HONESTY.json'), JSON.stringify(honesty, null, 2) + '\n');
  });
});
