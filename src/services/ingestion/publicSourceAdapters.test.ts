import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  IUCN_OWNER_SETUP_STEPS,
  assertNeverPromoteMock,
  assertNeverPromoteSampleFallback,
  buildIcsLabelSnapshot,
  buildScienceHonestyMatrix,
  classifyUnsupportedClaim,
  fetchIucnGated,
} from './publicSourceAdapters';

describe('publicSourceAdapters honesty', () => {
  it('ICS label snapshot never claims approvedForUse or liveClaim', () => {
    const result = buildIcsLabelSnapshot();
    expect(result.ok).toBe(true);
    expect(result.meta.approvedForUse).toBe(false);
    expect(result.meta.liveClaim).toBe(false);
    expect(result.meta.verificationStatus).toBe('needs_source_verification');
    expect(result.records.length).toBeGreaterThanOrEqual(17);
  });

  it('IUCN without token stays blocked_external with owner setup steps', async () => {
    const result = await fetchIucnGated(null);
    expect(result.blocked).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.meta.verificationStatus).toBe('blocked_external');
    expect(result.meta.access).toBe('blocked_until_authorized');
    expect(result.ownerSetupSteps?.length).toBe(IUCN_OWNER_SETUP_STEPS.length);
    expect(result.records).toEqual([]);
  });

  it('never promotes mock to source_verified', () => {
    expect(() => assertNeverPromoteMock('source_verified', true)).toThrow(/Honesty violation/);
    expect(() => assertNeverPromoteMock('mock_sample', true)).not.toThrow();
    expect(() => assertNeverPromoteMock('blocked_external', false)).not.toThrow();
  });

  it('never promotes sample_fallback to source_verified without evidence', () => {
    expect(() =>
      assertNeverPromoteSampleFallback('sample_fallback', 'needs_source_verification', 0),
    ).not.toThrow();
    expect(() => assertNeverPromoteSampleFallback('sample_fallback', 'source_verified', 0)).toThrow(
      /Honesty violation/,
    );
    expect(() =>
      assertNeverPromoteSampleFallback('sample_fallback', 'needs_source_verification', 12),
    ).toThrow(/verified_record_count/);
  });

  it('builds COL/GBIF/PBDB/Neotoma/NASA/ICS honesty matrix without source_verified release', () => {
    const matrix = buildScienceHonestyMatrix({
      col: { recordCount: 120, verifiedRecordCount: 0, dataMode: 'sample_fallback' },
      gbif: { recordCount: 24, verifiedRecordCount: 0, dataMode: 'sample_fallback' },
      pbdb: { recordCount: 2, verifiedRecordCount: 0, dataMode: 'sample_fallback' },
      neotoma: { recordCount: 25, verifiedRecordCount: 0, dataMode: 'sample_fallback' },
      nasa: { recordCount: 21, verifiedRecordCount: 0, dataMode: 'sample_fallback' },
      ics: { recordCount: 17, verifiedRecordCount: 0, dataMode: 'sample_fallback' },
      iucn: { blocked: true, recordCount: 0, verifiedRecordCount: 0, dataMode: null },
    });
    expect(matrix.anySourceVerified).toBe(false);
    expect(matrix.productionReady).toBe(false);
    expect(matrix.rows.every((r) => r.sourceVerifiedRelease === false)).toBe(true);
    expect(matrix.rows.find((r) => r.source === 'iucn')?.verificationStatus).toBe('blocked_external');
    const onDisk = JSON.parse(
      readFileSync(join(process.cwd(), 'artifacts/archive_full/SCIENCE_HONESTY_MATRIX.json'), 'utf8'),
    ) as { anySourceVerified: boolean; temporalMaps: { sourceVerifiedMapCount: number } };
    expect(onDisk.anySourceVerified).toBe(false);
    expect(onDisk.temporalMaps.sourceVerifiedMapCount).toBe(0);
  });

  it('flags Earth-complete / fake map unlock as unsupported_claim', () => {
    expect(classifyUnsupportedClaim('Earth-complete catalog')).toBe('unsupported_claim');
    expect(classifyUnsupportedClaim('17 maps unlocked')).toBe('unsupported_claim');
    expect(classifyUnsupportedClaim('0/17 maps verified — blocked')).toBe(
      'needs_source_verification',
    );
    expect(classifyUnsupportedClaim('bounded COL fetch')).toBe('needs_source_verification');
  });
});
