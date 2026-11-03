import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  decidePromotion,
  getImportWorkflow,
  listPermittedWorkflows,
  sciencePathsIndependentOfIucn,
  verifyNormalizedFields,
} from './sourceVerificationWorkflow';
import {
  assertAlternativesHonesty,
  buildPublicDataAlternativesReport,
  renderPublicAlternativesHonestyHtml,
} from './publicDataAlternatives';

const ROOT = process.cwd();

describe('sourceVerificationWorkflow', () => {
  it('lists permitted open-data workflows without inventing IUCN rights', () => {
    const workflows = listPermittedWorkflows();
    expect(workflows.map((w) => w.source)).toEqual(
      expect.arrayContaining(['col', 'gbif', 'pbdb', 'neotoma', 'nasa', 'ics', 'iucn']),
    );
    const iucn = getImportWorkflow('iucn');
    expect(iucn?.permission).toBe('gated_token_plus_rights');
    expect(iucn?.scienceContinuesWithoutIucn).toBe(false);
    expect(workflows.filter((w) => w.scienceContinuesWithoutIucn).length).toBeGreaterThanOrEqual(5);
  });

  it('refuses sample_fallback → source_verified promotion even with fake approval hints', () => {
    const decision = decidePromotion({
      dataMode: 'sample_fallback',
      verificationStatus: 'needs_source_verification',
      verifiedRecordCount: 0,
      isMock: false,
      humanApprovalRecordId: 'fake-invented',
      rightsReviewComplete: true,
    });
    expect(decision.promotedToSourceVerified).toBe(false);
    expect(decision.allowedStatus).not.toBe('source_verified');
    expect(() =>
      decidePromotion({
        dataMode: 'sample_fallback',
        verificationStatus: 'source_verified',
        verifiedRecordCount: 0,
        isMock: false,
      }),
    ).toThrow(/Honesty violation/);
  });

  it('verifies normalized fields without flipping sourceVerifiedRelease', () => {
    const result = verifyNormalizedFields({
      sourceRecordId: 'COL:taxon:PL001',
      scientificName: 'Panthera leo',
      rawSnapshotSha256: 'abc',
      pairs: [
        { field: 'scientific_name', raw: 'Panthera leo', normalized: 'Panthera leo' },
        { field: 'license', raw: 'UNVERIFIED-FIXTURE', normalized: 'UNVERIFIED-FIXTURE' },
        { field: 'common_name', raw: null, normalized: 'Lion', notes: 'sparse fixture gap' },
      ],
    });
    expect(result.sourceVerifiedRelease).toBe(false);
    expect(result.dataMode).toBe('sample_fallback');
    expect(result.matchedFields).toBe(2);
    expect(result.comparedFields).toBe(2);
    expect(result.fieldChecks.find((c) => c.field === 'common_name')?.match).toBe(false);
  });

  it('keeps non-IUCN science paths open when IUCN is blocked', () => {
    const paths = sciencePathsIndependentOfIucn();
    expect(paths.iucnBlocksAllScience).toBe(false);
    expect(paths.continuingSources).toEqual(
      expect.arrayContaining(['col', 'gbif', 'pbdb', 'neotoma', 'nasa', 'ics']),
    );
    expect(paths.continuingSources).not.toContain('iucn');
  });
});

describe('publicDataAlternatives', () => {
  it('catalogs alternatives without inventing rights or unlocking maps', () => {
    const report = buildPublicDataAlternativesReport('2026-10-30T12:00:00.000Z');
    expect(() => assertAlternativesHonesty(report)).not.toThrow();
    expect(report.iucnBlocksAllScience).toBe(false);
    expect(report.anyApprovedForUse).toBe(false);
    expect(report.anySourceVerified).toBe(false);
    expect(report.temporalMapsHonesty).toBe('0/17');
    expect(report.alternatives.length).toBeGreaterThanOrEqual(5);
    expect(report.alternatives.every((a) => a.substitutesForIucn === false)).toBe(true);
    expect(report.alternatives.some((a) => a.id === 'worms')).toBe(true);
    expect(report.alternatives.some((a) => a.id === 'obis')).toBe(true);

    const html = renderPublicAlternativesHonestyHtml(report);
    expect(html).toContain('data-iucn-blocks-all-science="false"');
    expect(html).toContain('data-maps="0/17"');
    expect(html).toMatch(/Public science continues without IUCN/i);

    mkdirSync(join(ROOT, 'artifacts/science'), { recursive: true });
    mkdirSync(join(ROOT, 'public/data/status'), { recursive: true });
    const body = `${JSON.stringify(report, null, 2)}\n`;
    writeFileSync(join(ROOT, 'artifacts/science/PUBLIC_DATA_ALTERNATIVES.json'), body);
    writeFileSync(join(ROOT, 'public/data/status/public_data_alternatives.json'), body);
  });
});
