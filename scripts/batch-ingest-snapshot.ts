/**
 * Batch/snapshot ingest CLI — fixture by default; optional --live for public APIs.
 * Production path: source states, synonyms, cache, checkpoints, actual counts.
 * Never claims live for fixtures. Never calls live for FIXTURE_TEST_ONLY.
 *
 * Usage:
 *   npx tsx scripts/batch-ingest-snapshot.ts
 *   npx tsx scripts/batch-ingest-snapshot.ts --live --limit=20
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { countsBySourceHonest } from '../src/services/ingestion/BatchSnapshotIngest';
import { CheckpointStore } from '../src/services/ingestion/checkpointStore';
import { IngestCache } from '../src/services/ingestion/ingestCache';
import { ProductionIngestOrchestrator } from '../src/services/ingestion/ProductionIngestOrchestrator';
import { DEFAULT_SOURCE_REGISTRY } from '../src/services/ingestion/sourceRegistry';
import type { IngestionSource } from '../src/services/ingestion/types';

const ROOT = process.cwd();
const FIX = join(ROOT, 'public/data/fixtures/ingest');
const OUT_COV = join(ROOT, 'public/data/coverage');
const OUT_STATUS = join(ROOT, 'public/data/status');
const OUT_RC = join(ROOT, 'public/data/rc');

const args = process.argv.slice(2);
const wantLive = args.includes('--live');
const resume = args.includes('--resume');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : wantLive ? 25 : 10_000;

const CHECKPOINT_PATH = join(
  OUT_STATUS,
  wantLive ? 'ingest_checkpoints_live.json' : 'ingest_checkpoints.json',
);
const COUNTS_PATH = join(
  OUT_COV,
  wantLive ? 'tier_r_live_bounded_counts.json' : 'tier_r_import_counts.json',
);
const INDEX_PATH = join(OUT_COV, wantLive ? 'tier_r_live_bounded_index.json' : 'tier_r_index.json');
const BATCH_REPORT_PATH = join(
  OUT_STATUS,
  wantLive ? 'batch_ingest_live_report.json' : 'batch_ingest_report.json',
);
const ACTUAL_COUNTS_PATH = join(
  OUT_COV,
  wantLive ? 'actual_counts_live_bounded.json' : 'actual_counts.json',
);
const SOURCE_STATES_PATH = join(OUT_STATUS, 'source_states.json');

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const colFix = loadJson<{
  entries: Array<Record<string, unknown>>;
  liveClaim?: boolean;
  sourceState?: string;
}>(join(FIX, 'col_batch.json'));
const gbifFix = loadJson<{
  records: Array<Record<string, unknown>>;
  liveClaim?: boolean;
  sourceState?: string;
}>(join(FIX, 'gbif_batch.json'));
const pbdbFix = loadJson<{
  records: Array<Record<string, unknown>>;
  liveClaim?: boolean;
  sourceState?: string;
}>(join(FIX, 'pbdb_batch.json'));

if (colFix.liveClaim || gbifFix.liveClaim || pbdbFix.liveClaim) {
  throw new Error('Fixture files must not set liveClaim=true');
}
for (const f of [colFix, gbifFix, pbdbFix]) {
  if (f.sourceState && f.sourceState !== 'FIXTURE_TEST_ONLY') {
    throw new Error(`Fixture sourceState must be FIXTURE_TEST_ONLY, got ${f.sourceState}`);
  }
}

const snapshotId = wantLive
  ? 'beta-rc-live-bounded-2026-08'
  : 'beta-rc-fixture-tier-r-2026-08';
const snapshotVersion = '2.0.0';

const checkpoints = new CheckpointStore();
if (resume && existsSync(CHECKPOINT_PATH)) {
  checkpoints.loadJSON(JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf8')));
}

const cache = new IngestCache();
const orch = new ProductionIngestOrchestrator({
  cache,
  checkpoints,
  registry: DEFAULT_SOURCE_REGISTRY,
});

const queries: Partial<
  Record<IngestionSource, { limit: number; useFixture?: boolean; scientificName?: string }>
> = wantLive
  ? {
      col: { scientificName: 'Ursus', limit },
      gbif: { scientificName: 'Ursus', limit },
      pbdb: { scientificName: 'Tyrannosaurus', limit },
    }
  : {
      col: { limit, useFixture: true },
      gbif: { limit, useFixture: true },
      pbdb: { limit, useFixture: true },
    };

const result = await orch.run({
  snapshotId,
  snapshotVersion,
  forceFixture: !wantLive,
  resume,
  queries,
  fixtures: {
    col: { entries: colFix.entries },
    gbif: { records: gbifFix.records },
    pbdb: { records: pbdbFix.records },
  },
});

const honestSourceCounts = countsBySourceHonest(result.batch);
const report = result.index.report(
  honestSourceCounts.map((s) => ({
    source: s.source,
    imported: s.imported,
    mode: s.mode,
    liveClaim: s.liveClaim,
  })),
);

mkdirSync(OUT_COV, { recursive: true });
mkdirSync(OUT_STATUS, { recursive: true });
mkdirSync(OUT_RC, { recursive: true });

writeFileSync(INDEX_PATH, JSON.stringify(result.index.toJSON(), null, 2) + '\n');
writeFileSync(COUNTS_PATH, JSON.stringify(report, null, 2) + '\n');
writeFileSync(ACTUAL_COUNTS_PATH, JSON.stringify(result.actualCounts, null, 2) + '\n');
writeFileSync(
  SOURCE_STATES_PATH,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      states: DEFAULT_SOURCE_REGISTRY.map((e) => ({
        id: e.id,
        state: e.state,
        ingestPermitted: e.ingestPermitted,
        fixtureOnly: e.fixtureOnly,
        licenseNotes: e.licenseNotes,
        notes: e.notes,
      })),
      runSourceStates: result.sourceStates,
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(
  BATCH_REPORT_PATH,
  JSON.stringify(
    {
      snapshotId,
      snapshotVersion,
      generatedAt: new Date().toISOString(),
      mode: wantLive ? 'live_optional' : 'fixture',
      anyLiveClaim: result.batch.anyLiveClaim,
      totals: result.batch.totals,
      bySource: honestSourceCounts,
      importStats: { added: result.index.size },
      synonyms: result.actualCounts.synonyms,
      synonym_edges: result.actualCounts.synonym_edges,
      conflicts: result.actualCounts.conflicts,
      unique_taxa: result.actualCounts.unique_taxa,
      records_by_source: result.actualCounts.records_by_source,
      checkpoints: checkpoints.toJSON(),
      cacheEntries: cache.size(),
      honesty: {
        fixturesNeverClaimedLive: true,
        liveOnlyWhenQueried: true,
        neverCallFixtureLive: true,
        noFabricatedGlobalComplete: true,
        note: wantLive
          ? 'Bounded live queries only — not global archive coverage'
          : 'Fixture snapshot ingest — liveClaim false for all sources',
      },
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoints.toJSON(), null, 2) + '\n');

console.log(`Mode: ${wantLive ? 'live (bounded)' : 'fixture'}`);
console.log(`Tier R unique index: ${report.uniqueRecords}`);
console.log(`actualCounts unique_taxa=${result.actualCounts.unique_taxa} synonyms=${result.actualCounts.synonyms} conflicts=${result.actualCounts.conflicts}`);
console.log('Imported by source (actual):');
for (const row of honestSourceCounts) {
  console.log(
    `  ${row.source}: ${row.imported} imported | mode=${row.mode} | liveClaim=${row.liveClaim}`,
  );
}
console.log(`anyLiveClaim=${result.batch.anyLiveClaim}`);
console.log(`Wrote ${ACTUAL_COUNTS_PATH}`);
console.log(`Wrote ${BATCH_REPORT_PATH}`);
