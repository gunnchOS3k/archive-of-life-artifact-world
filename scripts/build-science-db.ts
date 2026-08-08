/**
 * Build durable science DB from launch bundles (+ optional live records file).
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { buildScienceDb } from '../src/db/buildScienceDb';
import type { IngestedTaxonRecord } from '../src/services/ingestion/types';

const root = process.cwd();
mkdirSync(join(root, 'public/data/science'), { recursive: true });

let liveRecords: IngestedTaxonRecord[] = [];
const livePath = join(root, 'public/data/science/live_records_cache.json');
if (existsSync(livePath)) {
  liveRecords = JSON.parse(readFileSync(livePath, 'utf8')) as IngestedTaxonRecord[];
}

const result = buildScienceDb({
  root,
  liveRecords,
  snapshotId: 'cont-vi-science-db-2026-08',
  snapshotVersion: 'science-1.0.0',
  clear: true,
});

writeFileSync(
  join(root, 'public/data/status/science_db_build_report.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      ...result,
      stats: result.stats,
      globalCompleteClaim: false,
    },
    null,
    2,
  ) + '\n',
);

console.log('scienceDbTaxa=', result.stats.taxa);
console.log('synonyms=', result.stats.synonyms, 'provenance=', result.stats.provenance);
console.log('contentHash=', result.contentHash);
console.log('elapsedMs=', result.elapsedMs);
console.log('dbPath=', result.dbPath);
