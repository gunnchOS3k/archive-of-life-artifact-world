/**
 * Batch/snapshot ingest CLI — fixture by default; optional --live for public APIs.
 * Writes Tier R index + honest by-source counts. Never claims live for fixtures.
 *
 * Usage:
 *   npx tsx scripts/batch-ingest-snapshot.ts
 *   npx tsx scripts/batch-ingest-snapshot.ts --live --limit 20
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import {
  BatchSnapshotIngest,
  countsBySourceHonest,
} from '../src/services/ingestion/BatchSnapshotIngest';
import { CheckpointStore } from '../src/services/ingestion/checkpointStore';
import { TierRRecordIndex } from '../src/coverage/TierRRecordIndex';
import type { IngestionSource } from '../src/services/ingestion/types';

const ROOT = process.cwd();
const FIX = join(ROOT, 'public/data/fixtures/ingest');
const OUT_COV = join(ROOT, 'public/data/coverage');
const OUT_STATUS = join(ROOT, 'public/data/status');

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

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const colFix = loadJson<{
  entries: Array<Record<string, unknown>>;
  liveClaim?: boolean;
}>(join(FIX, 'col_batch.json'));
const gbifFix = loadJson<{
  records: Array<Record<string, unknown>>;
  liveClaim?: boolean;
}>(join(FIX, 'gbif_batch.json'));
const pbdbFix = loadJson<{
  records: Array<Record<string, unknown>>;
  liveClaim?: boolean;
}>(join(FIX, 'pbdb_batch.json'));

if (colFix.liveClaim || gbifFix.liveClaim || pbdbFix.liveClaim) {
  throw new Error('Fixture files must not set liveClaim=true');
}

const snapshotId = wantLive ? 'alpha-exit-live-bounded-2026-08' : 'alpha-exit-fixture-tier-r-2026-08';
const snapshotVersion = '1.0.0';

const checkpoints = new CheckpointStore();
if (resume && existsSync(CHECKPOINT_PATH)) {
  checkpoints.loadJSON(JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf8')));
}

const ingest = new BatchSnapshotIngest(
  wantLive
    ? { pagination: { pageSize: 20, maxPages: 3, offsetParam: 'offset' }, timeoutMs: 15_000 }
    : { fixtureOnly: true },
  checkpoints,
);

ingest.setFixtures({
  col: { entries: colFix.entries },
  gbif: { records: gbifFix.records },
  pbdb: { records: pbdbFix.records },
});

const queries: Partial<Record<IngestionSource, { limit: number; useFixture?: boolean; scientificName?: string }>> =
  wantLive
    ? {
        // Bounded live probes — not global coverage
        col: { scientificName: 'Ursus', limit },
        gbif: { scientificName: 'Ursus', limit },
        pbdb: { scientificName: 'Tyrannosaurus', limit },
      }
    : {
        col: { limit, useFixture: true },
        gbif: { limit, useFixture: true },
        pbdb: { limit, useFixture: true },
      };

const result = await ingest.run({
  snapshotId,
  snapshotVersion,
  queries,
  useFixture: !wantLive,
  resume,
  crossSourceNameDedup: true,
  fixtures: {
    col: { entries: colFix.entries },
    gbif: { records: gbifFix.records },
    pbdb: { records: pbdbFix.records },
  },
});

const index = new TierRRecordIndex(snapshotId, snapshotVersion);
const imported = index.importRecords(result.allRecords);
const honestSourceCounts = countsBySourceHonest(result);
const report = index.report(
  honestSourceCounts.map((s) => ({
    source: s.source,
    imported: s.imported,
    mode: s.mode,
    liveClaim: s.liveClaim,
  })),
);

mkdirSync(OUT_COV, { recursive: true });
mkdirSync(OUT_STATUS, { recursive: true });

writeFileSync(INDEX_PATH, JSON.stringify(index.toJSON(), null, 2) + '\n');
writeFileSync(COUNTS_PATH, JSON.stringify(report, null, 2) + '\n');
writeFileSync(
  BATCH_REPORT_PATH,
  JSON.stringify(
    {
      snapshotId,
      snapshotVersion,
      generatedAt: new Date().toISOString(),
      mode: wantLive ? 'live_optional' : 'fixture',
      anyLiveClaim: result.anyLiveClaim,
      totals: result.totals,
      bySource: countsBySourceHonest(result),
      importStats: imported,
      checkpoints: checkpoints.toJSON(),
      honesty: {
        fixturesNeverClaimedLive: true,
        liveOnlyWhenQueried: true,
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
console.log(`Tier R unique index: ${report.uniqueRecords} (added=${imported.added})`);
console.log('Imported by source (actual, pre cross-name dedup):');
for (const row of honestSourceCounts) {
  console.log(
    `  ${row.source}: ${row.imported} imported | mode=${row.mode} | liveClaim=${row.liveClaim}`,
  );
}
console.log('Unique index by source (after name dedup):');
for (const row of report.bySource) {
  console.log(
    `  ${row.source}: ${row.records} records | mode=${row.mode} | liveClaim=${row.liveClaim}`,
  );
}
console.log(`anyLiveClaim=${result.anyLiveClaim}`);
console.log(`Wrote ${COUNTS_PATH}`);
console.log(`Wrote ${BATCH_REPORT_PATH}`);
