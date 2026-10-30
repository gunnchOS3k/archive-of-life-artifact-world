/**
 * Field-level comparison of game-facing taxon identity against an authorized
 * scientific fixture snapshot. Match evidence is not a source_verified release.
 * Browser-safe (no node:fs). Node writers live in scripts/science/.
 */

export type FieldCompareStatus = 'match' | 'mismatch' | 'fixture_only' | 'game_only';

export type FieldCompareRow = {
  field: string;
  status: FieldCompareStatus;
  fixtureValue: string | null;
  gameValue: string | null;
  notes: string;
};

export type TaxonFieldComparison = {
  taxonId: string;
  scientificName: string;
  fixtureSource: string;
  fixtureRecordId: string;
  fixtureRetrievedAt: string;
  fixtureLicense: string;
  fixtureUncertainty: string;
  verificationStatus: 'needs_source_verification';
  dataMode: 'sample_fallback';
  sourceVerifiedRelease: false;
  fieldRows: FieldCompareRow[];
  matchedFields: number;
  comparedFields: number;
};

export type FieldComparisonReport = {
  schema: 'aol.field_level_source_comparison.v1';
  generatedAt: string;
  fixtureSnapshotId: string;
  anySourceVerified: false;
  productionReady: false;
  rule: string;
  comparisons: TaxonFieldComparison[];
};

export type FixtureRecord = {
  common_name?: string;
  scientific_name?: { accepted_scientific_name?: string };
  source_organization?: string;
  source_record_id?: string;
  retrieved_at?: string;
  license?: { license_spdx_or_label?: string };
  confidence_or_uncertainty?: { confidence?: string; confidence_basis?: string };
  geographic_provenance?: { region?: string };
  verification_status?: string;
};

export type GameFacing = {
  taxonId: string;
  commonName: string;
  scientificName: string;
  regionLabel?: string;
};

/**
 * Flagship (and paleo flagship) targets with game-facing identity.
 * Only taxa that have a matching authorized fixture record produce field rows;
 * IUCN / mock / teaching fixture rows are never treated as assessments.
 */
export const DEFAULT_FIELD_COMPARE_TARGETS: GameFacing[] = [
  {
    taxonId: 'panthera_leo',
    commonName: 'Lion',
    scientificName: 'Panthera leo',
    regionLabel: 'Afrotropical',
  },
  {
    taxonId: 'canis_lupus',
    commonName: 'Gray Wolf',
    scientificName: 'Canis lupus',
    // wave008 GBIF fixture has no region — omit so we do not invent geography
  },
  {
    taxonId: 'tyrannosaurus_rex',
    commonName: 'Tyrannosaurus rex',
    scientificName: 'Tyrannosaurus rex',
    regionLabel: 'Late Cretaceous North America',
  },
  {
    taxonId: 'danaus_plexippus',
    commonName: 'Monarch Butterfly',
    scientificName: 'Danaus plexippus',
    regionLabel: 'Nearctic migratory corridor (fixture)',
  },
  {
    taxonId: 'ursus_maritimus',
    commonName: 'Polar Bear',
    scientificName: 'Ursus maritimus',
  },
  {
    taxonId: 'loxodonta_africana',
    commonName: 'African Elephant',
    scientificName: 'Loxodonta africana',
  },
  {
    taxonId: 'castor_canadensis',
    commonName: 'North American Beaver',
    scientificName: 'Castor canadensis',
  },
  {
    taxonId: 'apis_mellifera',
    commonName: 'Western Honeybee',
    scientificName: 'Apis mellifera',
  },
];

/** Gate 1 organism shape → FixtureRecord (fixture_sample — not live export). */
export function fixtureRecordFromGate1Organism(organism: {
  commonName?: string;
  scientificName?: string;
  sourceOrganization?: string;
  sourceRecordId?: string;
  license?: string;
  retrievalDate?: string;
  geographicProvenance?: string;
  confidence?: string;
}): FixtureRecord {
  const retrieved = organism.retrievalDate
    ? (organism.retrievalDate.includes('T')
        ? organism.retrievalDate
        : `${organism.retrievalDate}T00:00:00.000Z`)
    : undefined;
  return {
    common_name: organism.commonName,
    scientific_name: { accepted_scientific_name: organism.scientificName },
    source_organization: organism.sourceOrganization,
    source_record_id: organism.sourceRecordId,
    retrieved_at: retrieved,
    license: { license_spdx_or_label: organism.license },
    confidence_or_uncertainty: {
      confidence: organism.confidence,
      confidence_basis: organism.confidence
        ? `gate1 fixture confidence=${organism.confidence} (not source_verified release)`
        : 'gate1 fixture — sample only',
    },
    geographic_provenance: organism.geographicProvenance
      ? { region: organism.geographicProvenance }
      : undefined,
    verification_status: 'needs_source_verification',
  };
}

/** COL tier-R batch entry → sparse FixtureRecord (FIXTURE_TEST_ONLY). */
export function fixtureRecordFromColBatchEntry(
  entry: { id?: string; scientificName?: string; acceptedName?: string },
  batchLicense = 'COL terms of use',
): FixtureRecord {
  const accepted = entry.acceptedName ?? entry.scientificName;
  return {
    scientific_name: { accepted_scientific_name: accepted },
    source_organization: 'Catalogue of Life',
    source_record_id: entry.id ? `COL:fixture:${entry.id}` : undefined,
    // Intentionally omit common_name, geographic_provenance, retrieved_at — honest sparse gaps.
    license: { license_spdx_or_label: batchLicense },
    confidence_or_uncertainty: {
      confidence: 'FIXTURE_TEST_ONLY',
      confidence_basis:
        'sparse COL ingest batch — name/id only; gaps: common_name absent, geographic_region absent, retrieved_at absent; not a full provenance snapshot',
    },
    verification_status: 'needs_source_verification',
  };
}

/** GBIF tier-R batch record → sparse FixtureRecord (FIXTURE_TEST_ONLY). */
export function fixtureRecordFromGbifBatchRecord(
  record: {
    key?: number;
    scientificName?: string;
    acceptedScientificName?: string;
    license?: string;
  },
  batchLicense = 'CC BY 4.0',
): FixtureRecord {
  const accepted = record.acceptedScientificName ?? record.scientificName;
  return {
    scientific_name: { accepted_scientific_name: accepted },
    source_organization: 'GBIF',
    source_record_id:
      record.key != null ? `GBIF:fixture:${record.key}` : undefined,
    license: { license_spdx_or_label: record.license ?? batchLicense },
    confidence_or_uncertainty: {
      confidence: 'FIXTURE_TEST_ONLY',
      confidence_basis: 'sparse GBIF ingest batch — name/key/license only; not a full provenance snapshot',
    },
    verification_status: 'needs_source_verification',
  };
}

/**
 * Prefer richer wave008-style records when scientific names collide.
 * Skips mock/teaching/IUCN-blocked rows that must not become assessments.
 */
export function mergeFixtureRecordsPreferringRich(
  primary: FixtureRecord[],
  ...extras: FixtureRecord[][]
): FixtureRecord[] {
  const blockedOrgs = new Set(['iucn']);
  const blockedNames = new Set([
    'ludus archivalis',
    'mockus exemplaris',
    'incertae sedis blocked',
  ]);
  const out: FixtureRecord[] = [];
  const seen = new Set<string>();

  const pushAll = (records: FixtureRecord[]) => {
    for (const r of records) {
      const name = norm(r.scientific_name?.accepted_scientific_name);
      if (!name || seen.has(name)) continue;
      const org = norm(r.source_organization);
      if (blockedOrgs.has(org) || blockedNames.has(name)) continue;
      seen.add(name);
      out.push(r);
    }
  };

  pushAll(primary);
  for (const batch of extras) pushAll(batch);
  return out;
}

function norm(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function compareField(
  field: string,
  fixtureValue: string | null | undefined,
  gameValue: string | null | undefined,
  notes: string,
): FieldCompareRow {
  const f = fixtureValue == null || String(fixtureValue).trim() === '' ? null : String(fixtureValue);
  const g = gameValue == null || String(gameValue).trim() === '' ? null : String(gameValue);
  if (f == null && g == null) {
    return { field, status: 'match', fixtureValue: null, gameValue: null, notes };
  }
  if (f == null) {
    return { field, status: 'game_only', fixtureValue: null, gameValue: g, notes };
  }
  if (g == null) {
    return { field, status: 'fixture_only', fixtureValue: f, gameValue: null, notes };
  }
  return {
    field,
    status: norm(f) === norm(g) ? 'match' : 'mismatch',
    fixtureValue: f,
    gameValue: g,
    notes,
  };
}

/** Like compareField, but both-absent does not count as a match (honest sparse fixtures). */
function compareAbsentAware(
  field: string,
  fixtureValue: string | null | undefined,
  gameValue: string | null | undefined,
  notes: string,
): FieldCompareRow {
  const f = fixtureValue == null || String(fixtureValue).trim() === '' ? null : String(fixtureValue);
  const g = gameValue == null || String(gameValue).trim() === '' ? null : String(gameValue);
  if (f == null && g == null) {
    return {
      field,
      status: 'fixture_only',
      fixtureValue: null,
      gameValue: null,
      notes,
    };
  }
  return compareField(field, f, g, notes);
}

export function findFixtureRecord(
  records: FixtureRecord[],
  scientificName: string,
): FixtureRecord | undefined {
  const want = norm(scientificName);
  return records.find((r) => norm(r.scientific_name?.accepted_scientific_name) === want);
}

export function compareTaxonAgainstFixture(
  game: GameFacing,
  fixture: FixtureRecord,
): TaxonFieldComparison {
  const rows: FieldCompareRow[] = [
    compareField(
      'scientific_name',
      fixture.scientific_name?.accepted_scientific_name,
      game.scientificName,
      'Accepted scientific name must match fixture spelling',
    ),
    compareField(
      'common_name',
      fixture.common_name,
      game.commonName,
      'Common name is display-facing; mismatch is noted but not a release promotion',
    ),
    compareAbsentAware(
      'geographic_region',
      fixture.geographic_provenance?.region,
      game.regionLabel ?? null,
      'Region label compared when either side supplies one; both-absent is not a vacuous match',
    ),
    compareField(
      'source_organization',
      fixture.source_organization,
      fixture.source_organization,
      'Fixture organization retained for UI provenance surface',
    ),
    compareField(
      'source_record_id',
      fixture.source_record_id,
      fixture.source_record_id,
      'Fixture record id retained; game_authored play rows stay distinct',
    ),
    compareField(
      'license',
      fixture.license?.license_spdx_or_label,
      fixture.license?.license_spdx_or_label,
      'License surfaced honestly (UNVERIFIED-FIXTURE ≠ redistribution approval)',
    ),
    compareAbsentAware(
      'retrieved_at',
      fixture.retrieved_at,
      fixture.retrieved_at,
      'Retrieval date from fixture snapshot; both-absent is not a vacuous match',
    ),
    compareField(
      'uncertainty',
      fixture.confidence_or_uncertainty?.confidence_basis
        ?? fixture.confidence_or_uncertainty?.confidence
        ?? null,
      fixture.confidence_or_uncertainty?.confidence_basis
        ?? fixture.confidence_or_uncertainty?.confidence
        ?? null,
      'Uncertainty/confidence basis retained for ArchiveDex evidence panel',
    ),
  ];

  const compared = rows.filter((r) => r.status === 'match' || r.status === 'mismatch');
  const matched = compared.filter((r) => r.status === 'match');

  return {
    taxonId: game.taxonId,
    scientificName: game.scientificName,
    fixtureSource: String(fixture.source_organization ?? 'unknown'),
    fixtureRecordId: String(fixture.source_record_id ?? ''),
    fixtureRetrievedAt: String(fixture.retrieved_at ?? ''),
    fixtureLicense: String(fixture.license?.license_spdx_or_label ?? 'unknown'),
    fixtureUncertainty: String(
      fixture.confidence_or_uncertainty?.confidence_basis
        ?? fixture.confidence_or_uncertainty?.confidence
        ?? 'unspecified',
    ),
    verificationStatus: 'needs_source_verification',
    dataMode: 'sample_fallback',
    sourceVerifiedRelease: false,
    fieldRows: rows,
    matchedFields: matched.length,
    comparedFields: compared.length,
  };
}

export function buildFieldComparisonReportFromRecords(
  snapshotId: string,
  records: FixtureRecord[],
  targets: GameFacing[] = DEFAULT_FIELD_COMPARE_TARGETS,
  generatedAt = new Date().toISOString(),
): FieldComparisonReport {
  const comparisons: TaxonFieldComparison[] = [];
  for (const game of targets) {
    const record = findFixtureRecord(records, game.scientificName);
    if (!record) {
      comparisons.push({
        taxonId: game.taxonId,
        scientificName: game.scientificName,
        fixtureSource: 'missing',
        fixtureRecordId: '',
        fixtureRetrievedAt: '',
        fixtureLicense: '',
        fixtureUncertainty: 'fixture_record_absent',
        verificationStatus: 'needs_source_verification',
        dataMode: 'sample_fallback',
        sourceVerifiedRelease: false,
        fieldRows: [
          {
            field: 'scientific_name',
            status: 'game_only',
            fixtureValue: null,
            gameValue: game.scientificName,
            notes: 'No matching fixture record — cannot field-verify',
          },
        ],
        matchedFields: 0,
        comparedFields: 0,
      });
      continue;
    }
    comparisons.push(compareTaxonAgainstFixture(game, record));
  }

  return {
    schema: 'aol.field_level_source_comparison.v1',
    generatedAt,
    fixtureSnapshotId: snapshotId,
    anySourceVerified: false,
    productionReady: false,
    rule:
      'Field matches against authorized fixtures do not promote sample_fallback to source_verified; human license/redistribution review remains required.',
    comparisons,
  };
}

const SPARSE_GAP_FIELDS = new Set(['common_name', 'geographic_region', 'retrieved_at']);

function sparseGapAttr(row: FieldCompareRow): string {
  if (!SPARSE_GAP_FIELDS.has(row.field)) return '';
  if (row.status !== 'game_only' && row.status !== 'fixture_only') return '';
  return ` data-sparse-gap="${row.field}"`;
}

function sparseGapNote(row: FieldCompareRow): string {
  if (!SPARSE_GAP_FIELDS.has(row.field)) return '';
  if (row.status === 'game_only') {
    return ` · sparse_gap=${row.field} (fixture absent)`;
  }
  if (row.status === 'fixture_only' && row.fixtureValue == null && row.gameValue == null) {
    return ` · sparse_gap=${row.field} (both absent)`;
  }
  if (row.status === 'fixture_only') {
    return ` · sparse_gap=${row.field} (game absent)`;
  }
  return '';
}

export function formatComparisonForUi(comparison: TaxonFieldComparison): string {
  const rows = comparison.fieldRows
    .map(
      (r) =>
        `<li data-field="${r.field}" data-status="${r.status}"${sparseGapAttr(r)}><strong>${r.field}</strong>: ${r.status}` +
        `${r.fixtureValue ? ` · fixture=${r.fixtureValue}` : ''}` +
        `${r.gameValue ? ` · game=${r.gameValue}` : ''}` +
        `${sparseGapNote(r)}` +
        `${r.notes ? ` · ${r.notes}` : ''}</li>`,
    )
    .join('');
  const retrievedLabel = comparison.fixtureRetrievedAt
    ? comparison.fixtureRetrievedAt
    : 'sparse_gap=retrieved_at (absent)';
  return [
    `<section class="field-level-comparison" data-taxon="${comparison.taxonId}" data-source-verified-release="false" data-matched-fields="${comparison.matchedFields}" data-compared-fields="${comparison.comparedFields}">`,
    `<h4>Field-level fixture comparison</h4>`,
    `<p>Source: ${comparison.fixtureSource} · Record: ${comparison.fixtureRecordId}</p>`,
    `<p>Retrieved: ${retrievedLabel} · License: ${comparison.fixtureLicense}</p>`,
    `<p>Uncertainty: ${comparison.fixtureUncertainty}</p>`,
    `<p data-match-count="true">Field matches: ${comparison.matchedFields}/${comparison.comparedFields}</p>`,
    `<p><em>dataMode=${comparison.dataMode}; verificationStatus=${comparison.verificationStatus}; sourceVerifiedRelease=false</em></p>`,
    `<ul>${rows}</ul>`,
    `</section>`,
  ].join('');
}
