/**
 * Transforms legacy hand-authored JSON into normalized production-shaped bundles.
 * Run: npm run generate:bundles
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ArchiveSpecies, SpeciesIndexEntry, DataManifest, SourceName } from '../src/schema';
import type { TaxonTimeRangesBundle, TaxonLifeStatus } from '../src/time/schema';
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

function getNasaEnvironment(legacy: LegacySpecies) {
  const deps: ArchiveSpecies['nasaLayerDependencies'] = [];
  const signals: ArchiveSpecies['requiredHabitatSignals'] = [];

  const add = (layer: string, product: string, reason: string) => {
    deps!.push({ layer: layer as never, product: product as never, reason });
  };

  if (legacy.habitats.some((h) => ['rainforest', 'forest'].includes(h))) {
    add('forest_structure', 'gedi', 'Canopy structure shapes arboreal and forest-floor species niches');
    add('vegetation', 'hls', 'NDVI tracks seasonal canopy and understory productivity');
    signals!.push({
      signal: 'dense_canopy',
      layer: 'forest_structure',
      required: true,
      description: 'Requires closed or partial canopy cover',
    });
  }
  if (legacy.habitats.includes('wetland') || legacy.region === 'wetland') {
    add('water', 'gibs', 'Surface water extent critical for wetland specialists');
    signals!.push({
      signal: 'surface_water',
      layer: 'water',
      minValue: 0.3,
      required: true,
      description: 'Depends on standing water or saturated soils',
    });
  }
  if (legacy.region === 'savanna' || legacy.habitats.includes('savanna')) {
    add('fire', 'firms', 'Fire regime influences grazer distribution and predator hunting');
    add('heat_drought', 'ecostress', 'Dry-season stress affects crepuscular activity patterns');
  }
  if (legacy.region === 'coastal' || legacy.habitats.includes('ocean')) {
    add('ocean_biology', 'ocean_color', 'Chlorophyll blooms drive marine prey aggregations');
    add('climate', 'power', 'Coastal wind and temperature affect migration timing');
    signals!.push({
      signal: 'ocean_productivity',
      layer: 'ocean_biology',
      minValue: 0.5,
      required: true,
      description: 'Migration and foraging follow ocean productivity seasons',
    });
  }
  if (legacy.group === 'Insect' && legacy.diet.toLowerCase().includes('nectar')) {
    add('vegetation', 'hls', 'Flowering plant availability tied to vegetation health');
    add('heat_drought', 'ecostress', 'Drought stress reduces nectar resources for pollinators');
    signals!.push({
      signal: 'low_fire_activity',
      layer: 'fire',
      required: false,
      description: 'Pollinator fields benefit from low recent fire activity',
    });
  }
  if (legacy.group === 'Amphibian' || legacy.habitats.includes('wetland')) {
    add('water', 'gibs', 'Breeding depends on wetland water availability');
    add('heat_drought', 'ecostress', 'Temperature and moisture gate amphibian activity');
  }
  if (legacy.conservationStatus === 'Extinct') {
    add('natural_events', 'eonet', 'Paleoenvironmental context for extinction events');
  }

  add('climate', 'power', 'Field expedition planning uses local climate baselines');

  return {
    nasaLayerDependencies: deps,
    requiredHabitatSignals: signals.length ? signals : undefined,
  };
}

function loadTaxonTimeMap(): Map<string, { timeUnitIds: string[]; lifeStatus: TaxonLifeStatus }> {
  const path = join(ROOT, 'public', 'data', 'time', 'taxon_time_ranges.json');
  if (!existsSync(path)) return new Map();
  const bundle = readJson<TaxonTimeRangesBundle>(path);
  const map = new Map<string, { timeUnitIds: string[]; lifeStatus: TaxonLifeStatus }>();
  for (const r of bundle.ranges) {
    map.set(r.taxonId, { timeUnitIds: r.timeUnitIds, lifeStatus: r.lifeStatus });
  }
  return map;
}

function tierFromLegacy(): 6 {
  return 6;
}

function sourcesFromProvenance(sp: ArchiveSpecies): SourceName[] {
  return [...new Set(sp.provenance.map((p) => p.source))];
}

function toArchiveSpecies(legacy: LegacySpecies, timeMap: Map<string, { timeUnitIds: string[]; lifeStatus: TaxonLifeStatus }>): ArchiveSpecies {
  const isExtinct = legacy.conservationStatus === 'Extinct';
  const nasaEnv = getNasaEnvironment(legacy);
  const timeInfo = timeMap.get(legacy.id);

  return {
    id: legacy.id,
    commonName: legacy.commonName,
    scientificName: legacy.scientificName,
    group: legacy.group,
    tier: 'hero',
    representationTier: tierFromLegacy(),
    lifeStatus: timeInfo?.lifeStatus ?? (isExtinct ? 'extinct' : 'extant'),
    timeUnitIds: timeInfo?.timeUnitIds,
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
    ...nasaEnv,
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
    representationTier: sp.representationTier,
    lifeStatus: sp.lifeStatus,
    timeUnitIds: sp.timeUnitIds,
    sources: sourcesFromProvenance(sp),
    region: sp.gameplay?.region,
    iucnCategory: cat,
    isExtinct: isExtinctCategory(cat as never) || sp.lifeStatus === 'extinct' || sp.lifeStatus === 'fossil_only',
    isThreatened: isThreatened(cat as never),
    isPlayable: sp.representationTier >= 5,
  };
}

interface StubDef {
  id: string;
  commonName: string;
  scientificName: string;
  group: string;
  family: string;
  representationTier: 0 | 1 | 2 | 3;
  lifeStatus: TaxonLifeStatus;
  timeUnitIds: string[];
  sources: SourceName[];
  isExtinct?: boolean;
}

const ARCHIVE_STUBS: StubDef[] = [
  { id: 'sample_cyanobacteria', commonName: 'Cyanobacteria', scientificName: 'Cyanobacteria', group: 'Microbe', family: 'Cyanobacteria', representationTier: 1, lifeStatus: 'microbial_or_pre_animal', timeUnitIds: ['archean', 'proterozoic', 'phanerozoic'], sources: ['catalogue_of_life'] },
  { id: 'sample_trilobite_elrathia', commonName: 'Elrathia Kingii', scientificName: 'Elrathia kingii', group: 'Arthropod', family: 'Elrathiidae', representationTier: 3, lifeStatus: 'extinct', timeUnitIds: ['cambrian', 'furongian'], sources: ['paleobiodb'], isExtinct: true },
  { id: 'sample_anomalocaris', commonName: 'Anomalocaris', scientificName: 'Anomalocaris canadensis', group: 'Arthropod', family: 'Anomalocarididae', representationTier: 3, lifeStatus: 'extinct', timeUnitIds: ['cambrian'], sources: ['paleobiodb'], isExtinct: true },
  { id: 'sample_dickinsonia', commonName: 'Dickinsonia', scientificName: 'Dickinsonia costata', group: 'Ediacaran', family: 'Dickinsoniidae', representationTier: 2, lifeStatus: 'uncertain', timeUnitIds: ['ediacaran'], sources: ['paleobiodb'], isExtinct: true },
  { id: 'sample_charnia', commonName: 'Charnia', scientificName: 'Charnia masoni', group: 'Ediacaran', family: 'Charniidae', representationTier: 2, lifeStatus: 'uncertain', timeUnitIds: ['ediacaran'], sources: ['paleobiodb'], isExtinct: true },
  { id: 'sample_brachiosaurus', commonName: 'Brachiosaurus', scientificName: 'Brachiosaurus altithorax', group: 'Reptile', family: 'Brachiosauridae', representationTier: 3, lifeStatus: 'extinct', timeUnitIds: ['late_jurassic', 'jurassic'], sources: ['paleobiodb'], isExtinct: true },
  { id: 'sample_archaeopteryx', commonName: 'Archaeopteryx', scientificName: 'Archaeopteryx lithographica', group: 'Reptile', family: 'Archaeopterygidae', representationTier: 3, lifeStatus: 'extinct', timeUnitIds: ['late_jurassic'], sources: ['paleobiodb'], isExtinct: true },
  { id: 'sample_coelophysis', commonName: 'Coelophysis', scientificName: 'Coelophysis bauri', group: 'Reptile', family: 'Coelophysidae', representationTier: 3, lifeStatus: 'extinct', timeUnitIds: ['late_triassic', 'triassic'], sources: ['paleobiodb'], isExtinct: true },
  { id: 'sample_ammonite_cretaceous', commonName: 'Baculites', scientificName: 'Baculites compressus', group: 'Mollusk', family: 'Baculitidae', representationTier: 3, lifeStatus: 'extinct', timeUnitIds: ['late_cretaceous', 'cretaceous'], sources: ['paleobiodb'], isExtinct: true },
  { id: 'sample_ammonite_devonian', commonName: 'Ammonoids', scientificName: 'Ammonoidea', group: 'Mollusk', family: 'Ammonoidea', representationTier: 1, lifeStatus: 'representative_group', timeUnitIds: ['devonian', 'carboniferous', 'permian', 'triassic', 'jurassic', 'cretaceous'], sources: ['paleobiodb'], isExtinct: true },
  { id: 'sample_trilobite_group', commonName: 'Trilobites', scientificName: 'Trilobita', group: 'Arthropod', family: 'Trilobita', representationTier: 1, lifeStatus: 'representative_group', timeUnitIds: ['cambrian', 'ordovician', 'silurian', 'devonian', 'carboniferous', 'permian'], sources: ['paleobiodb'], isExtinct: true },
  { id: 'sample_meganeura', commonName: 'Meganeura', scientificName: 'Meganeura monyi', group: 'Insect', family: 'Meganeuridae', representationTier: 3, lifeStatus: 'extinct', timeUnitIds: ['pennsylvanian', 'carboniferous'], sources: ['paleobiodb'], isExtinct: true },
  { id: 'sample_stromatolite', commonName: 'Stromatolite', scientificName: 'Stromatolite', group: 'Microbe', family: 'Microbial mat', representationTier: 2, lifeStatus: 'microbial_or_pre_animal', timeUnitIds: ['archean', 'proterozoic', 'phanerozoic'], sources: ['paleobiodb'] },
  { id: 'sample_archean_microbe', commonName: 'Archean microbial mat', scientificName: 'Microbial mat community', group: 'Microbe', family: 'Prokaryota', representationTier: 0, lifeStatus: 'microbial_or_pre_animal', timeUnitIds: ['archean', 'proterozoic'], sources: ['paleobiodb'] },
  { id: 'sample_saber_toothed_cat', commonName: 'Saber-toothed Cat', scientificName: 'Smilodon fatalis', group: 'Mammal', family: 'Felidae', representationTier: 3, lifeStatus: 'extinct', timeUnitIds: ['pleistocene'], sources: ['paleobiodb', 'neotoma'], isExtinct: true },
  { id: 'sample_prebiotic_chemistry', commonName: 'Prebiotic systems', scientificName: 'Prebiotic molecular systems', group: 'Pre-life', family: '—', representationTier: 0, lifeStatus: 'uncertain', timeUnitIds: ['hadean'], sources: ['game_authored'] },
];

function stubToArchiveSpecies(stub: StubDef): ArchiveSpecies {
  const now = new Date().toISOString();
  return {
    id: stub.id,
    commonName: stub.commonName,
    scientificName: stub.scientificName,
    group: stub.group,
    tier: 'database',
    representationTier: stub.representationTier,
    lifeStatus: stub.lifeStatus,
    timeUnitIds: stub.timeUnitIds,
    taxonomy: {
      family: stub.family,
      rank: 'species',
      acceptedName: stub.scientificName,
    },
    artifactTemplates: stub.representationTier >= 4
      ? [{ id: `${stub.id}_record`, artifactType: 'archive_record', label: 'Archive record', ethical: true, description: 'Archive reference record' }]
      : [],
    provenance: stub.sources.map((source) => ({
      source,
      sourceVersion: 'mock-sample-2026-07',
      sourceRecordId: stub.id,
      license: 'MOCK-SAMPLE' as const,
      citation: 'MOCK SAMPLE — tiered archive stub for pipeline demonstration',
      citationRequired: true,
      retrievedAt: now,
      lastUpdated: now,
      isMockData: true,
    })),
  };
}

function stubToIndexEntry(stub: StubDef): SpeciesIndexEntry {
  return {
    id: stub.id,
    commonName: stub.commonName,
    scientificName: stub.scientificName,
    group: stub.group,
    family: stub.family,
    tier: 'database',
    representationTier: stub.representationTier,
    lifeStatus: stub.lifeStatus,
    timeUnitIds: stub.timeUnitIds,
    sources: stub.sources,
    isExtinct: stub.isExtinct ?? false,
    isThreatened: false,
    isPlayable: false,
  };
}

function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  const timeMap = loadTaxonTimeMap();
  const mammals = readJson<LegacySpecies[]>(join(LEGACY, 'species', 'mammals.json'));
  const insects = readJson<LegacySpecies[]>(join(LEGACY, 'species', 'insects.json'));
  const extinct = readJson<LegacySpecies[]>(join(LEGACY, 'species', 'extinct.json'));
  const regions = readJson<Array<Record<string, unknown>>>(join(LEGACY, 'regions.json'));
  const quests = readJson<unknown[]>(join(LEGACY, 'quests.json'));
  const traits = readJson<unknown[]>(join(LEGACY, 'traits.json'));

  const allLegacy = [...mammals, ...insects, ...extinct];
  const allSpecies = allLegacy.map((l) => toArchiveSpecies(l, timeMap));
  const stubSpecies = ARCHIVE_STUBS.map(stubToArchiveSpecies);
  const heroIds = new Set(allSpecies.map((s) => s.id));
  const uniqueStubs = stubSpecies.filter((s) => !heroIds.has(s.id));

  const indexEntries = [
    ...allSpecies.map(toIndexEntry),
    ...ARCHIVE_STUBS.filter((s) => !heroIds.has(s.id)).map(stubToIndexEntry),
  ];

  const threatened = indexEntries.filter((e) => e.isThreatened).length;
  const extinctCount = indexEntries.filter((e) => e.isExtinct).length;
  const iucnAssessed = indexEntries.filter((e) => e.iucnCategory && e.iucnCategory !== 'Not Evaluated').length;
  const playable = indexEntries.filter((e) => e.isPlayable).length;

  writeFileSync(join(OUT, 'hero-species.json'), JSON.stringify({ species: allSpecies }, null, 2));
  writeFileSync(join(OUT, 'archive-stubs.json'), JSON.stringify({ species: uniqueStubs }, null, 2));

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

  const timeManifestPath = join(ROOT, 'public', 'data', 'time', 'time_manifest.json');
  const timeManifest = existsSync(timeManifestPath) ? readJson<{ coverage: { totalTimeUnits: number; playableGates: number; taxaWithTimeRanges: number } }>(timeManifestPath) : null;

  const manifest: DataManifest = {
    snapshotId: 'sample-2026-07',
    version: '3.0.0',
    generatedAt: new Date().toISOString(),
    description: 'Sample biodiversity + Time Atlas snapshot — tiered representation with mock provenance',
    bundles: {
      heroSpecies: { path: 'bundles/hero-species.json', kind: 'hero_species', recordCount: allSpecies.length },
      archiveStubs: { path: 'bundles/archive-stubs.json', kind: 'archive_stubs', recordCount: uniqueStubs.length },
      conservation: { path: 'bundles/conservation-overlay.json', kind: 'conservation', recordCount: conservationOverlay.length },
      occurrence: { path: 'bundles/gbif-occurrences.json', kind: 'occurrence', recordCount: occurrenceSummaries.length },
      fossil: { path: 'bundles/fossil-pbdb.json', kind: 'fossil', recordCount: fossilRecords.length },
      searchIndex: { path: 'bundles/search-index.json', kind: 'search_index', recordCount: indexEntries.length },
      regions: { path: 'bundles/regions.json', kind: 'game_config', recordCount: regions.length },
      quests: { path: 'bundles/quests.json', kind: 'game_config', recordCount: quests.length },
      traits: { path: 'bundles/traits.json', kind: 'game_config', recordCount: traits.length },
      regionSpecies: regionSpeciesRefs,
      timeAtlas: timeManifest
        ? {
            manifest: { path: 'time/time_manifest.json', kind: 'time_atlas' },
            geologicTimeUnits: { path: 'time/geologic_time_units.json', kind: 'time_atlas', recordCount: timeManifest.coverage.totalTimeUnits },
            playableTimeGates: { path: 'time/playable_time_gates.json', kind: 'time_atlas', recordCount: 17 },
            taxonTimeRanges: { path: 'time/taxon_time_ranges.json', kind: 'time_atlas', recordCount: timeManifest.coverage.taxaWithTimeRanges },
          }
        : undefined,
    },
    coverage: {
      representedSpecies: indexEntries.length,
      iucnAssessed: iucnAssessed,
      threatened,
      extinctFossil: extinctCount,
      playableQuestSpecies: playable,
      heroSpecies: allSpecies.filter((s) => s.tier === 'hero').length,
      timeUnits: timeManifest?.coverage.totalTimeUnits,
      playableTimeGates: timeManifest?.coverage.playableGates,
      taxaWithTimeRanges: timeManifest?.coverage.taxaWithTimeRanges,
    },
  };

  writeFileSync(join(ROOT, 'public', 'data', 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Generated bundles: ${allSpecies.length} species, manifest v${manifest.version}`);
}

main();
