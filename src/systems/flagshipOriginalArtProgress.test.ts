import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROCEDURAL_ART_WAVE1,
  PROCEDURAL_ART_WAVE2,
  PROCEDURAL_ART_WAVE3,
  PROCEDURAL_ART_WAVES,
  assertFlagshipOriginalArtProgress,
  buildFlagshipOriginalArtProgressReport,
  buildSilhouetteBrief,
  renderFlagshipOriginalArtProgressHtml,
} from './flagshipOriginalArtProgress';
import { buildFlagshipArtHonestyReport, assertFlagshipArtHonestyReport } from './flagshipArtHonestyPresentation';

describe('flagshipOriginalArtProgress', () => {
  it('advances wave-1/2/3 flagships to procedural silhouette briefs without claiming finished art', () => {
    const report = buildFlagshipOriginalArtProgressReport('2026-10-30T18:15:00.000Z');
    assertFlagshipOriginalArtProgress(report);

    expect(report.flagshipCount).toBe(24);
    expect(report.proceduralCandidateCount).toBeGreaterThanOrEqual(PROCEDURAL_ART_WAVES.length);
    expect(report.proceduralCandidateCount).toBe(18);
    expect(report.emojiIdentityCount).toBe(6);
    expect(report.finishedModelsClaimed).toBe(false);
    expect(report.emojiEqualsFinished).toBe(false);
    expect(report.anyHumanApprovedFinal).toBe(false);

    for (const id of PROCEDURAL_ART_WAVES) {
      const row = report.rows.find((r) => r.taxonId === id);
      expect(row?.currentStatus).toBe('procedural_candidate');
      expect(row?.silhouetteBrief?.assetKind).toBe('silhouette_brief');
      expect(row?.silhouetteBrief?.finishedModel).toBe(false);
      expect(row?.emojiEqualsFinished).toBe(false);
    }

    expect(PROCEDURAL_ART_WAVE1.length).toBe(6);
    expect(PROCEDURAL_ART_WAVE2.length).toBe(6);
    expect(PROCEDURAL_ART_WAVE3.length).toBe(6);
    expect(buildSilhouetteBrief('panthera_leo')?.anatomyFocus.length).toBeGreaterThan(0);
    expect(buildSilhouetteBrief('equus_caballus_ferus')?.habitatBackdrop).toMatch(/steppe/i);
    expect(buildSilhouetteBrief('danaus_plexippus')?.locomotionCue).toMatch(/migratory/i);
    expect(buildSilhouetteBrief('tyrannosaurus_rex')?.habitatBackdrop).toMatch(/reconstruction/i);
    expect(buildSilhouetteBrief('ursus_maritimus')?.habitatBackdrop).toMatch(/polar|ice/i);
    expect(buildSilhouetteBrief('trilobita_order')?.habitatBackdrop).toMatch(/fossil/i);

    const html = renderFlagshipOriginalArtProgressHtml(report);
    expect(html).toContain('emoji ≠ finished');
    expect(html).toContain('data-emoji-finished="false"');
    expect(html).toContain('data-procedural-wave="3"');

    // Honesty report still refuses finished/approved claims after procedural progress.
    const honesty = buildFlagshipArtHonestyReport('2026-10-30T18:15:00.000Z');
    assertFlagshipArtHonestyReport(honesty);
    expect(honesty.emojiEqualsFinished).toBe(false);
    expect(honesty.finishedModelsClaimed).toBe(false);

    const outDir = join(process.cwd(), 'artifacts/science');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'FLAGSHIP_ART_PROGRESS.json'), JSON.stringify(report, null, 2) + '\n');
    writeFileSync(join(outDir, 'FLAGSHIP_ART_HONESTY.json'), JSON.stringify(honesty, null, 2) + '\n');
  });
});
