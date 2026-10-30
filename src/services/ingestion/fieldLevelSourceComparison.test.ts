import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildFieldComparisonReportFromRecords,
  compareTaxonAgainstFixture,
  DEFAULT_FIELD_COMPARE_TARGETS,
  findFixtureRecord,
  findFixtureRecordAllowingInfraspecific,
  formatComparisonForUi,
  fixtureRecordFromColBatchEntry,
  fixtureRecordFromColBoundedTaxon,
  fixtureRecordFromGate1Organism,
  fixtureRecordFromGbifBatchRecord,
  fixtureRecordFromPbdbBoundedRecord,
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
  /** Exact flagship names plus parent binomials for infraspecific epithets. */
  const flagshipNames = new Set<string>();
  for (const t of DEFAULT_FIELD_COMPARE_TARGETS) {
    const n = t.scientificName.toLowerCase();
    flagshipNames.add(n);
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 3) flagshipNames.add(`${parts[0]} ${parts[1]}`);
  }
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

  const normalizeName = (n: string) =>
    n
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const flagshipNamesNorm = new Set([...flagshipNames].map(normalizeName));

  // COL bounded acquire is gitignored — optional enrichment when present locally / CI without it.
  const colBoundedPath = join(ROOT, 'data-pipeline/snapshots/public_bounded/col_flagship_bounded.json');
  let colBoundedRecords: FixtureRecord[] = [];
  if (existsSync(colBoundedPath)) {
    const colBounded = JSON.parse(readFileSync(colBoundedPath, 'utf8')) as {
      approvedForUse?: boolean;
      retrievedAt?: string;
      verificationStatus?: string;
      taxa?: Array<{
        query?: string;
        hit?: {
          classification?: Array<{ id?: string; name?: string; label?: string; rank?: string; status?: string }>;
        };
      }>;
    };
    expect(colBounded.approvedForUse).toBe(false);
    expect(colBounded.verificationStatus).not.toBe('source_verified');
    colBoundedRecords = (colBounded.taxa ?? [])
      .map((t) => fixtureRecordFromColBoundedTaxon(t, colBounded.retrievedAt))
      .filter((r): r is FixtureRecord => {
        if (!r) return false;
        const name = normalizeName(String(r.scientific_name?.accepted_scientific_name ?? ''));
        return flagshipNamesNorm.has(name);
      });
  }

  const pbdbBounded = JSON.parse(
    readFileSync(join(ROOT, 'data-pipeline/snapshots/public_bounded/pbdb_flagship_bounded.json'), 'utf8'),
  ) as {
    approvedForUse?: boolean;
    retrievedAt?: string;
    records?: Array<{
      query?: string;
      row?: {
        accepted_name?: string;
        accepted_no?: string;
        taxon_name?: string;
        taxon_no?: string;
      };
    }>;
  };
  expect(pbdbBounded.approvedForUse).toBe(false);
  const pbdbBoundedRecords = (pbdbBounded.records ?? [])
    .map((r) => fixtureRecordFromPbdbBoundedRecord(r, pbdbBounded.retrievedAt))
    .filter((r): r is FixtureRecord => {
      if (!r) return false;
      const name = String(r.scientific_name?.accepted_scientific_name ?? '').toLowerCase();
      return flagshipNames.has(name);
    });

  return {
    snapshotId: `${wave.snapshotId}+gate1+col/gbif-batch+bounded-col/pbdb`,
    records: mergeFixtureRecordsPreferringRich(
      wave.records,
      gate1Records,
      colRecords,
      gbifRecords,
      colBoundedRecords,
      pbdbBoundedRecords,
    ),
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

    // Lion — wave008 COL rich snapshot (+ taxonomy_relation exact)
    expect(byId.panthera_leo?.fixtureSource).toBe('Catalogue of Life');
    expect(byId.panthera_leo?.matchedFields).toBe(9);
    expect(byId.panthera_leo?.comparedFields).toBe(9);
    expect(byId.panthera_leo?.dataMode).toBe('sample_fallback');
    expect(byId.panthera_leo?.sourceVerifiedRelease).toBe(false);
    expect(byId.panthera_leo?.fieldRows.find((r) => r.field === 'taxonomy_relation')?.status).toBe(
      'match',
    );

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
      expect(byId[id]?.fieldRows.find((r) => r.field === 'geographic_region')?.status).toBe(
        'fixture_only',
      );
      expect(byId[id]?.fieldRows.find((r) => r.field === 'retrieved_at')?.status).toBe('fixture_only');
      expect(byId[id]?.fixtureLicense.length).toBeGreaterThan(0);
      expect(byId[id]?.fixtureUncertainty).toMatch(/gaps: common_name absent/);
      expect(byId[id]?.fixtureUncertainty).toMatch(/geographic_region absent/);
      expect(byId[id]?.fixtureUncertainty).toMatch(/retrieved_at absent/);
      const sparseHtml = formatComparisonForUi(byId[id]!);
      expect(sparseHtml).toContain('data-sparse-gap="common_name"');
      expect(sparseHtml).toContain('data-sparse-gap="geographic_region"');
      expect(sparseHtml).toContain('data-sparse-gap="retrieved_at"');
      expect(sparseHtml).toContain('sparse_gap=retrieved_at (absent)');
    }

    // Additional COL sparse flagships (still sample_fallback; sparse gaps honest)
    for (const id of [
      'ursus_americanus',
      'odocoileus_virginianus',
      'balaenoptera_musculus',
      'phoca_vitulina',
      'formica_rufa',
      'bombus_terrestris',
    ] as const) {
      expect(byId[id]?.sourceVerifiedRelease).toBe(false);
      expect(byId[id]?.dataMode).toBe('sample_fallback');
      expect(byId[id]?.fixtureSource).toBe('Catalogue of Life');
      expect(byId[id]?.fieldRows.find((r) => r.field === 'scientific_name')?.status).toBe('match');
      expect(byId[id]?.fieldRows.find((r) => r.field === 'common_name')?.status).toBe('game_only');
    }

    // Przewalski's horse — infraspecific vs Equus ferus parent; honest scientific_name mismatch
    expect(byId.equus_caballus_ferus?.fixtureSource).toBe('Catalogue of Life');
    expect(byId.equus_caballus_ferus?.fieldRows.find((r) => r.field === 'scientific_name')?.status).toBe(
      'mismatch',
    );
    expect(
      byId.equus_caballus_ferus?.fieldRows.find((r) => r.field === 'taxonomy_relation')?.fixtureValue,
    ).toBe('infraspecific_of_fixture');
    expect(byId.equus_caballus_ferus?.sourceVerifiedRelease).toBe(false);
    expect(byId.equus_caballus_ferus?.fixtureUncertainty).toMatch(/infraspecific_of_fixture/);

    // River otter / Wave-3 insects — require gitignored COL public_bounded when present
    const colBoundedPresent = existsSync(
      join(ROOT, 'data-pipeline/snapshots/public_bounded/col_flagship_bounded.json'),
    );
    if (colBoundedPresent) {
      expect(byId.lontra_canadensis?.fixtureSource).toBe('Catalogue of Life');
      expect(byId.lontra_canadensis?.fixtureRecordId).toMatch(/^COL:bounded:/);
      expect(byId.lontra_canadensis?.fieldRows.find((r) => r.field === 'scientific_name')?.status).toBe(
        'match',
      );
      expect(byId.lontra_canadensis?.dataMode).toBe('sample_fallback');
      expect(byId.lontra_canadensis?.sourceVerifiedRelease).toBe(false);
      expect(byId.lontra_canadensis?.fixtureUncertainty).toMatch(/approvedForUse=false/);

      for (const id of [
        'anax_junius',
        'latrodectus_mactans',
        'libellula_quadrimaculata',
        'dynastes_hercules',
        'pachnoda_marginata',
        'acanthoscurria_geniculata',
      ] as const) {
        expect(byId[id]?.fixtureSource).toBe('Catalogue of Life');
        expect(byId[id]?.dataMode).toBe('sample_fallback');
        expect(byId[id]?.sourceVerifiedRelease).toBe(false);
        expect(byId[id]?.fieldRows.find((r) => r.field === 'scientific_name')?.status).toBe('match');
        expect(byId[id]?.fixtureUncertainty).toMatch(/approvedForUse=false|sparse COL|FIXTURE_TEST_ONLY/i);
      }
    } else {
      // CI without gitignored COL acquire: still sample_fallback honesty, no invented COL:bounded rows
      expect(byId.lontra_canadensis?.dataMode ?? 'sample_fallback').toBe('sample_fallback');
      expect(byId.lontra_canadensis?.sourceVerifiedRelease ?? false).toBe(false);
    }

    // Woolly mammoth — PBDB public_bounded (richer wave008 may win; still sample_fallback)
    expect(byId.mammuthus_primigenius?.fieldRows.find((r) => r.field === 'scientific_name')?.status).toBe(
      'match',
    );
    expect(byId.mammuthus_primigenius?.dataMode).toBe('sample_fallback');
    expect(byId.mammuthus_primigenius?.sourceVerifiedRelease).toBe(false);
    expect(byId.mammuthus_primigenius?.fixtureSource).toMatch(/Paleobiology|PBDB|Catalogue of Life/i);

    // Trilobita class — PBDB public_bounded class-rank (approvedForUse=false); closes prior game_only gap
    expect(byId.trilobita_order?.fixtureSource).toBe('Paleobiology Database');
    expect(byId.trilobita_order?.fixtureRecordId).toBe('PBDB:bounded:19100');
    expect(byId.trilobita_order?.fieldRows.find((r) => r.field === 'scientific_name')?.status).toBe(
      'match',
    );
    expect(byId.trilobita_order?.dataMode).toBe('sample_fallback');
    expect(byId.trilobita_order?.sourceVerifiedRelease).toBe(false);
    expect(byId.trilobita_order?.fixtureUncertainty).toMatch(/approvedForUse=false/);

    // Never promote; never invent IUCN assessments in this matrix
    expect(report.anySourceVerified).toBe(false);
    expect(report.comparisons.every((c) => c.sourceVerifiedRelease === false)).toBe(true);
    expect(report.comparisons.every((c) => c.dataMode === 'sample_fallback')).toBe(true);
    expect(report.comparisons.every((c) => !/iucn/i.test(c.fixtureSource))).toBe(true);
    expect(report.comparisons.length).toBeGreaterThanOrEqual(24);

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

  it('links infraspecific game names to parent binomial fixtures without inventing subspecies rows', () => {
    const records: FixtureRecord[] = [
      {
        scientific_name: { accepted_scientific_name: 'Equus ferus' },
        source_organization: 'Catalogue of Life',
        source_record_id: 'COL:fixture:equus-ferus',
        license: { license_spdx_or_label: 'COL terms of use' },
      },
    ];
    const found = findFixtureRecordAllowingInfraspecific(records, 'Equus ferus przewalskii');
    expect(found?.relation).toBe('infraspecific_of_fixture');
    const comparison = compareTaxonAgainstFixture(
      {
        taxonId: 'equus_caballus_ferus',
        commonName: "Przewalski's Horse",
        scientificName: 'Equus ferus przewalskii',
      },
      found!.record,
      found!.relation,
    );
    expect(comparison.sourceVerifiedRelease).toBe(false);
    expect(comparison.fieldRows.find((r) => r.field === 'scientific_name')?.status).toBe('mismatch');
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
