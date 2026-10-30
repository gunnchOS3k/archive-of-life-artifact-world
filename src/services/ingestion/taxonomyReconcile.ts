/**
 * Taxonomy reconcile across permitted public fixtures / bounded snapshots.
 *
 * Compares accepted names, synonyms, ranks, and source IDs. Match evidence is
 * never a sample_fallback → source_verified promotion. IUCN absence does not
 * block this path.
 */

export type TaxonomySourceId = 'wave008_col' | 'wave008_gbif' | 'col_batch' | 'gbif_batch' | 'pbdb_bounded';

export type TaxonomySourceSnapshotMeta = {
  sourceId: TaxonomySourceId;
  snapshotId: string;
  retrievedAt: string | null;
  sha256: string | null;
  license: string;
  recordCount: number;
  dataMode: 'sample_fallback';
  approvedForUse: false;
  sourceVerifiedRelease: false;
};

export type TaxonomyAuthorityHit = {
  sourceId: TaxonomySourceId;
  acceptedName: string;
  scientificName: string;
  rank: string | null;
  synonyms: string[];
  sourceRecordId: string | null;
  notes: string;
};

export type TaxonomyReconcileRow = {
  taxonId: string;
  gameScientificName: string;
  hits: TaxonomyAuthorityHit[];
  acceptedNameAgreement: 'agree' | 'partial' | 'conflict' | 'single_source' | 'none';
  synonymCoverage: string[];
  notes: string;
  dataMode: 'sample_fallback';
  verificationStatus: 'needs_source_verification';
  sourceVerifiedRelease: false;
};

export type TaxonomyReconcileReport = {
  schema: 'aol.taxonomy_reconcile.v1';
  generatedAt: string;
  anySourceVerified: false;
  productionReady: false;
  iucnBlocksAllScience: false;
  snapshots: TaxonomySourceSnapshotMeta[];
  rows: TaxonomyReconcileRow[];
  rule: string;
};

export type TaxonomyReconcileInputTaxon = {
  taxonId: string;
  scientificName: string;
};

export type TaxonomyAuthorityRecord = {
  sourceId: TaxonomySourceId;
  acceptedName: string;
  scientificName: string;
  rank?: string | null;
  synonyms?: string[];
  sourceRecordId?: string | null;
  notes?: string;
};

const RULE =
  'Taxonomy reconcile records accepted-name / synonym agreement across permitted fixtures only; never promotes sample_fallback → source_verified; IUCN token absence does not freeze this science path.';

export const DEFAULT_RECONCILE_TAXA: TaxonomyReconcileInputTaxon[] = [
  { taxonId: 'panthera_leo', scientificName: 'Panthera leo' },
  { taxonId: 'canis_lupus', scientificName: 'Canis lupus' },
  { taxonId: 'loxodonta_africana', scientificName: 'Loxodonta africana' },
  { taxonId: 'ursus_maritimus', scientificName: 'Ursus maritimus' },
  { taxonId: 'balaenoptera_musculus', scientificName: 'Balaenoptera musculus' },
  { taxonId: 'equus_caballus_ferus', scientificName: 'Equus ferus przewalskii' },
  { taxonId: 'mammuthus_primigenius', scientificName: 'Mammuthus primigenius' },
  { taxonId: 'tyrannosaurus_rex', scientificName: 'Tyrannosaurus rex' },
  { taxonId: 'trilobita_order', scientificName: 'Trilobita' },
  { taxonId: 'danaus_plexippus', scientificName: 'Danaus plexippus' },
  { taxonId: 'apis_mellifera', scientificName: 'Apis mellifera' },
];

function norm(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function namesOverlap(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Infraspecific honesty: "equus ferus przewalskii" overlaps species "equus ferus"
  const aParts = na.split(' ');
  const bParts = nb.split(' ');
  if (aParts.length >= 2 && bParts.length >= 2) {
    return aParts[0] === bParts[0] && aParts[1] === bParts[1];
  }
  return false;
}

function classifyAgreement(gameName: string, hits: TaxonomyAuthorityHit[]): TaxonomyReconcileRow['acceptedNameAgreement'] {
  if (hits.length === 0) return 'none';
  const accepted = [...new Set(hits.map((h) => norm(h.acceptedName)).filter(Boolean))];
  if (hits.length === 1) return 'single_source';
  if (accepted.length === 1) {
    return namesOverlap(gameName, accepted[0]) || accepted.every((a) => namesOverlap(a, hits[0].acceptedName))
      ? 'agree'
      : 'partial';
  }
  // Multiple accepted strings — check whether they are species vs infraspecific variants
  const allOverlap = accepted.every((a) => accepted.every((b) => namesOverlap(a, b)));
  if (allOverlap) return 'partial';
  return 'conflict';
}

/** Pure reconcile — browser-safe; callers supply authority records + snapshot meta. */
export function buildTaxonomyReconcileReport(input: {
  taxa?: TaxonomyReconcileInputTaxon[];
  authorities: TaxonomyAuthorityRecord[];
  snapshots: TaxonomySourceSnapshotMeta[];
  generatedAt?: string;
}): TaxonomyReconcileReport {
  const taxa = input.taxa ?? DEFAULT_RECONCILE_TAXA;
  const rows: TaxonomyReconcileRow[] = taxa.map((taxon) => {
    const hits: TaxonomyAuthorityHit[] = input.authorities
      .filter(
        (a) =>
          namesOverlap(taxon.scientificName, a.scientificName) ||
          namesOverlap(taxon.scientificName, a.acceptedName) ||
          (a.synonyms ?? []).some((s) => namesOverlap(taxon.scientificName, s)),
      )
      .map((a) => ({
        sourceId: a.sourceId,
        acceptedName: a.acceptedName,
        scientificName: a.scientificName,
        rank: a.rank ?? null,
        synonyms: a.synonyms ?? [],
        sourceRecordId: a.sourceRecordId ?? null,
        notes: a.notes ?? 'fixture/bounded authority hit — sample_fallback only',
      }));

    const synonymCoverage = [
      ...new Set(hits.flatMap((h) => h.synonyms.map((s) => s.trim()).filter(Boolean))),
    ];

    const agreement = classifyAgreement(taxon.scientificName, hits);
    const notes =
      agreement === 'none'
        ? 'No permitted fixture/authority hit — do not invent taxonomy'
        : agreement === 'conflict'
          ? 'Accepted-name conflict across sources — hold needs_source_verification'
          : agreement === 'partial'
            ? 'Partial agreement (e.g. species vs infraspecific) — keep honest mismatch'
            : 'Authority hits recorded; still sample_fallback until human rights review';

    return {
      taxonId: taxon.taxonId,
      gameScientificName: taxon.scientificName,
      hits,
      acceptedNameAgreement: agreement,
      synonymCoverage,
      notes,
      dataMode: 'sample_fallback',
      verificationStatus: 'needs_source_verification',
      sourceVerifiedRelease: false,
    };
  });

  return {
    schema: 'aol.taxonomy_reconcile.v1',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    anySourceVerified: false,
    productionReady: false,
    iucnBlocksAllScience: false,
    snapshots: input.snapshots.map((s) => ({
      ...s,
      dataMode: 'sample_fallback',
      approvedForUse: false,
      sourceVerifiedRelease: false,
    })),
    rows,
    rule: RULE,
  };
}

export function assertTaxonomyReconcileHonesty(report: TaxonomyReconcileReport): void {
  if (report.anySourceVerified || report.productionReady) {
    throw new Error('Taxonomy reconcile must not claim source_verified / productionReady');
  }
  if (report.iucnBlocksAllScience) {
    throw new Error('IUCN absence must not freeze taxonomy reconcile science');
  }
  for (const snap of report.snapshots) {
    if (snap.dataMode !== 'sample_fallback' || snap.approvedForUse || snap.sourceVerifiedRelease) {
      throw new Error(`Snapshot ${snap.sourceId} honesty violation`);
    }
  }
  for (const row of report.rows) {
    if (row.dataMode !== 'sample_fallback' || row.sourceVerifiedRelease) {
      throw new Error(`Row ${row.taxonId} honesty violation`);
    }
    if (row.verificationStatus === ('source_verified' as string)) {
      throw new Error(`Row ${row.taxonId} must not be source_verified`);
    }
  }
}

/** Compact player/museum strip — science continues without IUCN; maps stay 0/17. */
export function renderTaxonomyReconcileHonestyHtml(
  report: TaxonomyReconcileReport,
): string {
  assertTaxonomyReconcileHonesty(report);
  const withHits = report.rows.filter((r) => r.hits.length > 0).length;
  return [
    '<aside class="taxonomy-reconcile-honesty" data-taxonomy-reconcile="1" role="note">',
    `<p><strong>Taxonomy reconcile:</strong> ${withHits}/${report.rows.length} flagships have permitted fixture/authority hits — all sample_fallback.</p>`,
    '<p>Snapshots/hashes/dates recorded; IUCN blocked_external does not freeze COL/GBIF/PBDB science; maps remain 0/17 locked without assets.</p>',
    `<p><em>${escapeHtml(report.rule)}</em></p>`,
    '</aside>',
  ].join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
