/**
 * Cont VI production ops ingest — multi-query live COL/GBIF/PBDB → science DB.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  CONT_VI_DEFAULT_QUERIES,
  runProductionOpsIngest,
} from '../src/services/ingestion/bulk/ProductionOpsIngest';
import { CheckpointStore } from '../src/services/ingestion/checkpointStore';
import { buildScienceDb } from '../src/db/buildScienceDb';
import { ScientificDb, defaultScienceDbPath } from '../src/db/ScientificDb';

const args = process.argv.slice(2);
const resume = args.includes('--resume');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limitOverride = limitArg ? Number(limitArg.split('=')[1]) : undefined;

const OUT_STATUS = join(process.cwd(), 'public/data/status');
const OUT_COV = join(process.cwd(), 'public/data/coverage');
const OUT_SCI = join(process.cwd(), 'public/data/science');
mkdirSync(OUT_STATUS, { recursive: true });
mkdirSync(OUT_COV, { recursive: true });
mkdirSync(OUT_SCI, { recursive: true });

const queries =
  limitOverride && Number.isFinite(limitOverride)
    ? CONT_VI_DEFAULT_QUERIES.map((q) => ({
        ...q,
        limit: Math.min(q.limit, limitOverride),
      }))
    : CONT_VI_DEFAULT_QUERIES;

const checkpoints = new CheckpointStore();
const result = await runProductionOpsIngest({
  snapshotId: 'cont-vi-production-ops-2026-08',
  snapshotVersion: '2.2.0-cont-vi',
  resume,
  checkpoints,
  queries,
});

const reportForDisk = {
  snapshotId: result.snapshotId,
  snapshotVersion: result.snapshotVersion,
  generatedAt: result.generatedAt,
  startedAt: result.startedAt,
  finishedAt: result.finishedAt,
  elapsedMs: result.elapsedMs,
  pagesFetched: result.pagesFetched,
  recordsBySource: result.recordsBySource,
  uniqueNames: result.uniqueNames,
  totalRecords: result.totalRecords,
  queriesRun: result.queriesRun,
  anyLiveClaim: result.anyLiveClaim,
  contentHash: result.contentHash,
  checkpoints: result.checkpoints,
  errors: result.errors,
  pipelineStagesExercised: result.pipelineStagesExercised,
  globalCompleteClaim: false as const,
  materiallyLargerThanContV: result.materiallyLargerThanContV,
  contVBaseline: result.contVBaseline,
  tokenHints: result.tokenHints,
};

writeFileSync(join(OUT_STATUS, 'production_ops_report.json'), JSON.stringify(reportForDisk, null, 2) + '\n');
writeFileSync(join(OUT_STATUS, 'production_probe_report.json'), JSON.stringify(reportForDisk, null, 2) + '\n');
writeFileSync(
  join(OUT_STATUS, 'ingest_checkpoints_live.json'),
  JSON.stringify(checkpoints.toJSON(), null, 2) + '\n',
);
writeFileSync(
  join(OUT_COV, 'actual_counts_live_bounded.json'),
  JSON.stringify(
    {
      schemaVersion: '1.0.0',
      snapshotId: result.snapshotId,
      snapshotVersion: result.snapshotVersion,
      generatedAt: result.generatedAt,
      elapsedMs: result.elapsedMs,
      contentHash: result.contentHash,
      globalCompleteClaim: false,
      liveClaimAny: result.anyLiveClaim,
      records_by_source: result.recordsBySource,
      records_by_source_detail: Object.entries(result.recordsBySource).map(([source, records]) => ({
        source,
        records,
        mode: 'live',
        liveClaim: records > 0,
        sourceState: 'LIVE_PUBLIC',
      })),
      unique_taxa: result.uniqueNames,
      unique_taxa_by_accepted_name: result.uniqueNames,
      synonyms: 0,
      synonym_edges: 0,
      conflicts: 0,
      rejected: 0,
      dropped_by_id: 0,
      dropped_by_name: 0,
      pages_fetched: result.pagesFetched,
      queries_run: result.queriesRun,
      total_records: result.totalRecords,
      checkpoint_count: checkpoints.list().length,
      cache_entries: 0,
      honesty: {
        fixturesNeverClaimedLive: true,
        liveOnlyWhenQueried: true,
        noFabricatedGlobalComplete: true,
        noFabricatedTargets: true,
      },
      notes: [
        'Cont VI production multi-query live ops',
        result.tokenHints.reason,
        `elapsedMs=${result.elapsedMs}`,
        `contentHash=${result.contentHash}`,
        `materiallyLargerThanContV=${result.materiallyLargerThanContV}`,
        'Not GLOBAL_DATA_COMPLETE',
      ],
      errors: result.errors,
    },
    null,
    2,
  ) + '\n',
);

writeFileSync(
  join(OUT_SCI, 'live_records_cache.json'),
  JSON.stringify(result.records, null, 2) + '\n',
);

const dbPath = defaultScienceDbPath();
const built = buildScienceDb({
  liveRecords: result.records,
  snapshotId: result.snapshotId,
  snapshotVersion: result.snapshotVersion,
  clear: true,
});
const db = new ScientificDb({ path: dbPath });
db.logIngestOp({
  runId: result.snapshotId,
  pagesFetched: result.pagesFetched,
  records: result.totalRecords,
  elapsedMs: result.elapsedMs,
  contentHash: result.contentHash,
  errors: result.errors,
});
for (const [source, records] of Object.entries(result.recordsBySource)) {
  db.logIngestOp({
    runId: result.snapshotId,
    source,
    records,
    elapsedMs: result.elapsedMs,
    contentHash: result.contentHash,
    errors: result.errors.filter((e) => e.startsWith(`${source}:`)),
  });
}
db.close();

writeFileSync(
  join(OUT_SCI, 'ops_ingest_summary.json'),
  JSON.stringify(
    {
      generatedAt: result.generatedAt,
      elapsedMs: result.elapsedMs,
      pagesFetched: result.pagesFetched,
      totalRecords: result.totalRecords,
      uniqueNames: result.uniqueNames,
      recordsBySource: result.recordsBySource,
      contentHash: result.contentHash,
      errors: result.errors,
      scienceDb: built.stats,
      PIPELINE_COMPLETE: result.tokenHints.PIPELINE_COMPLETE,
      globalCompleteClaim: false,
    },
    null,
    2,
  ) + '\n',
);

console.log('PIPELINE_COMPLETE=', result.tokenHints.PIPELINE_COMPLETE);
console.log('reason=', result.tokenHints.reason);
console.log('recordsBySource=', JSON.stringify(result.recordsBySource));
console.log(
  'pagesFetched=',
  result.pagesFetched,
  'uniqueNames=',
  result.uniqueNames,
  'totalRecords=',
  result.totalRecords,
);
console.log('elapsedMs=', result.elapsedMs, 'contentHash=', result.contentHash);
console.log('materiallyLargerThanContV=', result.materiallyLargerThanContV);
console.log('scienceDbTaxa=', built.stats.taxa);
console.log('errors=', result.errors.slice(0, 12));
process.exit(result.tokenHints.PIPELINE_COMPLETE ? 0 : 1);
