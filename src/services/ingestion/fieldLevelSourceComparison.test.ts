import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildFieldComparisonReportFromRecords,
  compareTaxonAgainstFixture,
  DEFAULT_FIELD_COMPARE_TARGETS,
  findFixtureRecord,
  formatComparisonForUi,
  fixtureRecordFromColBatchEntry,
  fixtureRecordFromGate1Organism,
  fixtureRecordFromGbifBatchRecord,
  mergeFixtureRecordsPreferringRich,
  type FixtureRecord,
} from './fieldLevelSourceComparison';

const ROOT = process.cwd();

function loadWave008(): { snapshotId: string; records: FixtureRecord[] } {
  const raw = JSON.parse(
    readFileSync(join(ROOT, 'data/scientific_fixtures/wave008-scientific-fixture-v1.json'), 'utf8'),
  ) as { snapshot_id?: string; records?: FixtureRecord[] };
  return {
    snapshotId: String(raw.snapshot_id ?? 'wave008'),
    records: Array.isArray(raw.records) ? raw.records : [],
  };
}

function loadMergedFixtureRecords(): { snapshotId: string; records: FixtureRecord[] } {
  const wave = loadWave008();

  const gate1 = JSON.parse(
    readFileSync(join(ROOT, 'gate1/fixtures/scientific_fixture_dataset.json'), 'utf8'),
  ) as {
    organisms?: Array<{
      commonName?: string;
      scientificName?: string;
      sourceOrganization?: string;
      sourceRecordId?: string;
      license?: string;
      retrievalDate?: string;
      geographicProvenance?: string;
      confidence?: string;
    }>;
  };
  const gate1Records = (gate1.organisms ?? []).map(fixtureRecordFromGate1Organism);

  const colBatch = JSON.parse(
    readFileSync(join(ROOT, 'public/data/fixtures/ingest/col_batch.json'), 'utf8'),
  ) as {
    license?: string;
    entries?: Array<{ id?: string; scientificName?: string; acceptedName?: string }>;
  };
  const flagshipNames = new Set(
    DEFAULT_FIELD_COMPARE_TARGETS.map((t) => t.scientificName.toLowerCase()),
  );
  const colRecords = (colBatch.entries ?? [])
    .filter((e) => flagshipNames.has(String(e.acceptedName ?? e.scientificName ?? '').toLowerCase()))
    .map((e) => fixtureRecordFromColBatchEntry(e, colBatch.license ?? 'COL terms of use'));

  const gbifBatch = JSON.parse(
    readFileSync(join(ROOT, 'public/data/fixtures/ingest/gbif_batch.json'), 'utf8'),
  ) as {
    license?: string;
    records?: Array<{
      key?: number;
      scientificName?: string;
      acceptedScientificName?: string;
      license?: string;
    }>;
  };
  const gbifRecords = (gbifBatch.records ?? [])
    .filter((r) =>
      flagshipNames.has(String(r.acceptedScientificName ?? r.scientificName ?? '').toLowerCase()),
    )
    .map((r) => fixtureRecordFromGbifBatchRecord(r, gbifBatch.license ?? 'CC BY 4.0'));

  return {
    snapshotId: `${wave.snapshotId}+gate1+col/gbif-batch`,
    records: mergeFixtureRecordsPreferringRich(wave.records, gate1Records, colRecords, gbifRecords),
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
    const fixture = loadWave008();
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

  it('compares additional flagships across wave008/Gate1/COL/GBIF without promoting source_verified', () => {
    const fixture = loadMergedFixtureRecords();
    const report = buildFieldComparisonReportFromRecords(
      fixture.snapshotId,
      fixture.records,
      DEFAULT_FIELD_COMPARE_TARGETS,
      '2026-10-30T00:00:00.000Z',
    );

    expect(report.anySourceVerified).toBe(false);
    expect(report.productionReady).toBe(false);
    expect(report.comparisons.length).toBe(DEFAULT_FIELD_COMPARE_TARGETS.length);

    const byId = Object.fromEntries(report.comparisons.map((c) => [c.taxonId, c]));

    // Lion — wave008 COL rich snapshot
    expect(byId.panthera_leo?.fixtureSource).toBe('Catalogue of Life');
    expect(byId.panthera_leo?.matchedFields).toBe(8);
    expect(byId.panthera_leo?.comparedFields).toBe(8);
    expect(byId.panthera_leo?.dataMode).toBe('sample_fallback');
    expect(byId.panthera_leo?.sourceVerifiedRelease).toBe(false);

    // Gray wolf — wave008 GBIF (preferred over sparse COL batch)
    expect(byId.canis_lupus?.fixtureSource).toBe('GBIF');
    expect(byId.canis_lupus?.fixtureRecordId).toBe('GBIF:taxon:5219173');
    expect(byId.canis_lupus?.fieldRows.find((r) => r.field === 'scientific_name')?.status).toBe(
      'match',
    );
    expect(byId.canis_lupus?.matchedFields).toBeGreaterThan(0);
    expect(byId.canis_lupus?.fixtureUncertainty.toLowerCase()).toMatch(/conflict|disputed|subspecies/);

    // T. rex — PBDB; common_name fixture≠game is an honest mismatch
    expect(byId.tyrannosaurus_rex?.fixtureSource).toBe('Paleobiology Database');
    expect(byId.tyrannosaurus_rex?.fieldRows.find((r) => r.field === 'scientific_name')?.status).toBe(
      'match',
    );
    expect(byId.tyrannosaurus_rex?.fieldRows.find((r) => r.field === 'common_name')?.status).toBe(
      'mismatch',
    );
    expect(byId.tyrannosaurus_rex?.matchedFields).toBeLessThan(
      byId.tyrannosaurus_rex?.comparedFields ?? 0,
    );

    // Monarch — Gate1 GBIF fixture mirror
    expect(byId.danaus_plexippus?.fixtureSource).toMatch(/GBIF/i);
    expect(byId.danaus_plexippus?.fixtureLicense).toMatch(/CC-BY|CC BY/i);
    expect(byId.danaus_plexippus?.fieldRows.find((r) => r.field === 'scientific_name')?.status).toBe(
      'match',
    );

    // Polar bear / elephant / beaver / honeybee — sparse batch after richer sources win where present
    for (const id of [
      'ursus_maritimus',
      'loxodonta_africana',
      'castor_canadensis',
      'apis_mellifera',
    ] as const) {
      expect(byId[id]?.sourceVerifiedRelease).toBe(false);
      expect(byId[id]?.dataMode).toBe('sample_fallback');
      expect(byId[id]?.fieldRows.find((r) => r.field === 'scientific_name')?.status).toBe('match');
      // sparse batches lack common_name → game_only (honest gap, not a silent invent)
      expect(byId[id]?.fieldRows.find((r) => r.field === 'common_name')?.status).toBe('game_only');
      expect(byId[id]?.fixtureLicense.length).toBeGreaterThan(0);
      expect(byId[id]?.fixtureUncertainty.length).toBeGreaterThan(0);
    }

    // Never promote; never invent IUCN assessments in this matrix
    expect(report.anySourceVerified).toBe(false);
    expect(report.comparisons.every((c) => c.sourceVerifiedRelease === false)).toBe(true);
    expect(report.comparisons.every((c) => c.dataMode === 'sample_fallback')).toBe(true);
    expect(report.comparisons.every((c) => !/iucn/i.test(c.fixtureSource))).toBe(true);

    writeEvidence(report);
    const written = JSON.parse(
      readFileSync(join(ROOT, 'artifacts/science/FIELD_LEVEL_COMPARISON_RESULT.json'), 'utf8'),
    ) as { anySourceVerified: boolean; comparisons: Array<{ taxonId: string }> };
    expect(written.anySourceVerified).toBe(false);
    expect(written.comparisons.map((c) => c.taxonId)).toEqual(
      DEFAULT_FIELD_COMPARE_TARGETS.map((t) => t.taxonId),
    );
  });

  it('builds a report that keeps anySourceVerified false and writes evidence', () => {
    const fixture = loadMergedFixtureRecords();
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

  it('renders UI markup that never claims sourceVerifiedRelease=true and shows match counts', () => {
    const fixture = loadWave008();
    const record = findFixtureRecord(fixture.records, 'Panthera leo')!;
    const comparison = compareTaxonAgainstFixture(
      {
        taxonId: 'panthera_leo',
        commonName: 'Lion',
        scientificName: 'Panthera leo',
        regionLabel: 'Afrotropical',
      },
      record,
    );
    const html = formatComparisonForUi(comparison);
    expect(html).toContain('data-source-verified-release="false"');
    expect(html).toContain('Field-level fixture comparison');
    expect(html).toContain('License:');
    expect(html).toContain('Uncertainty:');
    expect(html).toContain(`Field matches: ${comparison.matchedFields}/${comparison.comparedFields}`);
    expect(html).toContain('data-match-count="true"');
  });

  it('skips mock/teaching/IUCN fixture rows when merging', () => {
    const merged = mergeFixtureRecordsPreferringRich(
      [
        {
          scientific_name: { accepted_scientific_name: 'Panthera leo' },
          source_organization: 'Catalogue of Life',
        },
        {
          scientific_name: { accepted_scientific_name: 'Ludus archivalis' },
          source_organization: 'Archive of Life editorial/game-authored',
        },
        {
          scientific_name: { accepted_scientific_name: 'Incertae sedis blocked' },
          source_organization: 'IUCN',
        },
      ],
      [
        {
          scientific_name: { accepted_scientific_name: 'Panthera leo' },
          source_organization: 'Catalogue of Life',
          source_record_id: 'should-not-replace',
        },
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.scientific_name?.accepted_scientific_name).toBe('Panthera leo');
    expect(merged[0]?.source_record_id).toBeUndefined();
  });
});
