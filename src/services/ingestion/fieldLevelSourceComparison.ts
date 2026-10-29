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

export const DEFAULT_FIELD_COMPARE_TARGETS: GameFacing[] = [
  {
    taxonId: 'panthera_leo',
    commonName: 'Lion',
    scientificName: 'Panthera leo',
    regionLabel: 'Afrotropical',
  },
];

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
    compareField(
      'geographic_region',
      fixture.geographic_provenance?.region,
      game.regionLabel ?? null,
      'Region label compared when game supplies one',
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
    compareField(
      'retrieved_at',
      fixture.retrieved_at,
      fixture.retrieved_at,
      'Retrieval date from fixture snapshot',
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

export function formatComparisonForUi(comparison: TaxonFieldComparison): string {
  const rows = comparison.fieldRows
    .map(
      (r) =>
        `<li data-field="${r.field}" data-status="${r.status}"><strong>${r.field}</strong>: ${r.status}` +
        `${r.fixtureValue ? ` · fixture=${r.fixtureValue}` : ''}` +
        `${r.gameValue ? ` · game=${r.gameValue}` : ''}</li>`,
    )
    .join('');
  return [
    `<section class="field-level-comparison" data-taxon="${comparison.taxonId}" data-source-verified-release="false">`,
    `<h4>Field-level fixture comparison</h4>`,
    `<p>Source: ${comparison.fixtureSource} · Record: ${comparison.fixtureRecordId}</p>`,
    `<p>Retrieved: ${comparison.fixtureRetrievedAt} · License: ${comparison.fixtureLicense}</p>`,
    `<p>Uncertainty: ${comparison.fixtureUncertainty}</p>`,
    `<p><em>dataMode=${comparison.dataMode}; verificationStatus=${comparison.verificationStatus}; sourceVerifiedRelease=false</em></p>`,
    `<ul>${rows}</ul>`,
    `</section>`,
  ].join('');
}
