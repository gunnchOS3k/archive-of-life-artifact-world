import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertTaxonomyReconcileHonesty,
  buildTaxonomyReconcileReport,
  renderTaxonomyReconcileHonestyHtml,
  type TaxonomyAuthorityRecord,
  type TaxonomySourceSnapshotMeta,
} from './taxonomyReconcile';

const ROOT = process.cwd();

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function loadAuthorities(): {
  authorities: TaxonomyAuthorityRecord[];
  snapshots: TaxonomySourceSnapshotMeta[];
} {
  const authorities: TaxonomyAuthorityRecord[] = [];
  const snapshots: TaxonomySourceSnapshotMeta[] = [];

  const wavePath = join(ROOT, 'data/scientific_fixtures/wave008-scientific-fixture-v1.json');
  const wave = JSON.parse(readFileSync(wavePath, 'utf8')) as {
    snapshot_id?: string;
    retrieved_at?: string;
    records?: Array<{
      scientific_name?: { accepted_scientific_name?: string; synonyms?: string[]; rank?: string };
      source_organization_id?: string;
      source_record_id?: string;
    }>;
  };
  snapshots.push({
    sourceId: 'wave008_col',
    snapshotId: String(wave.snapshot_id ?? 'wave008'),
    retrievedAt: wave.retrieved_at ?? null,
    sha256: sha256File(wavePath),
    license: 'UNVERIFIED-FIXTURE',
    recordCount: wave.records?.length ?? 0,
    dataMode: 'sample_fallback',
    approvedForUse: false,
    sourceVerifiedRelease: false,
  });
  for (const rec of wave.records ?? []) {
    const accepted = rec.scientific_name?.accepted_scientific_name;
    if (!accepted) continue;
    const sourceId =
      rec.source_organization_id === 'gbif' || String(rec.source_record_id ?? '').startsWith('GBIF')
        ? 'wave008_gbif'
        : 'wave008_col';
    authorities.push({
      sourceId,
      acceptedName: accepted,
      scientificName: accepted,
      rank: rec.scientific_name?.rank ?? null,
      synonyms: rec.scientific_name?.synonyms ?? [],
      sourceRecordId: rec.source_record_id ?? null,
      notes: 'wave008 scientific fixture — sample_fallback',
    });
  }

  const colBatchPath = join(ROOT, 'public/data/fixtures/ingest/col_batch.json');
  const colBatch = JSON.parse(readFileSync(colBatchPath, 'utf8')) as {
    snapshotId?: string;
    license?: string;
    entries?: Array<{
      id?: string;
      scientificName?: string;
      acceptedName?: string;
      rank?: string;
      synonyms?: string[];
    }>;
  };
  snapshots.push({
    sourceId: 'col_batch',
    snapshotId: String(colBatch.snapshotId ?? 'col_batch'),
    retrievedAt: null,
    sha256: sha256File(colBatchPath),
    license: colBatch.license ?? 'COL terms of use',
    recordCount: colBatch.entries?.length ?? 0,
    dataMode: 'sample_fallback',
    approvedForUse: false,
    sourceVerifiedRelease: false,
  });
  for (const entry of colBatch.entries ?? []) {
    if (!entry.scientificName && !entry.acceptedName) continue;
    authorities.push({
      sourceId: 'col_batch',
      acceptedName: entry.acceptedName ?? entry.scientificName!,
      scientificName: entry.scientificName ?? entry.acceptedName!,
      rank: entry.rank ?? null,
      synonyms: entry.synonyms ?? [],
      sourceRecordId: entry.id ? `COL:fixture:${entry.id}` : null,
      notes: 'COL tier-R fixture batch — sample_fallback',
    });
  }

  const gbifBatchPath = join(ROOT, 'public/data/fixtures/ingest/gbif_batch.json');
  const gbifBatch = JSON.parse(readFileSync(gbifBatchPath, 'utf8')) as {
    snapshotId?: string;
    records?: Array<{ key?: number; scientificName?: string; canonicalName?: string; rank?: string }>;
  };
  snapshots.push({
    sourceId: 'gbif_batch',
    snapshotId: String(gbifBatch.snapshotId ?? 'gbif_batch'),
    retrievedAt: null,
    sha256: sha256File(gbifBatchPath),
    license: 'Per-dataset (fixture)',
    recordCount: gbifBatch.records?.length ?? 0,
    dataMode: 'sample_fallback',
    approvedForUse: false,
    sourceVerifiedRelease: false,
  });
  for (const rec of gbifBatch.records ?? []) {
    const name = rec.canonicalName ?? rec.scientificName;
    if (!name) continue;
    authorities.push({
      sourceId: 'gbif_batch',
      acceptedName: name,
      scientificName: name,
      rank: rec.rank ?? null,
      synonyms: [],
      sourceRecordId: rec.key != null ? `GBIF:fixture:${rec.key}` : null,
      notes: 'GBIF tier-R fixture batch — sample_fallback',
    });
  }

  const pbdbPath = join(ROOT, 'data-pipeline/snapshots/public_bounded/pbdb_flagship_bounded.json');
  const pbdb = JSON.parse(readFileSync(pbdbPath, 'utf8')) as {
    retrievedAt?: string;
    records?: Array<{ query?: string; row?: { accepted_name?: string; taxon_name?: string; taxon_rank?: string; taxon_no?: string } }>;
  };
  snapshots.push({
    sourceId: 'pbdb_bounded',
    snapshotId: 'pbdb_flagship_bounded',
    retrievedAt: pbdb.retrievedAt ?? null,
    sha256: sha256File(pbdbPath),
    license: 'CC BY 4.0 Paleobiology Database',
    recordCount: pbdb.records?.length ?? 0,
    dataMode: 'sample_fallback',
    approvedForUse: false,
    sourceVerifiedRelease: false,
  });
  for (const rec of pbdb.records ?? []) {
    const accepted = rec.row?.accepted_name ?? rec.row?.taxon_name ?? rec.query;
    if (!accepted) continue;
    authorities.push({
      sourceId: 'pbdb_bounded',
      acceptedName: accepted,
      scientificName: rec.row?.taxon_name ?? accepted,
      rank: rec.row?.taxon_rank ?? null,
      synonyms: [],
      sourceRecordId: rec.row?.taxon_no ? `PBDB:${rec.row.taxon_no}` : null,
      notes: 'PBDB bounded snapshot — sample_fallback; approvedForUse=false',
    });
  }

  // Optional local (gitignored) COL/GBIF bounded acquires — hash/date only when present.
  const colLive = join(ROOT, 'data-pipeline/snapshots/public_bounded/col_flagship_bounded.json');
  if (existsSync(colLive)) {
    const live = JSON.parse(readFileSync(colLive, 'utf8')) as {
      retrievedAt?: string;
      taxa?: unknown[];
      approvedForUse?: boolean;
      verificationStatus?: string;
    };
    snapshots.push({
      sourceId: 'col_batch',
      snapshotId: 'col_flagship_bounded.local',
      retrievedAt: live.retrievedAt ?? null,
      sha256: sha256File(colLive),
      license: 'COL terms of use (local bounded acquire; not committed)',
      recordCount: live.taxa?.length ?? 0,
      dataMode: 'sample_fallback',
      approvedForUse: false,
      sourceVerifiedRelease: false,
    });
    expect(live.approvedForUse).toBe(false);
    expect(live.verificationStatus).not.toBe('source_verified');
  }

  return { authorities, snapshots };
}

describe('taxonomyReconcile', () => {
  it('reconciles flagship names across fixtures with hashes/dates and never promotes source_verified', () => {
    const { authorities, snapshots } = loadAuthorities();
    const report = buildTaxonomyReconcileReport({
      authorities,
      snapshots,
      generatedAt: '2026-10-30T16:00:00.000Z',
    });
    assertTaxonomyReconcileHonesty(report);

    expect(report.anySourceVerified).toBe(false);
    expect(report.iucnBlocksAllScience).toBe(false);
    expect(report.snapshots.every((s) => s.sha256 && s.sha256.length === 64)).toBe(true);
    expect(report.rows.every((r) => r.dataMode === 'sample_fallback')).toBe(true);
    expect(report.rows.every((r) => r.sourceVerifiedRelease === false)).toBe(true);

    const lion = report.rows.find((r) => r.taxonId === 'panthera_leo');
    expect(lion?.hits.length).toBeGreaterThan(0);
    expect(['agree', 'partial', 'single_source']).toContain(lion?.acceptedNameAgreement);

    const horse = report.rows.find((r) => r.taxonId === 'equus_caballus_ferus');
    // Infraspecific game name may only partially overlap species-level fixture rows.
    expect(horse).toBeTruthy();
    expect(horse?.sourceVerifiedRelease).toBe(false);

    const mammoth = report.rows.find((r) => r.taxonId === 'mammuthus_primigenius');
    expect(mammoth?.hits.some((h) => h.sourceId === 'pbdb_bounded')).toBe(true);

    const html = renderTaxonomyReconcileHonestyHtml(report);
    expect(html).toContain('sample_fallback');
    expect(html).toContain('0/17');

    const outDir = join(ROOT, 'artifacts/science');
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, 'TAXONOMY_RECONCILE_RESULT.json');
    writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
    writeFileSync(
      join(ROOT, 'public/data/status/taxonomy_reconcile.json'),
      JSON.stringify(
        {
          schema: report.schema,
          generatedAt: report.generatedAt,
          anySourceVerified: false,
          rowCount: report.rows.length,
          hits: report.rows.filter((r) => r.hits.length > 0).length,
          snapshots: report.snapshots.map((s) => ({
            sourceId: s.sourceId,
            snapshotId: s.snapshotId,
            retrievedAt: s.retrievedAt,
            sha256: s.sha256,
            recordCount: s.recordCount,
            dataMode: s.dataMode,
          })),
        },
        null,
        2,
      ) + '\n',
    );
    expect(existsSync(outPath)).toBe(true);
  });
});
