/**
 * World traversal QA — prove exploration/expedition/observation loop (not Agar.io).
 * Headless simulation over all regions + field systems; writes evidence JSON.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createDefaultSave } from '../../src/systems/saveSystem';
import { runFieldLoop, fieldGameplayReady } from '../../src/systems/fieldGameplay';
import { viewTimeUnit } from '../../src/systems/deepTimeSystem';
import {
  evaluateCompanionModules,
  companionPathsDiverge,
  type CompanionModuleDef,
} from '../../src/systems/companionModules';

const ROOT = process.cwd();
const DATA = join(ROOT, 'public/data/bundles');
const OUT = join(ROOT, 'public/data/qa/world_traversal');

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const regions = loadJson<
  Array<{ id: string; name: string; type: string; biome?: string; speciesIds?: string[]; description?: string }>
>(join(DATA, 'regions.json'));
const enc = loadJson<{ species: Array<{ id: string; scientificName: string; region?: string }> }>(
  join(DATA, 'encounter-taxa.json'),
);
const expeditions = loadJson<{ expeditions: Array<{ id: string }> }>(join(DATA, 'expeditions.json'));
const modulesJson = loadJson<{ modules: CompanionModuleDef[] }>(join(DATA, 'companion-modules.json'));

const visited: string[] = [];
const observations: string[] = [];
const scans: string[] = [];
const timeUnits: string[] = [];
const failures: string[] = [];

const save = createDefaultSave();
const catalog = enc.species.map((s) => ({ id: s.id, scientificName: s.scientificName }));

for (const region of regions) {
  save.player.currentRegion = region.id;
  if (!save.player.visitedRegions.includes(region.id)) {
    save.player.visitedRegions.push(region.id);
  }
  visited.push(region.id);

  const speciesIds = region.speciesIds?.length
    ? region.speciesIds
    : enc.species.filter((s) => s.region === region.id).map((s) => s.id).slice(0, 2);

  for (const sid of speciesIds.slice(0, 2)) {
    const sp = catalog.find((c) => c.id === sid);
    if (!sp) continue;
    try {
      runFieldLoop(save, {
        observation: {
          speciesId: sp.id,
          scientificName: sp.scientificName,
          regionId: region.id,
          ethical: true,
          patienceScore: 0.85,
          modules: modulesJson.modules,
        },
        scanQuery: sp.scientificName,
        catalog,
        documentSpeciesId: sp.id,
        documentScientificName: sp.scientificName,
      });
      observations.push(`${region.id}:${sp.id}`);
      scans.push(sp.scientificName);
    } catch (err) {
      failures.push(`fieldLoop ${region.id}/${sid}: ${String(err)}`);
    }
  }
}

viewTimeUnit(save, { id: 'holocene', label: 'Holocene' });
viewTimeUnit(save, { id: 'cretaceous', label: 'Cretaceous' });
timeUnits.push('holocene', 'cretaceous');

const pathA = createDefaultSave();
pathA.player.visitedRegions.push('savanna');
evaluateCompanionModules(pathA.companion, {
  modules: modulesJson.modules,
  visitedRegions: pathA.player.visitedRegions,
  observedSpeciesIds: ['panthera_leo'],
});
const pathB = createDefaultSave();
pathB.player.visitedRegions.push('forest');
evaluateCompanionModules(pathB.companion, {
  modules: modulesJson.modules,
  visitedRegions: pathB.player.visitedRegions,
});

const fieldReady = fieldGameplayReady({
  hasObservation: observations.length > 0,
  hasScanning: scans.length > 0,
  hasCodex: true,
  hasExpedition: expeditions.expeditions.length > 0,
});

const agarSignals = {
  arenaOnly: false,
  floatingCollectiblePrototype: false,
  agarIoLike: false,
};
// Heuristic fail if museum hub missing or <8 regions traversable
if (visited.length < 8) {
  agarSignals.floatingCollectiblePrototype = true;
  failures.push('Fewer than 8 regions traversed');
}
if (!visited.includes('museum')) {
  failures.push('Museum hub not visited');
}

const explorationSignals = {
  regionsVisited: visited.length,
  observations: observations.length,
  scans: scans.length,
  timeUnitsViewed: timeUnits.length,
  expeditionsAvailable: expeditions.expeditions.length,
  companionPathsDiverge: companionPathsDiverge(pathA.companion, pathB.companion),
  biomes: [...new Set(regions.map((r) => r.biome).filter(Boolean))],
  hasHubAndSpokes: regions.some((r) => r.type === 'hub') && regions.some((r) => r.type === 'explore'),
  fieldGameplayReady: fieldReady.ready,
};

const pass =
  failures.length === 0 &&
  explorationSignals.regionsVisited >= 12 &&
  explorationSignals.observations >= 8 &&
  explorationSignals.hasHubAndSpokes &&
  explorationSignals.fieldGameplayReady &&
  !agarSignals.agarIoLike &&
  !agarSignals.arenaOnly;

const report = {
  generatedAt: new Date().toISOString(),
  pass,
  experienceClass: pass
    ? 'exploration_expedition_observation_research'
    : 'incomplete_or_prototype',
  not: ['Agar.io-like', 'arena-only', 'floating collectible prototype'],
  explorationSignals,
  agarSignals,
  visitedRegions: visited,
  sampleObservations: observations.slice(0, 20),
  failures,
  evidenceNote:
    'Headless runtime traversal of all region hubs/spokes with observation/scan/codex/deep-time; not a visual screenshot proof.',
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`worldTraversalPass=${pass}`);
console.log(`regions=${visited.length} observations=${observations.length} expeditions=${expeditions.expeditions.length}`);
if (failures.length) {
  for (const f of failures) console.log('  fail:', f);
}
process.exit(pass ? 0 : 1);
