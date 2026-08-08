/**
 * Bulk / official snapshot ingest manifests — hash + provenance without committing huge datasets.
 * Large files live under data-pipeline/snapshots/ (gitignored) or external cache.
 */

import { createHash } from 'crypto';
import { createReadStream, existsSync, statSync } from 'fs';

export type BulkSourceId = 'col' | 'gbif' | 'pbdb';

export interface BulkSnapshotSourceSpec {
  source: BulkSourceId;
  /** Human label for the official product (ChecklistBank export, GBIF DwC-A, PBDB dump). */
  product: string;
  /** Recommended public acquisition URL or documentation page (not auto-fetched into git). */
  acquisitionUrl: string;
  license: string;
  /** Relative path under data-pipeline/snapshots/ when operator places the file. */
  localRelativePath: string;
  /** Expected SHA-256 when known; null until first local hash. */
  sha256: string | null;
  /** Byte size when known. */
  bytes: number | null;
  format: 'json' | 'csv' | 'zip' | 'dwca' | 'parquet' | 'other';
  notes: string;
}

export interface BulkSnapshotManifest {
  schemaVersion: '1.0.0';
  snapshotId: string;
  snapshotVersion: string;
  generatedAt: string;
  globalCompleteClaim: false;
  sources: BulkSnapshotSourceSpec[];
  commands: string[];
  honesty: {
    neverCommitHugeDatasets: true;
    liveClaimOnlyWhenQueried: true;
    noFabricatedGlobalComplete: true;
  };
}

export const DEFAULT_BULK_SPECS: BulkSnapshotSourceSpec[] = [
  {
    source: 'col',
    product: 'Catalogue of Life / ChecklistBank NameUsage export (dataset 3LR or approved freeze)',
    acquisitionUrl: 'https://www.checklistbank.org/',
    license: 'COL terms of use',
    localRelativePath: 'col/nameusage_export.jsonl',
    sha256: null,
    bytes: null,
    format: 'json',
    notes: 'Place approved ChecklistBank export locally; do not commit the dump.',
  },
  {
    source: 'gbif',
    product: 'GBIF Occurrence or Species download (DwC-A / DOI)',
    acquisitionUrl: 'https://www.gbif.org/occurrence/download',
    license: 'Varies per dataset — record in provenance',
    localRelativePath: 'gbif/download.zip',
    sha256: null,
    bytes: null,
    format: 'dwca',
    notes: 'Use official GBIF download DOI; stream/decompress outside git.',
  },
  {
    source: 'pbdb',
    product: 'Paleobiology Database taxa/occurrences export',
    acquisitionUrl: 'https://paleobiodb.org/data1.2/',
    license: 'CC BY 4.0',
    localRelativePath: 'pbdb/taxa_export.csv',
    sha256: null,
    bytes: null,
    format: 'csv',
    notes: 'PBDB public API or dump; hash after download.',
  },
];

export function buildBulkSnapshotManifest(opts: {
  snapshotId: string;
  snapshotVersion: string;
  sources?: BulkSnapshotSourceSpec[];
}): BulkSnapshotManifest {
  return {
    schemaVersion: '1.0.0',
    snapshotId: opts.snapshotId,
    snapshotVersion: opts.snapshotVersion,
    generatedAt: new Date().toISOString(),
    globalCompleteClaim: false,
    sources: opts.sources ?? DEFAULT_BULK_SPECS,
    commands: [
      'npm run ingest:batch',
      'npm run ingest:batch:live -- --limit=100',
      'npm run ingest:production-probe',
      'npm run ingest:bulk-manifest',
      '# Place dumps under data-pipeline/snapshots/<source>/ then: npm run ingest:bulk-hash',
    ],
    honesty: {
      neverCommitHugeDatasets: true,
      liveClaimOnlyWhenQueried: true,
      noFabricatedGlobalComplete: true,
    },
  };
}

export async function sha256File(path: string): Promise<{ sha256: string; bytes: number }> {
  if (!existsSync(path)) {
    throw new Error(`File not found for hashing: ${path}`);
  }
  const bytes = statSync(path).size;
  const hash = createHash('sha256');
  const stream = createReadStream(path);
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return { sha256: hash.digest('hex'), bytes };
}

/** Sync hash for small fixtures / tests. */
export function sha256Buffer(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}
