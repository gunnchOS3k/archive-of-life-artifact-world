/**
 * Production-grade ingest orchestration:
 * source states, pagination/checkpoint/resume via BatchSnapshotIngest,
 * cache, validation, provenance, license, synonyms, dedup, actual counts.
 * Never calls live HTTP for FIXTURE_TEST_ONLY sources.
 */

import { BatchSnapshotIngest, type BatchIngestResult, type BatchIngestOptions } from './BatchSnapshotIngest';
import { CheckpointStore } from './checkpointStore';
import { IngestCache } from './ingestCache';
import { buildSynonymIndex } from './synonyms';
import {
  DEFAULT_SOURCE_REGISTRY,
  assertNeverCallFixtureLive,
  getSourceEntry,
  resolveIngestMode,
  type SourceRegistryEntry,
} from './sourceRegistry';
import type { FixtureBundles } from './ScientificIngestionService';
import type { IngestionQuery, IngestionSource } from './types';
import { buildActualCountsReport, type ActualCountsReport } from '@/coverage/ActualCountsReport';
import { TierRRecordIndex } from '@/coverage/TierRRecordIndex';

export interface ProductionIngestRunOptions {
  snapshotId: string;
  snapshotVersion: string;
  /** Prefer fixture path (CI / offline). */
  forceFixture?: boolean;
  resume?: boolean;
  queries: Partial<Record<IngestionSource, IngestionQuery>>;
  fixtures?: FixtureBundles;
  registry?: SourceRegistryEntry[];
  cache?: IngestCache;
  checkpoints?: CheckpointStore;
}

export interface ProductionIngestRunResult {
  batch: BatchIngestResult;
  index: TierRRecordIndex;
  actualCounts: ActualCountsReport;
  sourceStates: Array<{ id: string; state: string; mode: string }>;
  synonymEdges: number;
  conflicts: number;
}

export class ProductionIngestOrchestrator {
  readonly cache: IngestCache;
  readonly checkpoints: CheckpointStore;
  readonly registry: SourceRegistryEntry[];

  constructor(opts?: {
    cache?: IngestCache;
    checkpoints?: CheckpointStore;
    registry?: SourceRegistryEntry[];
  }) {
    this.cache = opts?.cache ?? new IngestCache();
    this.checkpoints = opts?.checkpoints ?? new CheckpointStore();
    this.registry = opts?.registry ?? DEFAULT_SOURCE_REGISTRY;
  }

  async run(opts: ProductionIngestRunOptions): Promise<ProductionIngestRunResult> {
    const forceFixture = opts.forceFixture !== false; // default fixture-safe
    const sourceStates: Array<{ id: string; state: string; mode: string }> = [];
    const safeQueries: Partial<Record<IngestionSource, IngestionQuery>> = {};

    for (const source of Object.keys(opts.queries) as IngestionSource[]) {
      const q = opts.queries[source];
      if (!q) continue;
      const entry = getSourceEntry(source, this.registry);
      if (!entry) {
        sourceStates.push({ id: source, state: 'UNAVAILABLE', mode: 'blocked' });
        continue;
      }
      const mode = resolveIngestMode(entry, {
        forceFixture: forceFixture || q.useFixture === true,
      });
      sourceStates.push({ id: source, state: entry.state, mode });

      if (mode === 'blocked') continue;

      const wantLive = mode === 'live' && !forceFixture && !q.useFixture;
      assertNeverCallFixtureLive(entry, wantLive);

      if (mode === 'fixture' || forceFixture || entry.state === 'FIXTURE_TEST_ONLY') {
        safeQueries[source] = { ...q, useFixture: true };
      } else {
        safeQueries[source] = { ...q };
      }

      // Cache stamp for observability (payload optional)
      this.cache.set(
        IngestCache.key([source, opts.snapshotVersion, q.scientificName ?? '*', q.limit ?? 0]),
        source,
        mode === 'live' ? 'live' : mode === 'snapshot' ? 'snapshot' : 'fixture',
        { planned: true },
      );
    }

    const batchRunner = new BatchSnapshotIngest(
      forceFixture ? { fixtureOnly: true } : {},
      opts.checkpoints ?? this.checkpoints,
    );
    if (opts.fixtures) batchRunner.setFixtures(opts.fixtures);

    const batchOpts: BatchIngestOptions = {
      snapshotId: opts.snapshotId,
      snapshotVersion: opts.snapshotVersion,
      queries: safeQueries,
      useFixture: forceFixture,
      resume: opts.resume,
      crossSourceNameDedup: true,
      fixtures: opts.fixtures,
      checkpoints: opts.checkpoints ?? this.checkpoints,
    };

    const batch = await batchRunner.run(batchOpts);

    // Attach synonyms from payload onto records for index/report
    for (const r of batch.allRecords) {
      const payload = r.payload as Record<string, unknown> | undefined;
      if (!r.synonyms && Array.isArray(payload?.synonyms)) {
        r.synonyms = (payload!.synonyms as unknown[]).map(String);
      }
      if (!r.acceptedName && typeof payload?.acceptedName === 'string') {
        r.acceptedName = payload.acceptedName;
      }
    }

    const syn = buildSynonymIndex(batch.allRecords);
    const index = new TierRRecordIndex(opts.snapshotId, opts.snapshotVersion);
    index.importRecords(batch.allRecords);

    const acceptedNames = new Set(
      batch.allRecords.map((r) =>
        (r.acceptedName ?? r.scientificName).trim().toLowerCase().replace(/\s+/g, ' '),
      ),
    );

    const actualCounts = buildActualCountsReport({
      snapshotId: opts.snapshotId,
      snapshotVersion: opts.snapshotVersion,
      recordsBySource: batch.bySource.map((s) => {
        const entry = getSourceEntry(s.source, this.registry);
        return {
          source: s.source,
          records: s.importedCount,
          mode: s.mode,
          liveClaim: s.liveClaim,
          sourceState: forceFixture ? 'FIXTURE_TEST_ONLY' : entry?.state ?? 'UNKNOWN',
        };
      }),
      uniqueTaxa: index.size,
      uniqueAccepted: acceptedNames.size,
      synonyms: syn.stats.uniqueSynonyms,
      synonymEdges: syn.stats.synonymEdges,
      conflicts: syn.stats.conflicts,
      rejected: batch.totals.rejected,
      droppedById: batch.bySource.reduce((n, s) => n + s.dedup.droppedById, 0),
      droppedByName: batch.bySource.reduce((n, s) => n + s.dedup.droppedByName, 0),
      pagesFetched: batch.bySource.reduce((n, s) => n + s.pagesFetched, 0),
      checkpointCount: this.checkpoints.list().length,
      cacheEntries: this.cache.size(),
      liveClaimAny: batch.anyLiveClaim,
      synonymStats: syn.stats,
      notes: [
        'Actual import counts for this run only',
        'Not a claim of global COL/GBIF/PBDB completeness',
        forceFixture
          ? 'Run used FIXTURE_TEST_ONLY path — liveClaim false for all sources'
          : 'Live only where LIVE_PUBLIC and queried',
      ],
    });

    return {
      batch,
      index,
      actualCounts,
      sourceStates,
      synonymEdges: syn.stats.synonymEdges,
      conflicts: syn.stats.conflicts,
    };
  }
}
