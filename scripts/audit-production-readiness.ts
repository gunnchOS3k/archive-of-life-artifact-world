import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ArchiveSpecies } from '../src/schema';
import type { RegionEarthLayersBundle } from '../src/schema/earth';
import type { TemporalEarthMapCatalog } from '../src/schema/temporalMap';
import type { TimeManifest } from '../src/time/schema';
import { DATA, readJson } from './audits/shared';

interface SourceStatus {
  source: string;
  required: boolean;
  imported: boolean;
  verified_record_count: number;
  data_mode?: string | null;
}

interface ProductionCheck {
  name: string;
  passed: boolean;
  message: string;
}

const checks: ProductionCheck[] = [];
const sourceStatus = readJson<{ sources: SourceStatus[] }>(
  join(DATA, 'status', 'source_import_status.json')
);
const incompleteSources = sourceStatus.sources.filter(
  (source) =>
    source.required &&
    (!source.imported || source.verified_record_count <= 0 || source.data_mode !== 'source_verified')
);
checks.push({
  name: 'required_external_sources_verified',
  passed: incompleteSources.length === 0,
  message: incompleteSources.length
    ? `Not source-verified: ${incompleteSources.map((source) => source.source).join(', ')}`
    : 'All required external source imports contain verified records',
});

const timeManifest = readJson<TimeManifest>(join(DATA, 'time', 'time_manifest.json'));
checks.push({
  name: 'chronostratigraphy_not_mock',
  passed: !timeManifest.isMockData,
  message: timeManifest.isMockData
    ? 'Time Atlas still uses the labeled ICS sample snapshot'
    : 'Time Atlas uses an approved chronostratigraphic snapshot',
});

const temporalMaps = readJson<TemporalEarthMapCatalog>(
  join(DATA, 'maps', 'temporal_map_catalog.json')
);
const incompleteMaps = temporalMaps.maps.filter((map) => map.status !== 'source_verified');
checks.push({
  name: 'all_supported_period_maps_verified',
  passed: incompleteMaps.length === 0 && !temporalMaps.isMockData,
  message: incompleteMaps.length
    ? `${incompleteMaps.length}/${temporalMaps.maps.length} supported time gates lack full-Earth source-verified maps`
    : 'Every supported time gate has a full-Earth source-verified map',
});

const nasaManifest = readJson<{ regionLayersPath: string }>(join(DATA, 'earth', 'nasa_manifest.json'));
const nasaRegions = readJson<RegionEarthLayersBundle>(
  join(DATA, 'earth', nasaManifest.regionLayersPath)
);
checks.push({
  name: 'nasa_region_measurements_not_mock',
  passed: !nasaRegions.isMockData,
  message: nasaRegions.isMockData
    ? 'NASA metadata is cached, but displayed regional measurements remain sample fallback values'
    : 'Displayed Earth-system measurements are source-verified',
});

const hero = readJson<{ species: ArchiveSpecies[] }>(join(DATA, 'bundles', 'hero-species.json'));
const speciesWithMockScience = hero.species.filter((species) =>
  species.provenance.some((provenance) => provenance.isMockData || provenance.verificationStatus === 'mock_sample')
);
checks.push({
  name: 'hero_scientific_fields_not_mock',
  passed: speciesWithMockScience.length === 0,
  message: speciesWithMockScience.length
    ? `${speciesWithMockScience.length}/${hero.species.length} hero taxa still include mock scientific provenance`
    : 'Hero taxon scientific fields are source-verified',
});

const blockingReasons = checks.filter((check) => !check.passed).map((check) => check.message);
const report = {
  generatedAt: new Date().toISOString(),
  ready: blockingReasons.length === 0,
  blockingReasons,
  checks,
  verificationCommand: 'npm run audit:production',
};
mkdirSync(join(DATA, 'status'), { recursive: true });
writeFileSync(
  join(DATA, 'status', 'production_readiness_report.json'),
  `${JSON.stringify(report, null, 2)}\n`
);

console.log('\n=== Scientific Production Readiness ===\n');
for (const check of checks) console.log(`${check.passed ? '✓' : '✗'} ${check.name}: ${check.message}`);
console.log(`\nProduction ready: ${report.ready ? 'YES' : 'NO'}`);
console.log('Wrote public/data/status/production_readiness_report.json\n');
process.exit(report.ready ? 0 : 1);
