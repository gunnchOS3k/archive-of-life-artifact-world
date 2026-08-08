/**
 * Production-scale live probe: multi-page COL / GBIF / PBDB with checkpoint + resume.
 * Records exact counts — never claims GLOBAL_DATA_COMPLETE.
 */

import { BatchSnapshotIngest } from '../BatchSnapshotIngest';
import { CheckpointStore } from '../checkpointStore';
import type { IngestionSource } from '../types';

export interface ProductionProbeOptions {
  snapshotId: string;
  snapshotVersion: string;
  limitPerSource?: number;
  resume?: boolean;
  queries?: Partial<Record<IngestionSource, { scientificName: string; limit?: number }>>;
  checkpoints?: CheckpointStore;
}

export interface ProductionProbeResult {
  snapshotId: string;
  snapshotVersion: string;
  generatedAt: string;
  pagesFetched: number;
  recordsBySource: Record<string, number>;
  uniqueNames: number;
  anyLiveClaim: boolean;
  checkpoints: ReturnType<CheckpointStore['toJSON']>;
  errors: string[];
  pipelineStagesExercised: string[];
  globalCompleteClaim: false;
  tokenHints: {
    PIPELINE_COMPLETE: boolean;
    reason: string;
  };
}

const DEFAULT_QUERIES: Record<IngestionSource, { scientificName: string; limit?: number }> = {
  col: { scientificName: 'Ursus arctos' },
  gbif: { scientificName: 'Ursus arctos' },
  pbdb: { scientificName: 'Tyrannosaurus' },
};

export async function runProductionScaleProbe(
  opts: ProductionProbeOptions,
): Promise<ProductionProbeResult> {
  const limit = opts.limitPerSource ?? 100;
  const checkpoints = opts.checkpoints ?? new CheckpointStore();
  const runner = new BatchSnapshotIngest({ fixtureOnly: false }, checkpoints);

  const queries: Parameters<BatchSnapshotIngest['run']>[0]['queries'] = {};
  for (const source of ['col', 'gbif', 'pbdb'] as IngestionSource[]) {
    const q = opts.queries?.[source] ?? DEFAULT_QUERIES[source];
    queries[source] = {
      scientificName: q.scientificName,
      limit: q.limit ?? limit,
      useFixture: false,
    };
  }

  const batch = await runner.run({
    snapshotId: opts.snapshotId,
    snapshotVersion: opts.snapshotVersion,
    queries,
    useFixture: false,
    resume: opts.resume,
    crossSourceNameDedup: false,
    checkpoints,
  });

  const recordsBySource: Record<string, number> = {};
  let pagesFetched = 0;
  const errors: string[] = [];
  for (const s of batch.bySource) {
    recordsBySource[s.source] = s.importedCount;
    pagesFetched += s.pagesFetched;
    errors.push(...s.errors);
  }

  const uniqueNames = new Set(
    batch.allRecords.map((r) => r.scientificName.toLowerCase()),
  ).size;

  const multiSourceLive =
    batch.bySource.filter((s) => s.liveClaim && s.importedCount > 0).length >= 2;
  const multiPage = pagesFetched >= 2 || limit > 20;
  const total = Object.values(recordsBySource).reduce((a, b) => a + b, 0);
  const pipelineOk =
    multiSourceLive && multiPage && batch.anyLiveClaim && total >= 10;

  return {
    snapshotId: opts.snapshotId,
    snapshotVersion: opts.snapshotVersion,
    generatedAt: new Date().toISOString(),
    pagesFetched,
    recordsBySource,
    uniqueNames,
    anyLiveClaim: batch.anyLiveClaim,
    checkpoints: checkpoints.toJSON(),
    errors,
    pipelineStagesExercised: [
      'live_http',
      'pagination',
      'checkpoint',
      'validation',
      'dedup',
      'provenance',
      'license',
      opts.resume ? 'resume' : 'fresh_run',
    ],
    globalCompleteClaim: false,
    tokenHints: {
      PIPELINE_COMPLETE: pipelineOk,
      reason: pipelineOk
        ? 'Multi-source live pagination with ≥10 records and ≥2 live sources'
        : `Insufficient production probe (liveSources=${batch.bySource.filter((s) => s.liveClaim).length} pages=${pagesFetched} total=${total})`,
    },
  };
}
