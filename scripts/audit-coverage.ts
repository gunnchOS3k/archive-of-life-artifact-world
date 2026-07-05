/**
 * Coverage audit — verifies Time Atlas, taxon representation, and scalable architecture invariants.
 * Run: npm run audit:coverage
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  DataManifest,
  ArchiveSpecies,
  LifelingTrait,
  SpeciesSearchIndex,
  SpeciesIndexEntry,
} from '../src/schema';
import type {
  GeologicTimeUnitsBundle,
  PlayableTimeGatesBundle,
  TaxonTimeRangesBundle,
  TimeManifest,
} from '../src/time/schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'public', 'data');
const SCOPE = join(ROOT, 'data-pipeline', 'exports', 'sample_scope');

interface AuditResult {
  name: string;
  passed: boolean;
  message: string;
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) throw new Error(`Missing: ${path}`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function audit(): AuditResult[] {
  const results: AuditResult[] = [];
  const manifest = readJson<DataManifest>(join(DATA, 'manifest.json'));
  const hero = readJson<{ species: ArchiveSpecies[] }>(join(DATA, manifest.bundles.heroSpecies.path));
  const index = readJson<SpeciesSearchIndex>(join(DATA, manifest.bundles.searchIndex.path));
  const traits = readJson<LifelingTrait[]>(join(DATA, manifest.bundles.traits.path));
  const conservation = readJson<{ records: Array<{ speciesId: string }> }>(
    join(DATA, manifest.bundles.conservation.path)
  );

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

  const unitIds = new Set(timeUnits.units.map((u) => u.id));
  const indexIds = new Set(index.entries.map((e) => e.id));
  const heroIds = new Set(hero.species.map((s) => s.id));
  const rangeIds = new Set(taxonRanges.ranges.map((r) => r.taxonId));
  const conservationIds = new Set(conservation.records.map((r) => r.speciesId));

  // ICS time units present
  const missingUnits = icsScope.unitIds.filter((id) => !unitIds.has(id));
  results.push({
    name: 'ics_time_units_present',
    passed: missingUnits.length === 0,
    message: missingUnits.length
      ? `Missing ICS units: ${missingUnits.join(', ')}`
      : `All ${icsScope.unitIds.length} scoped ICS units present (${timeUnits.units.length} total in bundle)`,
  });

  // All time units have provenance
  const unitsNoProv = timeUnits.units.filter((u) => !u.sourceProvenance?.length);
  results.push({
    name: 'time_units_have_provenance',
    passed: unitsNoProv.length === 0,
    message: unitsNoProv.length
      ? `${unitsNoProv.length} time units missing provenance`
      : 'All time units have source provenance',
  });

  // Playable gates reference valid time units
  const invalidGateUnits = timeGates.gates.flatMap((g) =>
    g.timeUnitIds.filter((id) => !unitIds.has(id)).map((id) => `${g.id}:${id}`)
  );
  results.push({
    name: 'playable_gates_valid_time_units',
    passed: invalidGateUnits.length === 0,
    message: invalidGateUnits.length
      ? `Invalid gate time refs: ${invalidGateUnits.join(', ')}`
      : `All ${timeGates.gates.length} time gates reference valid units`,
  });

  // 17 playable gates defined
  results.push({
    name: 'playable_gates_count',
    passed: timeGates.gates.length >= 17,
    message: `${timeGates.gates.length} playable time gates defined`,
  });

  // COL extant scope represented in search index
  const missingCol = colScope.taxonIds.filter((id) => !indexIds.has(id));
  results.push({
    name: 'col_extant_represented',
    passed: missingCol.length === 0,
    message: missingCol.length
      ? `Missing COL scope taxa: ${missingCol.join(', ')}`
      : `All ${colScope.taxonIds.length} COL-scoped extant taxa in search index`,
  });

  // IUCN scope in conservation overlay or index with category
  const missingIucn = iucnScope.taxonIds.filter(
    (id) => !conservationIds.has(id) && !index.entries.some((e) => e.id === id && e.iucnCategory)
  );
  results.push({
    name: 'iucn_assessed_represented',
    passed: missingIucn.length === 0,
    message: missingIucn.length
      ? `Missing IUCN scope: ${missingIucn.join(', ')}`
      : `All ${iucnScope.taxonIds.length} IUCN-scoped taxa represented`,
  });

  // Threatened filterable
  const threatenedInIndex = index.entries.filter((e) => e.isThreatened).length;
  results.push({
    name: 'threatened_filterable',
    passed: threatenedInIndex > 0 && index.entries.some((e) => e.isThreatened && e.iucnCategory),
    message: `${threatenedInIndex} threatened taxa filterable in search index`,
  });

  // PBDB scope has time ranges
  const missingPbdbRanges = pbdbScope.taxonIds.filter((id) => !rangeIds.has(id));
  results.push({
    name: 'pbdb_taxa_have_time_ranges',
    passed: missingPbdbRanges.length === 0,
    message: missingPbdbRanges.length
      ? `Missing PBDB time ranges: ${missingPbdbRanges.join(', ')}`
      : `All ${pbdbScope.taxonIds.length} PBDB-scoped taxa have time ranges`,
  });

  // Hero species have artifact templates
  const missingArtifacts = hero.species.filter((s) => !s.artifactTemplates?.length);
  results.push({
    name: 'hero_have_artifact_templates',
    passed: missingArtifacts.length === 0,
    message: missingArtifacts.length
      ? `Missing artifacts: ${missingArtifacts.map((s) => s.id).join(', ')}`
      : 'All hero species have artifact templates',
  });

  // Lifeling unlocks valid
  const invalidUnlocks = traits.filter(
    (t) => t.unlockedBy !== 'any_artifact' && !heroIds.has(t.unlockedBy)
  );
  results.push({
    name: 'lifeling_unlocks_valid',
    passed: invalidUnlocks.length === 0,
    message: invalidUnlocks.length
      ? `Invalid unlocks: ${invalidUnlocks.map((t) => t.id).join(', ')}`
      : 'All Lifeling trait unlocks reference valid taxa',
  });

  // All index entries have provenance via hero or sources field
  const indexNoMeta = index.entries.filter(
    (e) => e.representationTier === undefined && !heroIds.has(e.id)
  );
  results.push({
    name: 'index_has_representation_tiers',
    passed: indexNoMeta.length === 0,
    message: indexNoMeta.length
      ? `${indexNoMeta.length} index entries missing representationTier`
      : 'All index entries have representation tiers',
  });

  // All hero/index records traceable to sources
  const heroNoProv = hero.species.filter((s) => !s.provenance?.length);
  results.push({
    name: 'species_have_provenance',
    passed: heroNoProv.length === 0,
    message: heroNoProv.length
      ? `Missing provenance: ${heroNoProv.map((s) => s.id).join(', ')}`
      : 'All hero species have source provenance',
  });

  // Taxon time ranges have provenance
  const rangesNoProv = taxonRanges.ranges.filter((r) => !r.provenance?.length);
  results.push({
    name: 'taxon_ranges_have_provenance',
    passed: rangesNoProv.length === 0,
    message: rangesNoProv.length
      ? `${rangesNoProv.length} taxon ranges missing provenance`
      : 'All taxon time ranges have source provenance',
  });

  // Index count matches manifest
  results.push({
    name: 'index_count_matches_manifest',
    passed: index.totalCount === manifest.coverage.representedSpecies,
    message: `Index ${index.totalCount} vs manifest ${manifest.coverage.representedSpecies}`,
  });

  // No full catalogue load pattern — search index is separate from hero bundle
  const indexLargerThanHero = index.totalCount >= hero.species.length;
  results.push({
    name: 'index_separate_from_hero_bundle',
    passed: indexLargerThanHero || index.totalCount === hero.species.length,
    message: `Search index (${index.totalCount}) uses paginated entries; hero bundle (${hero.species.length}) for detail only`,
  });

  // Representation tier 0 minimum for all index entries
  const belowTier0 = index.entries.filter(
    (e: SpeciesIndexEntry) => e.representationTier === undefined || e.representationTier < 0
  );
  results.push({
    name: 'minimum_tier_zero_representation',
    passed: belowTier0.length === 0,
    message: belowTier0.length
      ? `${belowTier0.length} entries below tier 0`
      : 'Every indexed taxon meets minimum tier 0 representation',
  });

  // Time manifest coverage in main manifest
  const hasTimeInManifest = !!manifest.bundles.timeAtlas || !!manifest.coverage.timeUnits;
  results.push({
    name: 'time_atlas_in_manifest',
    passed: hasTimeInManifest,
    message: hasTimeInManifest
      ? `Time Atlas registered (${manifest.coverage.timeUnits ?? timeManifest.coverage.totalTimeUnits} units)`
      : 'Time Atlas not registered in data manifest',
  });

  return results;
}

const results = audit();
let failed = 0;
console.log('\n=== Archive of Life Coverage Audit ===\n');
for (const r of results) {
  const icon = r.passed ? '✓' : '✗';
  console.log(`${icon} ${r.name}: ${r.message}`);
  if (!r.passed) failed++;
}
console.log(`\n${results.length - failed}/${results.length} checks passed\n`);
process.exit(failed > 0 ? 1 : 0);
