import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildFieldComparisonReportFromRecords,
  compareTaxonAgainstFixture,
  findFixtureRecord,
  formatComparisonForUi,
  type FixtureRecord,
} from './fieldLevelSourceComparison';

const ROOT = process.cwd();

function loadFixture(): { snapshotId: string; records: FixtureRecord[] } {
  const raw = JSON.parse(
    readFileSync(join(ROOT, 'data/scientific_fixtures/wave008-scientific-fixture-v1.json'), 'utf8'),
  ) as { snapshot_id?: string; records?: FixtureRecord[] };
  return {
    snapshotId: String(raw.snapshot_id ?? 'wave008'),
    records: Array.isArray(raw.records) ? raw.records : [],
  };
}

function writeEvidence(report: ReturnType<typeof buildFieldComparisonReportFromRecords>): void {
  const body = `${JSON.stringify(report, null, 2)}\n`;
  mkdirSync(join(ROOT, 'artifacts/science'), { recursive: true });
  mkdirSync(join(ROOT, 'public/data/status'), { recursive: true });
  writeFileSync(join(ROOT, 'artifacts/science/FIELD_LEVEL_COMPARISON_RESULT.json'), body);
  writeFileSync(join(ROOT, 'public/data/status/field_level_comparison.json'), body);
}

describe('fieldLevelSourceComparison', () => {
  it('matches Lion scientific name against wave008 COL fixture without promoting source_verified', () => {
    const fixture = loadFixture();
    const record = findFixtureRecord(fixture.records, 'Panthera leo');
    expect(record).toBeTruthy();
    const comparison = compareTaxonAgainstFixture(
      {
        taxonId: 'panthera_leo',
        commonName: 'Lion',
        scientificName: 'Panthera leo',
        regionLabel: 'Afrotropical',
      },
      record!,
    );
    expect(comparison.sourceVerifiedRelease).toBe(false);
    expect(comparison.dataMode).toBe('sample_fallback');
    expect(comparison.verificationStatus).toBe('needs_source_verification');
    const sci = comparison.fieldRows.find((r) => r.field === 'scientific_name');
    expect(sci?.status).toBe('match');
    expect(comparison.matchedFields).toBeGreaterThan(0);
    expect(comparison.fixtureLicense.length).toBeGreaterThan(0);
    expect(comparison.fixtureRetrievedAt.length).toBeGreaterThan(0);
    expect(comparison.fixtureUncertainty.length).toBeGreaterThan(0);
  });

  it('builds a report that keeps anySourceVerified false and writes evidence', () => {
    const fixture = loadFixture();
    const report = buildFieldComparisonReportFromRecords(fixture.snapshotId, fixture.records);
    expect(report.anySourceVerified).toBe(false);
    expect(report.productionReady).toBe(false);
    expect(report.comparisons[0]?.taxonId).toBe('panthera_leo');
    writeEvidence(report);
    const written = JSON.parse(
      readFileSync(join(ROOT, 'artifacts/science/FIELD_LEVEL_COMPARISON_RESULT.json'), 'utf8'),
    ) as { anySourceVerified: boolean };
    expect(written.anySourceVerified).toBe(false);
  });

  it('renders UI markup that never claims sourceVerifiedRelease=true', () => {
    const fixture = loadFixture();
    const record = findFixtureRecord(fixture.records, 'Panthera leo')!;
    const html = formatComparisonForUi(
      compareTaxonAgainstFixture(
        {
          taxonId: 'panthera_leo',
          commonName: 'Lion',
          scientificName: 'Panthera leo',
          regionLabel: 'Afrotropical',
        },
        record,
      ),
    );
    expect(html).toContain('data-source-verified-release="false"');
    expect(html).toContain('Field-level fixture comparison');
    expect(html).toContain('License:');
    expect(html).toContain('Uncertainty:');
  });
});
