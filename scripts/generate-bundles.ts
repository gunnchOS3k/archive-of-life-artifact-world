/**
 * Transforms legacy hand-authored JSON into normalized production-shaped bundles.
 * Run: npm run generate:bundles
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ArchiveSpecies, SpeciesIndexEntry, DataManifest } from '../src/schema';
import { isThreatened, isExtinctCategory } from '../src/schema/conservation';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LEGACY = join(ROOT, 'data');
const OUT = join(ROOT, 'public', 'data', 'bundles');

interface LegacySpecies {
  id: string;
  commonName: string;
  scientificName: string;
  rank: string;
  group: string;
  family: string;
  timeRange: string;
  habitats: string[];
  continents: string[];
  diet: string;
  activity: string;
  size: string;
  behavior: string;
  artifactTypes: string[];
  conservationStatus: string;
  learningTopics: string[];
  questType: string;
  dangerLevel: number;
  ethicalInteraction: string;
  funFacts: string[];
  whyItMatters: string;
  region: string;
  fossilLocations?: string[];
  livingRelatives?: string[];
  paleoenvironment?: string;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function mockProvenance(speciesId: string, isExtinct: boolean) {
  const now = new Date().toISOString();
  return [
    {
      source: 'game_authored' as const,
      sourceVersion: 'mvp-1.0',
      sourceRecordId: speciesId,
      license: 'GAME-ORIGINAL' as const,
      citation: 'Archive of Life: Artifact World — MVP authored content',
      citationRequired: false,
      retrievedAt: now,
      lastUpdated: now,
      isMockData: true,
    },
    {
      source: (isExtinct ? 'paleobiodb' : 'catalogue_of_life') as 'paleobiodb' | 'catalogue_of_life',
      sourceVersion: 'mock-sample-2026-07',
      sourceRecordId: `MOCK-${speciesId}`,
      catalogueOfLifeId: isExtinct ? undefined : `MOCK-COL-${speciesId}`,
      paleobiodbTaxonNo: isExtinct ? Math.floor(Math.random() * 900000) : undefined,
      license: 'MOCK-SAMPLE' as const,
      citation: 'MOCK SAMPLE — not sourced from live API',
      citationRequired: true,
      retrievedAt: now,
      lastUpdated: now,
      isMockData: true,
    },
  ];
}

function toArchiveSpecies(legacy: LegacySpecies): ArchiveSpecies {
  const isExtinct = legacy.conservationStatus === 'Extinct';

  return {
    id: legacy.id,
    commonName: legacy.commonName,
    scientificName: legacy.scientificName,
    group: legacy.group,
    tier: 'hero',
    taxonomy: {
      family: legacy.family,
      rank: legacy.rank as ArchiveSpecies['taxonomy']['rank'],
      acceptedName: legacy.scientificName,
      catalogueOfLifeId: `MOCK-COL-${legacy.id}`,
    },
    conservation: {
      iucnCategory: legacy.conservationStatus as never,
      assessed: legacy.conservationStatus !== 'Not Evaluated',
      sourceVersion: 'mock-iucn-2026-07',
      lastUpdated: '2026-07-02',
      iucnTaxonId: Math.floor(Math.random() * 100000),
    },
    distribution: {
      continents: legacy.continents,
      habitats: legacy.habitats,
      sourceVersion: 'mock-gbif-2026-07',
      lastUpdated: '2026-07-02',
      gbifTaxonKey: Math.floor(Math.random() * 10000000),
      occurrenceSummaries: legacy.continents.slice(0, 1).map((c) => ({
        region: c,
        occurrenceCount: Math.floor(Math.random() * 5000) + 100,
      })),
    },
    fossil: isExtinct
      ? {
          timeRange: legacy.timeRange,
          fossilLocations: legacy.fossilLocations ?? [],
          paleoenvironment: legacy.paleoenvironment,
          livingRelatives: legacy.livingRelatives,
          paleobiodbTaxonNo: Math.floor(Math.random() * 900000),
          sourceVersion: 'mock-pbdb-2026-07',
          lastUpdated: '2026-07-02',
        }
      : undefined,
    artifactTemplates: legacy.artifactTypes.map((t) => ({
      id: `${legacy.id}_${t}`,
      artifactType: t,
      label: t.replace(/_/g, ' '),
      ethical: true as const,
      description: `Ethical ${t.replace(/_/g, ' ')} collection`,
    })),
    gameplay: {
      region: legacy.region,
      questType: legacy.questType,
      dangerLevel: legacy.dangerLevel,
      ethicalInteraction: legacy.ethicalInteraction,
      timeRange: legacy.timeRange,
      diet: legacy.diet,
      activity: legacy.activity,
      size: legacy.size,
      behavior: legacy.behavior,
      learningTopics: legacy.learningTopics,
      funFacts: legacy.funFacts,
      whyItMatters: legacy.whyItMatters,
      fossilLocations: legacy.fossilLocations,
      livingRelatives: legacy.livingRelatives,
    },
    provenance: mockProvenance(legacy.id, isExtinct),
  };
}

function toIndexEntry(sp: ArchiveSpecies): SpeciesIndexEntry {
  const cat = sp.conservation?.iucnCategory ?? 'Not Evaluated';
  return {
    id: sp.id,
    commonName: sp.commonName,
    scientificName: sp.scientificName,
    group: sp.group,
    family: sp.taxonomy.family,
    tier: sp.tier,
    region: sp.gameplay?.region,
    iucnCategory: cat,
    isExtinct: isExtinctCategory(cat as never),
    isThreatened: isThreatened(cat as never),
    isPlayable: sp.tier === 'hero' || sp.tier === 'regional',
  };
}

function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  const mammals = readJson<LegacySpecies[]>(join(LEGACY, 'species', 'mammals.json'));
  const insects = readJson<LegacySpecies[]>(join(LEGACY, 'species', 'insects.json'));
  const extinct = readJson<LegacySpecies[]>(join(LEGACY, 'species', 'extinct.json'));
  const regions = readJson<Array<Record<string, unknown>>>(join(LEGACY, 'regions.json'));
  const quests = readJson<unknown[]>(join(LEGACY, 'quests.json'));
  const traits = readJson<unknown[]>(join(LEGACY, 'traits.json'));

  const allLegacy = [...mammals, ...insects, ...extinct];
  const allSpecies = allLegacy.map(toArchiveSpecies);
  const indexEntries = allSpecies.map(toIndexEntry);

  const threatened = indexEntries.filter((e) => e.isThreatened).length;
  const extinctCount = indexEntries.filter((e) => e.isExtinct).length;
  const iucnAssessed = indexEntries.filter((e) => e.iucnCategory && e.iucnCategory !== 'Not Evaluated').length;
  const playable = indexEntries.filter((e) => e.isPlayable).length;

  writeFileSync(join(OUT, 'hero-species.json'), JSON.stringify({ species: allSpecies }, null, 2));

  writeFileSync(
    join(OUT, 'search-index.json'),
    JSON.stringify(
      {
        snapshotId: 'sample-2026-07',
        version: '1.0.0',
        totalCount: indexEntries.length,
        entries: indexEntries,
      },
      null,
      2
    )
  );

  const conservationOverlay = allSpecies
    .filter((s) => s.conservation?.assessed)
    .slice(0, 10)
    .map((s) => ({ speciesId: s.id, ...s.conservation }));
  writeFileSync(join(OUT, 'conservation-overlay.json'), JSON.stringify({ records: conservationOverlay }, null, 2));

  const occurrenceSummaries = allSpecies
    .filter((s) => s.distribution?.occurrenceSummaries)
    .slice(0, 10)
    .map((s) => ({
      speciesId: s.id,
      gbifTaxonKey: s.distribution!.gbifTaxonKey,
      summaries: s.distribution!.occurrenceSummaries,
    }));
  writeFileSync(join(OUT, 'gbif-occurrences.json'), JSON.stringify({ records: occurrenceSummaries }, null, 2));

  const fossilRecords = allSpecies
    .filter((s) => s.fossil)
    .map((s) => ({ speciesId: s.id, ...s.fossil }));
  writeFileSync(join(OUT, 'fossil-pbdb.json'), JSON.stringify({ records: fossilRecords }, null, 2));

  const regionBundles: Record<string, string> = {};
  for (const raw of regions) {
    const id = raw.id as string;
    const speciesIds = (raw.species as string[]) ?? [];
    const species = allSpecies.filter((s) => speciesIds.includes(s.id));
    const filename = `region-${id}.json`;
    writeFileSync(
      join(OUT, filename),
      JSON.stringify({ regionId: id, speciesIds, species }, null, 2)
    );
    regionBundles[id] = `bundles/${filename}`;
  }

  const normalizedRegions = regions.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    description: r.description,
    color: r.color,
    biome: r.biome,
    speciesIds: r.species ?? [],
    connections: r.connections ?? [],
    bundlePath: regionBundles[r.id as string],
  }));

  writeFileSync(
    join(OUT, 'game-config.json'),
    JSON.stringify({ regions: normalizedRegions, quests, traits }, null, 2)
  );
  writeFileSync(join(OUT, 'regions.json'), JSON.stringify(normalizedRegions, null, 2));
  writeFileSync(join(OUT, 'quests.json'), JSON.stringify(quests, null, 2));
  writeFileSync(join(OUT, 'traits.json'), JSON.stringify(traits, null, 2));

  const regionSpeciesRefs: DataManifest['bundles']['regionSpecies'] = {};
  for (const [id, path] of Object.entries(regionBundles)) {
    const spIds = (regions.find((r) => r.id === id)?.species as string[]) ?? [];
    regionSpeciesRefs[id] = {
      path,
      kind: 'region_species',
      recordCount: spIds.length,
    };
  }

  const manifest: DataManifest = {
    snapshotId: 'sample-2026-07',
    version: '2.0.0',
    generatedAt: new Date().toISOString(),
    description: 'Sample biodiversity snapshot — mock provenance overlays for pipeline demonstration',
    bundles: {
      heroSpecies: { path: 'bundles/hero-species.json', kind: 'hero_species', recordCount: allSpecies.length },
      conservation: { path: 'bundles/conservation-overlay.json', kind: 'conservation', recordCount: conservationOverlay.length },
      occurrence: { path: 'bundles/gbif-occurrences.json', kind: 'occurrence', recordCount: occurrenceSummaries.length },
      fossil: { path: 'bundles/fossil-pbdb.json', kind: 'fossil', recordCount: fossilRecords.length },
      searchIndex: { path: 'bundles/search-index.json', kind: 'search_index', recordCount: indexEntries.length },
      regions: { path: 'bundles/regions.json', kind: 'game_config', recordCount: regions.length },
      quests: { path: 'bundles/quests.json', kind: 'game_config', recordCount: quests.length },
      traits: { path: 'bundles/traits.json', kind: 'game_config', recordCount: traits.length },
      regionSpecies: regionSpeciesRefs,
    },
    coverage: {
      representedSpecies: indexEntries.length,
      iucnAssessed: iucnAssessed,
      threatened,
      extinctFossil: extinctCount,
      playableQuestSpecies: playable,
      heroSpecies: allSpecies.filter((s) => s.tier === 'hero').length,
    },
  };

  writeFileSync(join(ROOT, 'public', 'data', 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Generated bundles: ${allSpecies.length} species, manifest v${manifest.version}`);
}

main();
