import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertLifelingHonesty,
  buildLifelingHonestyReport,
  renderLifelingHonestyHtml,
} from './lifelingHonestyPresentation';

describe('lifelingHonestyPresentation', () => {
  it('keeps Lifeling cosmetic-only while IUCN and maps stay gated', () => {
    const report = buildLifelingHonestyReport('2026-10-30T17:30:00.000Z');
    assertLifelingHonesty(report);

    expect(report.iucnGate).toBe('blocked_external');
    expect(report.conservationBadgesShown).toBe(false);
    expect(report.assessedStatusesClaimed).toBe(false);
    expect(report.cosmeticTraitsOnly).toBe(true);
    expect(report.mapsUnlockedClaim).toBe(false);
    expect(report.sourceVerifiedScienceClaim).toBe(false);
    expect(report.humanRc2V1).toBe(false);

    const html = renderLifelingHonestyHtml(report);
    expect(html).toContain('data-conservation-badges="false"');
    expect(html).toContain('blocked_external');
    expect(html).toContain('0/17');
    expect(html).not.toMatch(/assessed=true/i);

    const outDir = join(process.cwd(), 'artifacts/science');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'LIFELING_HONESTY.json'), JSON.stringify(report, null, 2) + '\n');
  });
});
