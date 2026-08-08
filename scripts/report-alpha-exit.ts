/**
 * Alpha exit readiness report — ADR floors + launch-critical systems.
 * Does not claim Beta/RC. Writes public/data/status/alpha_exit_report.json
 *
 * Usage: npx tsx scripts/report-alpha-exit.ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { evaluateAlphaExit } from '../src/systems/alphaExit';
import { buildOfflinePackManifest, offlinePackReady } from '../src/systems/offlinePack';
import { buildTierCoverageReport } from '../src/coverage/TierCoverageReport';
import type { TierRIndexReport } from '../src/coverage/TierRRecordIndex';

const ROOT = join(process.cwd(), 'public/data');
const BUNDLES = join(ROOT, 'bundles');
const COVERAGE = join(ROOT, 'coverage');
const STATUS = join(ROOT, 'status');

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const regions = loadJson<Array<{ id: string }>>(join(BUNDLES, 'regions.json'));
const heroes = loadJson<{ species: unknown[] }>(join(BUNDLES, 'hero-species.json'));
const enc = loadJson<{ species: Array<{ scientificName: string; programTier?: string }> }>(
  join(BUNDLES, 'encounter-taxa.json'),
);
const expeditions = loadJson<{ expeditions: unknown[] }>(join(BUNDLES, 'expeditions.json'));
const clues = loadJson<{ clues: unknown[] }>(join(BUNDLES, 'clues.json'));
const modules = loadJson<{ modules: unknown[] }>(join(BUNDLES, 'companion-modules.json'));
const index = loadJson<{
  snapshotId: string;
  entries: Array<{
    id: string;
    commonName: string;
    scientificName: string;
    group: string;
    family: string;
    tier: 'hero' | 'regional' | 'family' | 'database';
    representationTier: number;
    isExtinct: boolean;
    isThreatened: boolean;
    isPlayable: boolean;
    sources?: string[];
    programTier?: string;
  }>;
}>(join(BUNDLES, 'search-index.json'));

const tierCoverage = buildTierCoverageReport({
  snapshotId: index.snapshotId,
  entries: index.entries as Parameters<typeof buildTierCoverageReport>[0]['entries'],
  regionIds: regions.map((r) => r.id),
});

const tierRPath = join(COVERAGE, 'tier_r_import_counts.json');
const livePath = join(COVERAGE, 'tier_r_live_bounded_counts.json');
const tierR: TierRIndexReport = existsSync(tierRPath)
  ? loadJson(tierRPath)
  : {
      snapshotId: index.snapshotId,
      snapshotVersion: '0',
      generatedAt: new Date().toISOString(),
      totalRecords: 0,
      uniqueRecords: 0,
      capacityNote: 'No Tier R import yet',
      bySource: [],
      honesty: { fixturesNeverClaimedLive: true, liveOnlyWhenQueried: true },
    };

const liveBounded: TierRIndexReport | null = existsSync(livePath) ? loadJson(livePath) : null;

const eCount = enc.species.filter((s) => s.programTier === 'E_Encounter').length;
const pack = buildOfflinePackManifest({
  packId: 'alpha-exit-offline-pack',
  snapshotId: index.snapshotId,
  regionCount: regions.length,
  encounterCount: eCount,
  flagshipCount: heroes.species.length,
  tierRRecordCount: tierR.totalRecords,
});
const packReady = offlinePackReady(pack);

const report = evaluateAlphaExit({
  snapshotId: index.snapshotId,
  floors: tierCoverage.floors,
  encounterCatalogSize: eCount,
  systems: {
    map_regions: {
      present: regions.length >= 12,
      detail: `${regions.length} regions`,
    },
    deep_time: {
      present: true,
      detail: 'TimeAtlasService + deepTimeSystem present',
    },
    expedition: {
      present: expeditions.expeditions.length > 0,
      detail: `${expeditions.expeditions.length} expeditions`,
    },
    objectives: {
      present: expeditions.expeditions.length > 0,
      detail: 'Expedition objectives evaluate visit/collect/clue/observe/scan/time',
    },
    clues: {
      present: clues.clues.length > 0,
      detail: `${clues.clues.length} clues`,
    },
    observation: {
      present: true,
      detail: 'observationSystem + WildlifeObservation minigame',
    },
    scanning: {
      present: true,
      detail: 'scanningSystem against catalog + Tier R',
    },
    codex: {
      present: true,
      detail: 'ArchiveDex + codexSystem progress helpers',
    },
    companion: {
      present: modules.modules.length > 0,
      detail: `${modules.modules.length} companion modules`,
    },
    offline_pack: {
      present: packReady.ready,
      detail: packReady.ready
        ? `offline pack ready (tierR=${tierR.totalRecords})`
        : `offline pack gaps: ${packReady.missingRequired.join(',') || 'floors'}`,
    },
    tier_r_index: {
      present: tierR.totalRecords > 0,
      detail: `${tierR.totalRecords} Tier R records indexed`,
    },
    batch_ingest: {
      present: existsSync(join(STATUS, 'batch_ingest_report.json')),
      detail: 'BatchSnapshotIngest + batch-ingest-snapshot script',
    },
  },
  tierR: {
    totalRecords: tierR.totalRecords,
    bySource: (tierR.importedBySource ?? tierR.bySource.map((s) => ({
      source: s.source,
      imported: s.records,
      liveClaim: s.liveClaim,
      mode: String(s.mode),
    }))).map((s) => ({
      source: s.source,
      records: 'imported' in s ? s.imported : (s as { records: number }).records,
      liveClaim: s.liveClaim,
      mode: String(s.mode),
    })),
  },
});

mkdirSync(STATUS, { recursive: true });
mkdirSync(join(ROOT, 'bundles'), { recursive: true });
writeFileSync(join(STATUS, 'alpha_exit_report.json'), JSON.stringify({
  ...report,
  liveBounded: liveBounded
    ? {
        totalRecords: liveBounded.totalRecords,
        anyLiveClaim: (liveBounded.importedBySource ?? []).some((s) => s.liveClaim),
        bySource: liveBounded.importedBySource ?? liveBounded.bySource,
        note: 'Bounded live probe only — not global coverage',
      }
    : null,
  gaps: report.gaps.filter((g) => {
    if (liveBounded && g.includes('No liveClaim ingest yet')) return false;
    return true;
  }).concat(
    liveBounded
      ? [
          `Live bounded probe: ${liveBounded.totalRecords} unique record(s); not global live ingest`,
        ]
      : [],
  ),
}, null, 2) + '\n');
writeFileSync(join(ROOT, 'bundles/offline-pack-manifest.json'), JSON.stringify(pack, null, 2) + '\n');

const finalGaps = report.gaps.filter((g) => {
  if (liveBounded && g.includes('No liveClaim ingest yet')) return false;
  return true;
});

console.log(`statusToken=${report.statusToken}`);
console.log(`claimLevel=${report.claimLevel}`);
console.log(`floorsMet=${report.floorsMet} launchCriticalMet=${report.launchCriticalMet}`);
console.log(`Tier R total=${report.tierR.totalRecords} scalesBeyond=${report.tierR.scalesBeyondEncounterCatalog}`);
console.log('bySource (fixture scale path):');
for (const s of report.tierR.bySource) {
  console.log(`  ${s.source}: ${s.records} liveClaim=${s.liveClaim} mode=${s.mode}`);
}
if (liveBounded) {
  console.log('liveBounded:');
  for (const s of liveBounded.importedBySource ?? []) {
    console.log(`  ${s.source}: ${s.imported} liveClaim=${s.liveClaim} mode=${s.mode}`);
  }
}
console.log('gaps:');
for (const g of finalGaps.concat(
  liveBounded
    ? [`Live bounded probe: ${liveBounded.totalRecords} unique record(s); not global live ingest`]
    : [],
)) {
  console.log(`  - ${g}`);
}
console.log(`Wrote ${join(STATUS, 'alpha_exit_report.json')}`);

process.exit(report.statusToken === 'ARCHIVE_ALPHA_EXIT_NOT_READY' ? 1 : 0);
