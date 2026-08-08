/**
 * Batch / snapshot ingest over COL / GBIF / PBDB with pagination, resume,
 * validation, provenance, license, and dedup.
 *
 * Prefer fixture + optional live. liveClaim is true only when live HTTP succeeded
 * for that source in this run — never for fixtures or unqueried sources.
 */

import { ScientificIngestionService, type FixtureBundles } from './ScientificIngestionService';
import { CheckpointStore, type IngestCheckpoint } from './checkpointStore';
import { dedupRecords, type DedupStats } from './dedup';
import { filterValidRecords } from './validateRecord';
import type {
  IngestedTaxonRecord,
  IngestionClientConfig,
  IngestionMode,
  IngestionQuery,
  IngestionSource,
} from './types';
import { DEFAULT_INGESTION_CONFIG } from './types';

export interface SnapshotMeta {
  snapshotId: string;
  snapshotVersion: string;
  createdAt: string;
  sources: IngestionSource[];
  licenseNotes: Record<string, string>;
}

export interface BatchSourceResult {
  source: IngestionSource;
  mode: IngestionMode;
  /** Explicit honesty — true only if live HTTP produced records this run */
  liveClaim: boolean;
  records: IngestedTaxonRecord[];
  importedCount: number;
  rejectedCount: number;
  pagesFetched: number;
  resumedFromOffset: number;
  checkpoint?: IngestCheckpoint;
  dedup: DedupStats;
  errors: string[];
}

export interface BatchIngestResult {
  snapshot: SnapshotMeta;
  bySource: BatchSourceResult[];
  allRecords: IngestedTaxonRecord[];
  totals: {
    imported: number;
    rejected: number;
    bySource: Record<string, number>;
  };
  /** Aggregate: true only if ANY source has liveClaim */
  anyLiveClaim: boolean;
}

export interface BatchIngestOptions {
  snapshotId: string;
  snapshotVersion: string;
  queries: Partial<Record<IngestionSource, IngestionQuery>>;
  /** Force fixture path (tests / offline). Never sets liveClaim. */
  useFixture?: boolean;
  /** Resume from checkpoint store offsets */
  resume?: boolean;
  crossSourceNameDedup?: boolean;
  config?: Partial<IngestionClientConfig>;
  fixtures?: FixtureBundles;
  checkpoints?: CheckpointStore;
}

const LICENSE_NOTES: Record<IngestionSource, string> = {
  col: 'Catalogue of Life / ChecklistBank — respect COL terms of use',
  gbif: 'GBIF Occurrence API — licenses vary per occurrence; default CC BY 4.0 when present',
  pbdb: 'Paleobiology Database — CC BY 4.0',
};

export class BatchSnapshotIngest {
  private readonly svc: ScientificIngestionService;
  readonly checkpoints: CheckpointStore;

  constructor(config: Partial<IngestionClientConfig> = {}, checkpoints?: CheckpointStore) {
    this.svc = new ScientificIngestionService({ ...DEFAULT_INGESTION_CONFIG, ...config });
    this.checkpoints = checkpoints ?? new CheckpointStore();
  }

  setFixtures(fixtures: FixtureBundles): void {
    this.svc.setFixtures(fixtures);
  }

  async run(opts: BatchIngestOptions): Promise<BatchIngestResult> {
    if (opts.fixtures) this.setFixtures(opts.fixtures);
    const sources = (Object.keys(opts.queries) as IngestionSource[]).filter(
      (s) => opts.queries[s] != null,
    );
    const snapshot: SnapshotMeta = {
      snapshotId: opts.snapshotId,
      snapshotVersion: opts.snapshotVersion,
      createdAt: new Date().toISOString(),
      sources,
      licenseNotes: Object.fromEntries(sources.map((s) => [s, LICENSE_NOTES[s]])),
    };

    const bySource: BatchSourceResult[] = [];
    const accumulated: IngestedTaxonRecord[] = [];

    for (const source of sources) {
      const query = { ...opts.queries[source]! };
      if (opts.useFixture) query.useFixture = true;

      let resumedFromOffset = query.offset ?? 0;
      if (opts.resume) {
        const cp = this.checkpoints.get(source, queryKey(query), opts.snapshotVersion);
        if (cp) {
          resumedFromOffset = cp.offset;
          query.offset = cp.offset;
        }
      }

      const pageResult = await this.ingestSource(source, query);
      const { valid, rejected } = filterValidRecords(pageResult.records);
      const { records: deduped, stats: dedup } = dedupRecords(valid, {
        crossSourceNameDedup: opts.crossSourceNameDedup,
      });

      // Honesty: liveClaim only when mode is live AND every kept record isLive
      const liveClaim =
        pageResult.mode === 'live' &&
        deduped.length > 0 &&
        deduped.every((r) => r.provenance.isLive === true && r.provenance.isFixture === false);

      if (pageResult.mode === 'fixture') {
        for (const r of deduped) {
          if (r.provenance.isLive) {
            throw new Error(`Honesty violation: fixture batch claimed live for ${r.scientificName}`);
          }
        }
      }

      const nextOffset = resumedFromOffset + (pageResult.pageSize || deduped.length);
      const checkpoint: IngestCheckpoint = {
        source,
        queryKey: queryKey(query),
        snapshotVersion: opts.snapshotVersion,
        offset: pageResult.hasMore ? nextOffset : nextOffset,
        page: pageResult.page,
        recordsImported: deduped.length,
        lastSuccessAt: new Date().toISOString(),
        liveClaim,
        errors: [...pageResult.errors, ...rejected.flatMap((r) => r.errors)],
      };
      this.checkpoints.set(checkpoint);

      const sourceResult: BatchSourceResult = {
        source,
        mode: pageResult.mode,
        liveClaim,
        records: deduped,
        importedCount: deduped.length,
        rejectedCount: rejected.length + dedup.droppedById + dedup.droppedByName,
        pagesFetched: pageResult.page,
        resumedFromOffset,
        checkpoint,
        dedup,
        errors: checkpoint.errors,
      };
      bySource.push(sourceResult);
      accumulated.push(...deduped);
    }

    // Final cross-batch dedup if requested
    const final =
      opts.crossSourceNameDedup !== false
        ? dedupRecords(accumulated, { crossSourceNameDedup: true })
        : { records: accumulated, stats: { input: accumulated.length, kept: accumulated.length, droppedById: 0, droppedByName: 0 } };

    const bySourceCounts: Record<string, number> = {};
    for (const s of bySource) bySourceCounts[s.source] = s.importedCount;

    return {
      snapshot,
      bySource,
      allRecords: final.records,
      totals: {
        imported: final.records.length,
        rejected: bySource.reduce((n, s) => n + s.rejectedCount, 0),
        bySource: bySourceCounts,
      },
      anyLiveClaim: bySource.some((s) => s.liveClaim),
    };
  }

  private async ingestSource(source: IngestionSource, query: IngestionQuery) {
    switch (source) {
      case 'col':
        return this.svc.ingestCol(query);
      case 'gbif':
        return this.svc.ingestGbif(query);
      case 'pbdb':
        return this.svc.ingestPbdb(query);
      default: {
        const _exhaustive: never = source;
        throw new Error(`Unknown source: ${_exhaustive}`);
      }
    }
  }
}

function queryKey(q: IngestionQuery): string {
  return `${q.scientificName ?? '*'}|limit=${q.limit ?? 'default'}`;
}

export function countsBySourceHonest(result: BatchIngestResult): Array<{
  source: string;
  imported: number;
  mode: IngestionMode;
  liveClaim: boolean;
}> {
  return result.bySource.map((s) => ({
    source: s.source,
    imported: s.importedCount,
    mode: s.mode,
    liveClaim: s.liveClaim,
  }));
}
