import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertFlagshipArtHonestyReport,
  buildFlagshipArtHonestyReport,
  renderFlagshipArtHonestyHtml,
} from './flagshipArtHonestyPresentation';

const ROOT = process.cwd();

describe('flagshipArtHonestyPresentation', () => {
  it('reports 24 flagships with emoji≠finished and no human-approved finals', () => {
    const report = buildFlagshipArtHonestyReport('2026-10-30T12:00:00.000Z');
    expect(() => assertFlagshipArtHonestyReport(report)).not.toThrow();
    expect(report.flagshipCount).toBe(24);
    expect(report.finishedModelsClaimed).toBe(false);
    expect(report.emojiEqualsFinished).toBe(false);
    expect(report.anyHumanApprovedFinal).toBe(false);
    expect(report.rows.every((r) => r.emojiIsFinishedArt === false)).toBe(true);
    expect(report.rows.every((r) => r.finalArtStatus !== 'final_asset_human_approved')).toBe(true);

    const html = renderFlagshipArtHonestyHtml(report);
    expect(html).toContain('data-emoji-finished="false"');
    expect(html).toMatch(/not finished organism models/i);

    mkdirSync(join(ROOT, 'artifacts/science'), { recursive: true });
    writeFileSync(
      join(ROOT, 'artifacts/science/FLAGSHIP_ART_HONESTY.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  });
});
