import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  DataManifest,
  ArchiveSpecies,
  LifelingTrait,
  SpeciesSearchIndex,
  RegionBundle,
} from '../../src/schema';
import type {
  GeologicTimeUnitsBundle,
  PlayableTimeGatesBundle,
  TaxonTimeRangesBundle,
  TimeManifest,
} from '../../src/time/schema';
import type { BiomeRecord, SourceSnapshotRecord } from '../../src/coverage/CoverageTypes';

export interface AuditResult {
  name: string;
  passed: boolean;
  message: string;
  blocking?: boolean;
  category?: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');
export const DATA = join(ROOT, 'public', 'data');
export const COVERAGE = join(DATA, 'coverage');
export const SCOPE = join(ROOT, 'data-pipeline', 'exports', 'sample_scope');

export function readJson<T>(path: string): T {
  if (!existsSync(path)) throw new Error(`Missing: ${path}`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export interface AuditContext {
  manifest: DataManifest;
  hero: { species: ArchiveSpecies[] };
  index: SpeciesSearchIndex;
  traits: LifelingTrait[];
  conservation: { records: Array<{ speciesId: string }> };
  regions: RegionBundle[];
  timeManifest: TimeManifest;
  timeUnits: GeologicTimeUnitsBundle;
  timeGates: PlayableTimeGatesBundle;
  taxonRanges: TaxonTimeRangesBundle;
  icsScope: { unitIds: string[] };
  colScope: { taxonIds: string[] };
  iucnScope: { taxonIds: string[] };
  pbdbScope: { taxonIds: string[] };
  sourceSnapshots: { snapshots: SourceSnapshotRecord[] };
  biomeRegistry: { biomes: BiomeRecord[] };
  placeRegistry: { places: Array<{ id: string; type: string; name: string }> };
}

export function loadAuditContext(): AuditContext {
  const manifest = readJson<DataManifest>(join(DATA, 'manifest.json'));
  const hero = readJson<{ species: ArchiveSpecies[] }>(join(DATA, manifest.bundles.heroSpecies.path));
  const index = readJson<SpeciesSearchIndex>(join(DATA, manifest.bundles.searchIndex.path));
  const traits = readJson<LifelingTrait[]>(join(DATA, manifest.bundles.traits.path));
  const conservation = readJson<{ records: Array<{ speciesId: string }> }>(
    join(DATA, manifest.bundles.conservation.path)
  );
  const regions = readJson<RegionBundle[]>(join(DATA, manifest.bundles.regions.path));
  const timeManifest = readJson<TimeManifest>(join(DATA, 'time', 'time_manifest.json'));
  const timeUnits = readJson<GeologicTimeUnitsBundle>(
    join(DATA, timeManifest.bundles.geologicTimeUnits.path)
  );
  const timeGates = readJson<PlayableTimeGatesBundle>(
    join(DATA, timeManifest.bundles.playableTimeGates.path)
  );
  const taxonRanges = readJson<TaxonTimeRangesBundle>(
    join(DATA, timeManifest.bundles.taxonTimeRanges.path)
  );
  const icsScope = readJson<{ unitIds: string[] }>(join(SCOPE, 'ics_time_scale_snapshot.json'));
  const colScope = readJson<{ taxonIds: string[] }>(join(SCOPE, 'col_extant_scope.json'));
  const iucnScope = readJson<{ taxonIds: string[] }>(join(SCOPE, 'iucn_scope.json'));
  const pbdbScope = readJson<{ taxonIds: string[] }>(join(SCOPE, 'pbdb_scope.json'));
  const sourceSnapshots = readJson<{ snapshots: SourceSnapshotRecord[] }>(
    join(COVERAGE, 'source_snapshots.json')
  );
  const biomeRegistry = readJson<{ biomes: BiomeRecord[] }>(join(COVERAGE, 'biome_registry.json'));
  const placeRegistry = readJson<{ places: Array<{ id: string; type: string; name: string }> }>(
    join(COVERAGE, 'place_registry.json')
  );

  return {
    manifest,
    hero,
    index,
    traits,
    conservation,
    regions,
    timeManifest,
    timeUnits,
    timeGates,
    taxonRanges,
    icsScope,
    colScope,
    iucnScope,
    pbdbScope,
    sourceSnapshots,
    biomeRegistry,
    placeRegistry,
  };
}

export function printResults(results: AuditResult[], title: string): number {
  let failed = 0;
  console.log(`\n=== ${title} ===\n`);
  for (const r of results) {
    const icon = r.passed ? '✓' : '✗';
    const block = r.blocking && !r.passed ? ' [BLOCKING]' : '';
    console.log(`${icon} ${r.name}: ${r.message}${block}`);
    if (!r.passed) failed++;
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed\n`);
  return failed;
}
