/**
 * Generates Time Atlas JSON bundles from ICS hierarchy definitions.
 * Run: npm run generate:time-atlas
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  GeologicTimeUnit,
  GeologicTimeRank,
  PlayableTimeGate,
  TaxonTimeRange,
  TimeManifest,
} from '../src/time/schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TIME_DIR = join(ROOT, 'public', 'data', 'time');
const SNAPSHOT = 'ics-sample-2026-07';

function icsProvenance(recordId: string, isMock = true) {
  const now = '2026-07-04T00:00:00.000Z';
  return [
    {
      source: 'ics_chronostratigraphic' as const,
      sourceVersion: 'ICS-Chart-v2024/12',
      sourceRecordId: recordId,
      license: 'CC-BY-4.0' as const,
      citation:
        'International Commission on Stratigraphy (2024). International Chronostratigraphic Chart v2024/12.',
      citationRequired: true,
      retrievedAt: now,
      lastUpdated: now,
      isMockData: isMock,
    },
  ];
}

function unit(
  id: string,
  name: string,
  rank: GeologicTimeRank,
  parentId: string | null,
  startMa: number,
  endMa: number,
  displayOrder: number,
  description: string,
  majorEvents: string[],
  dominantLife: string[],
  climateSummary: string,
  uncertaintyNotes?: string
): GeologicTimeUnit {
  return {
    id,
    name,
    rank,
    parentId,
    startMa,
    endMa,
    displayOrder,
    description,
    majorEvents,
    dominantLife,
    climateSummary,
    sourceProvenance: icsProvenance(id),
    uncertaintyNotes,
  };
}

function buildGeologicUnits(): GeologicTimeUnit[] {
  const u: GeologicTimeUnit[] = [];
  let order = 0;

  // Eons
  u.push(unit('hadean', 'Hadean', 'eon', null, 4600, 4000, order++, 'Pre-geologic record era before stable crust.', ['Earth formation', 'Moon-forming impact'], ['Pre-biotic chemistry'], 'Extreme heat, molten surface', 'Boundaries approximate; sparse geologic record.'));
  u.push(unit('archean', 'Archean', 'eon', null, 4000, 2500, order++, 'Early Earth with first life and oceans.', ['First life', 'Oxygen-free atmosphere'], ['Microbial mats', 'Stromatolites'], 'Warm oceans, reducing atmosphere'));
  u.push(unit('proterozoic', 'Proterozoic', 'eon', null, 2500, 538, order++, 'Rise of oxygen and complex cells.', ['Great Oxidation Event', 'Snowball Earth'], ['Cyanobacteria', 'Eukaryotes', 'Ediacaran biota'], 'Variable; increasing oxygen'));
  u.push(unit('phanerozoic', 'Phanerozoic', 'eon', null, 538, 0, order++, 'Visible life era with abundant fossils.', ['Cambrian explosion', 'Mass extinctions'], ['Animals', 'Plants', 'Modern ecosystems'], 'Diverse climates through time'));

  // Eras
  u.push(unit('eoarchean', 'Eoarchean', 'era', 'archean', 4000, 3600, order++, 'Earliest Archean crust and oceans.', ['First oceans'], ['Hyperthermophiles'], 'Hot, volcanic'));
  u.push(unit('mesoarchean', 'Mesoarchean', 'era', 'archean', 3600, 3200, order++, 'Stable continental nuclei form.', ['Continental crust growth'], ['Microbial communities'], 'Cooling crust'));
  u.push(unit('neoarchean', 'Neoarchean', 'era', 'archean', 3200, 2500, order++, 'Late Archean before Proterozoic.', ['Atmospheric change'], ['Stromatolite reefs'], 'Warmer than today'));
  u.push(unit('paleoproterozoic', 'Paleoproterozoic', 'era', 'proterozoic', 2500, 1600, order++, 'Great Oxidation and banded iron.', ['GOE ~2.4 Ga'], ['Oxygenic photosynthesis'], 'Increasing oxygen'));
  u.push(unit('mesoproterozoic', 'Mesoproterozoic', 'era', 'proterozoic', 1600, 1000, order++, 'Stable supercontinent Rodinia forms.', ['Rodinia assembly'], ['Eukaryotic diversification'], 'Mild, stable'));
  u.push(unit('neoproterozoic', 'Neoproterozoic', 'era', 'proterozoic', 1000, 538, order++, 'Snowball Earth and Ediacaran fauna.', ['Snowball Earth', 'Ediacaran biota'], ['Ediacaran organisms', 'Early animals'], 'Extreme glaciations then warming'));
  u.push(unit('paleozoic', 'Paleozoic', 'era', 'phanerozoic', 538, 251.9, order++, 'Ancient life era ending in Permian extinction.', ['Cambrian explosion', 'Permian-Triassic extinction'], ['Trilobites', 'Early vertebrates', 'Land plants'], 'From warm seas to ice ages'));
  u.push(unit('mesozoic', 'Mesozoic', 'era', 'phanerozoic', 251.9, 66, order++, 'Age of dinosaurs.', ['Pangea breakup', 'K-Pg extinction'], ['Dinosaurs', 'Ammonites', 'First mammals'], 'Warm greenhouse climates'));
  u.push(unit('cenozoic', 'Cenozoic', 'era', 'phanerozoic', 66, 0, order++, 'Age of mammals and modern ecosystems.', ['Ice ages', 'Human evolution'], ['Mammals', 'Flowering plants', 'Modern fauna'], 'Cooling trend to ice ages'));

  // Periods — full Phanerozoic + Ediacaran
  const periods: Array<[string, string, string, number, number, string, string[], string[], string]> = [
    ['ediacaran', 'Ediacaran', 'neoproterozoic', 635, 538, 'First large complex multicellular organisms.', ['Ediacaran biota'], ['Dickinsonia', 'Rangeomorphs'], 'Post-glacial warming'],
    ['cambrian', 'Cambrian', 'paleozoic', 538, 485.4, 'Explosion of animal body plans.', ['Cambrian explosion'], ['Trilobites', 'Anomalocaris'], 'Warm shallow seas'],
    ['ordovician', 'Ordovician', 'paleozoic', 485.4, 443.8, 'Diverse marine communities.', ['Ordovician radiation'], ['Graptolites', 'Nautiloids'], 'Greenhouse then icehouse'],
    ['silurian', 'Silurian', 'paleozoic', 443.8, 419.2, 'First land plants and jawed fish.', ['Land colonization begins'], ['Early arthropods on land'], 'Stable warm climate'],
    ['devonian', 'Devonian', 'paleozoic', 419.2, 358.9, 'Age of fishes and early forests.', ['Forest expansion'], ['Lobe-finned fish', 'Early tetrapods'], 'Warm, high CO2'],
    ['carboniferous', 'Carboniferous', 'paleozoic', 358.9, 298.9, 'Vast coal swamp forests.', ['Coal formation'], ['Giant insects', 'Early amniotes'], 'Humid swamp world'],
    ['permian', 'Permian', 'paleozoic', 298.9, 251.9, 'Supercontinent Pangea dominates.', ['P-T mass extinction'], ['Synapsids', 'Gorgonopsians'], 'Arid interior, extreme extinction'],
    ['triassic', 'Triassic', 'mesozoic', 251.9, 201.4, 'Recovery after greatest extinction.', ['First dinosaurs', 'Mammals appear'], ['Early dinosaurs', 'Ichthyosaurs'], 'Hot, monsoonal Pangea'],
    ['jurassic', 'Jurassic', 'mesozoic', 201.4, 145, 'Dinosaur dominance expands.', ['Pangea rifting'], ['Sauropods', 'Archaeopteryx'], 'Warm, no polar ice'],
    ['cretaceous', 'Cretaceous', 'mesozoic', 145, 66, 'Flowering plants and apex dinosaurs.', ['K-Pg extinction'], ['T. rex', 'Ammonites', 'Angiosperms'], 'Warmest Mesozoic; ends in impact'],
    ['paleogene', 'Paleogene', 'cenozoic', 66, 23, 'Mammal radiation after dinosaurs.', ['Mammal diversification'], ['Early whales', 'Primates'], 'Warm Paleocene-Eocene'],
    ['neogene', 'Neogene', 'cenozoic', 23, 2.58, 'Grasslands and hominid evolution.', ['Grassland expansion'], ['Apes', 'Saber-toothed cats'], 'Cooling, savannas spread'],
    ['quaternary', 'Quaternary', 'cenozoic', 2.58, 0, 'Ice ages and Homo sapiens.', ['Glacial cycles', 'Human dispersal'], ['Modern mammals', 'Humans'], 'Repeated glaciations'],
  ];
  for (const [id, name, parent, start, end, desc, events, life, climate] of periods) {
    u.push(unit(id, name, 'period', parent, start, end, order++, desc, events, life, climate));
  }

  // Epochs — sample detail for key periods
  u.push(unit('holocene', 'Holocene', 'epoch', 'quaternary', 0.0117, 0, order++, 'Current interglacial — Modern Earth.', ['Agriculture', 'Anthropocene debate'], ['Modern ecosystems', 'Homo sapiens'], 'Interglacial, variable warming'));
  u.push(unit('pleistocene', 'Pleistocene', 'epoch', 'quaternary', 2.58, 0.0117, order++, 'Ice Age epoch with megafauna.', ['Glacial maxima', 'Megafaunal extinctions'], ['Woolly mammoth', 'Cave lions'], 'Repeated ice ages'));
  u.push(unit('pliocene', 'Pliocene', 'epoch', 'neogene', 5.33, 2.58, order++, 'Cooling and savanna spread.', ['Isthmus of Panama'], ['Early hominins', 'Mammoths'], 'Cooler, drier trends'));
  u.push(unit('miocene', 'Miocene', 'epoch', 'neogene', 23.03, 5.33, order++, 'Grassland expansion era.', ['C4 grasslands spread'], ['Apes diversify', 'Megalodon'], 'Warm mid-Miocene optimum'));
  u.push(unit('eocene', 'Eocene', 'epoch', 'paleogene', 56, 33.9, order++, 'Warm early Cenozoic forests.', ['PETM warming event'], ['Early whales', 'Primates'], 'Greenhouse hothouse'));
  u.push(unit('paleocene', 'Paleocene', 'epoch', 'paleogene', 66, 56, order++, 'Post-extinction recovery.', ['Mammal recovery after K-Pg'], ['Early mammals'], 'Warm recovery world'));
  u.push(unit('late_cretaceous', 'Late Cretaceous', 'epoch', 'cretaceous', 100.5, 66, order++, 'Last age of non-avian dinosaurs.', ['Deccan traps', 'Chicxulub impact'], ['Tyrannosaurs', 'Ammonites'], 'Warm before extinction'));
  u.push(unit('late_jurassic', 'Late Jurassic', 'epoch', 'jurassic', 163.5, 145, order++, 'Sauropod giants peak.', ['Morrison Formation'], ['Brachiosaurus', 'Stegosaurus'], 'Warm, seasonal monsoons'));
  u.push(unit('late_triassic', 'Late Triassic', 'epoch', 'triassic', 237, 201.4, order++, 'First dinosaurs diversify.', ['End-Triassic extinction'], ['Coelophysis', 'Early mammals'], 'Hot, seasonal'));
  u.push(unit('lopingian', 'Lopingian', 'epoch', 'permian', 259.1, 251.9, order++, 'Late Permian before P-T extinction.', ['P-T mass extinction'], ['Dicynodonts', 'Gorgonopsians'], 'Increasing aridity'));
  u.push(unit('pennsylvanian', 'Pennsylvanian', 'epoch', 'carboniferous', 323.2, 298.9, order++, 'Coal swamp peak.', ['Vast coal forests'], ['Meganeura', 'Dimetrodon relatives'], 'Humid equatorial swamps'));
  u.push(unit('devonian_late', 'Late Devonian', 'epoch', 'devonian', 382.7, 358.9, order++, 'Fish diversity peak; first forests.', ['Hangenberg extinction'], ['Tiktaalik relatives', 'Ammonoids'], 'Warm seas and forests'));
  u.push(unit('furongian', 'Furongian', 'epoch', 'cambrian', 497, 485.4, order++, 'Late Cambrian trilobite diversity.', ['Redlichiid extinction'], ['Trilobites', 'Early chordates'], 'Stable warm seas'));
  u.push(unit('tonian', 'Tonian', 'epoch', 'neoproterozoic', 1000, 720, order++, 'Pre-Ediacaran eukaryotic diversification.', ['Supercontinent Rodinia'], ['Multicellular algae'], 'Stable mild climate'));

  // Ages — sample
  u.push(unit('meghalayan', 'Meghalayan', 'age', 'holocene', 0.0042, 0, order++, 'Current Holocene age.', ['Recorded history'], ['Modern civilizations'], 'Recent interglacial'));
  u.push(unit('chibanian', 'Chibanian', 'age', 'pleistocene', 0.774, 0.0117, order++, 'Middle Pleistocene age.', ['Brunhes-Matuyama reversal'], ['Middle Pleistocene megafauna'], 'Glacial-interglacial cycles'));

  return u;
}

function buildPlayableGates(): PlayableTimeGate[] {
  const now = '2026-07-04T00:00:00.000Z';
  const prov = (id: string) => [
    {
      source: 'game_authored' as const,
      sourceVersion: 'time-gates-v1',
      sourceRecordId: id,
      license: 'GAME-ORIGINAL' as const,
      citation: 'Archive of Life: Artifact World — playable time gate design',
      citationRequired: false,
      retrievedAt: now,
      lastUpdated: now,
      isMockData: true,
    },
  ];

  const gates: Omit<PlayableTimeGate, 'sourceProvenance'>[] = [
    { id: 'gate_hadean', name: 'Hadean Pre-Life Earth', description: 'Explore early Earth before life — molten surface and prebiotic chemistry.', requiredProgress: { artifactsCollected: 20 }, timeUnitIds: ['hadean'], availableRegionTypes: ['volcanic', 'museum'], representativeTaxa: ['sample_prebiotic_chemistry'], fossilArtifactTypes: ['mineral_specimen'], lifelingUnlockThemes: ['ancient_earth'], educationTopics: ['planetary formation', 'prebiotic chemistry'], uncertaintyNotes: 'Pre-life reconstructions are highly uncertain.', isPlayable: false },
    { id: 'gate_archean', name: 'Archean Early Life Earth', description: 'Microbial Earth — stromatolites and early oceans.', requiredProgress: { artifactsCollected: 18 }, timeUnitIds: ['archean', 'eoarchean', 'mesoarchean', 'neoarchean'], availableRegionTypes: ['microbial_mat', 'shallow_sea'], representativeTaxa: ['sample_stromatolite', 'sample_archean_microbe'], fossilArtifactTypes: ['microfossil_impression'], lifelingUnlockThemes: ['microbial_wisdom'], educationTopics: ['stromatolites', 'early metabolism'], isPlayable: false },
    { id: 'gate_proterozoic', name: 'Proterozoic Microbial Earth', description: 'Oxygen rise and eukaryotic evolution.', requiredProgress: { artifactsCollected: 15 }, timeUnitIds: ['proterozoic', 'paleoproterozoic', 'mesoproterozoic', 'neoproterozoic'], availableRegionTypes: ['microbial_mat', 'shallow_sea'], representativeTaxa: ['sample_cyanobacteria', 'sample_eukaryote_alga'], fossilArtifactTypes: ['microfossil_impression'], lifelingUnlockThemes: ['oxygen_pioneer'], educationTopics: ['Great Oxidation Event'], isPlayable: false },
    { id: 'gate_ediacaran', name: 'Ediacaran Worlds', description: 'First large soft-bodied organisms before the Cambrian explosion.', requiredProgress: { artifactsCollected: 12 }, timeUnitIds: ['ediacaran'], availableRegionTypes: ['seafloor', 'fossil_site'], representativeTaxa: ['sample_dickinsonia', 'sample_charnia'], fossilArtifactTypes: ['trace_impression', 'body_fossil_cast'], lifelingUnlockThemes: ['soft_body_wonder'], educationTopics: ['Ediacaran biota'], uncertaintyNotes: 'Ediacaran affinities remain debated.', isPlayable: false },
    { id: 'gate_cambrian', name: 'Cambrian Explosion', description: 'Explosion of animal body plans in warm shallow seas.', requiredProgress: { artifactsCollected: 10 }, timeUnitIds: ['cambrian', 'furongian'], availableRegionTypes: ['seafloor', 'fossil_site'], representativeTaxa: ['sample_trilobite_elrathia', 'sample_anomalocaris'], fossilArtifactTypes: ['body_fossil_cast', 'trace_impression'], lifelingUnlockThemes: ['exoskeleton_scout'], educationTopics: ['Cambrian explosion', 'trilobites'], isPlayable: false },
    { id: 'gate_ordovician', name: 'Ordovician Oceans', description: 'Diverse marine ecosystems before Silurian colonization.', requiredProgress: { artifactsCollected: 10 }, timeUnitIds: ['ordovician'], availableRegionTypes: ['seafloor', 'fossil_site'], representativeTaxa: ['sample_graptolite', 'sample_nautiloid'], fossilArtifactTypes: ['body_fossil_cast'], lifelingUnlockThemes: ['plankton_drift'], educationTopics: ['Ordovician radiation'], isPlayable: false },
    { id: 'gate_silurian', name: 'Silurian Shoreline', description: 'First land plants and early terrestrial arthropods.', requiredProgress: { artifactsCollected: 10 }, timeUnitIds: ['silurian'], availableRegionTypes: ['coastal', 'fossil_site'], representativeTaxa: ['sample_cooksonia', 'sample_millipede_early'], fossilArtifactTypes: ['plant_impression'], lifelingUnlockThemes: ['land_pioneer'], educationTopics: ['terrestrial colonization'], isPlayable: false },
    { id: 'gate_devonian', name: 'Devonian Seas and Forests', description: 'Age of fishes and early forests.', requiredProgress: { artifactsCollected: 8 }, timeUnitIds: ['devonian', 'devonian_late'], availableRegionTypes: ['forest', 'coastal', 'fossil_site'], representativeTaxa: ['sample_dunkleosteus', 'sample_ammonite_devonian'], fossilArtifactTypes: ['body_fossil_cast', 'plant_impression'], lifelingUnlockThemes: ['lobe_fin_learner'], educationTopics: ['Devonian extinction', 'ammonites'], isPlayable: false },
    { id: 'gate_carboniferous', name: 'Carboniferous Swamp World', description: 'Vast coal swamps with giant insects.', requiredProgress: { artifactsCollected: 8 }, timeUnitIds: ['carboniferous', 'pennsylvanian'], availableRegionTypes: ['wetland', 'forest', 'fossil_site'], representativeTaxa: ['sample_meganeura', 'sample_arthropleura'], fossilArtifactTypes: ['plant_impression', 'body_fossil_cast'], lifelingUnlockThemes: ['swamp_glider'], educationTopics: ['coal forests', 'high oxygen'], isPlayable: false },
    { id: 'gate_permian', name: 'Permian Supercontinent', description: 'Pangea at its peak — before the greatest extinction.', requiredProgress: { artifactsCollected: 8 }, timeUnitIds: ['permian', 'lopingian'], availableRegionTypes: ['savanna', 'fossil_site'], representativeTaxa: ['sample_gorgonops', 'sample_dicynodont'], fossilArtifactTypes: ['body_fossil_cast'], lifelingUnlockThemes: ['supercontinent_survivor'], educationTopics: ['P-T extinction'], isPlayable: false },
    { id: 'gate_triassic', name: 'Triassic Recovery World', description: 'Life rebuilds after the Permian extinction.', requiredProgress: { artifactsCollected: 6 }, timeUnitIds: ['triassic', 'late_triassic'], availableRegionTypes: ['savanna', 'fossil_site'], representativeTaxa: ['sample_coelophysis', 'sample_lystrosaurus'], fossilArtifactTypes: ['body_fossil_cast'], lifelingUnlockThemes: ['recovery_spirit'], educationTopics: ['Triassic recovery'], isPlayable: false },
    { id: 'gate_jurassic', name: 'Jurassic World', description: 'Sauropod giants and the first birds.', requiredProgress: { artifactsCollected: 5 }, timeUnitIds: ['jurassic', 'late_jurassic'], availableRegionTypes: ['forest', 'fossil_site'], representativeTaxa: ['sample_brachiosaurus', 'sample_archaeopteryx'], fossilArtifactTypes: ['body_fossil_cast', 'track_impression'], lifelingUnlockThemes: ['sauropod_gaze'], educationTopics: ['Jurassic ecosystems'], isPlayable: false },
    { id: 'gate_cretaceous', name: 'Cretaceous World', description: 'Flowering plants and apex dinosaurs.', requiredProgress: { artifactsCollected: 4 }, timeUnitIds: ['cretaceous', 'late_cretaceous'], availableRegionTypes: ['forest', 'coastal', 'fossil_site'], representativeTaxa: ['tyrannosaurus_rex', 'sample_ammonite_cretaceous'], fossilArtifactTypes: ['body_fossil_cast', 'track_impression'], lifelingUnlockThemes: ['apex_observer'], educationTopics: ['K-Pg extinction'], isPlayable: false },
    { id: 'gate_paleogene', name: 'Paleogene Recovery World', description: 'Mammals radiate after dinosaur extinction.', requiredProgress: { artifactsCollected: 3 }, timeUnitIds: ['paleogene', 'paleocene', 'eocene'], availableRegionTypes: ['forest', 'wetland'], representativeTaxa: ['sample_palaeotherium'], fossilArtifactTypes: ['body_fossil_cast'], lifelingUnlockThemes: ['mammal_dawn'], educationTopics: ['post-KPg recovery'], isPlayable: false },
    { id: 'gate_neogene', name: 'Neogene Grasslands', description: 'Savannas spread as grasslands dominate.', requiredProgress: { artifactsCollected: 2 }, timeUnitIds: ['neogene', 'miocene', 'pliocene'], availableRegionTypes: ['savanna', 'forest'], representativeTaxa: ['sample_saber_toothed_cat'], fossilArtifactTypes: ['body_fossil_cast'], lifelingUnlockThemes: ['grassland_runner'], educationTopics: ['C4 grasslands'], isPlayable: false },
    { id: 'gate_pleistocene', name: 'Pleistocene Ice Age', description: 'Ice ages and megafauna of the recent past.', requiredProgress: { artifactsCollected: 1 }, timeUnitIds: ['pleistocene', 'chibanian'], availableRegionTypes: ['savanna', 'fossil_site'], representativeTaxa: ['mammuthus_primigenius', 'sample_woolly_rhino'], fossilArtifactTypes: ['body_fossil_cast', 'track_impression'], lifelingUnlockThemes: ['ice_age_resilience'], educationTopics: ['glacial cycles'], isPlayable: false },
    { id: 'gate_holocene', name: 'Modern Earth / Holocene', description: 'Current interglacial — explore living biodiversity.', requiredProgress: { artifactsCollected: 0 }, timeUnitIds: ['holocene', 'meghalayan', 'quaternary'], availableRegionTypes: ['savanna', 'forest', 'wetland', 'coastal', 'museum'], representativeTaxa: ['panthera_leo', 'danaus_plexippus', 'loxodonta_africana'], fossilArtifactTypes: ['photograph', 'audio_recording', 'track_impression'], lifelingUnlockThemes: ['modern_explorer'], educationTopics: ['conservation', 'modern ecology'], isPlayable: true },
  ];

  return gates.map((g) => ({ ...g, sourceProvenance: prov(g.id) }));
}

function taxonProv(source: string, id: string): TaxonTimeRange['provenance'] {
  const now = '2026-07-04T00:00:00.000Z';
  return [
    {
      source: source as never,
      sourceVersion: 'mock-sample-2026-07',
      sourceRecordId: id,
      license: 'MOCK-SAMPLE',
      citation: 'MOCK SAMPLE — illustrative time range for pipeline demonstration',
      citationRequired: true,
      retrievedAt: now,
      lastUpdated: now,
      isMockData: true,
    },
  ];
}

function buildTaxonTimeRanges(): TaxonTimeRange[] {
  const ranges: TaxonTimeRange[] = [
    // Living mammals (hero species — real archive IDs)
    { taxonId: 'panthera_leo', acceptedName: 'Panthera leo', rank: 'species', firstAppearanceMa: 1, lastAppearanceMa: 0, timeUnitIds: ['pleistocene', 'holocene'], lifeStatus: 'extant', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'panthera_leo') },
    { taxonId: 'loxodonta_africana', acceptedName: 'Loxodonta africana', rank: 'species', firstAppearanceMa: 5, lastAppearanceMa: 0, timeUnitIds: ['pliocene', 'pleistocene', 'holocene'], lifeStatus: 'extant', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'loxodonta_africana') },
    { taxonId: 'canis_lupus', acceptedName: 'Canis lupus', rank: 'species', firstAppearanceMa: 0.3, lastAppearanceMa: 0, timeUnitIds: ['pleistocene', 'holocene'], lifeStatus: 'extant', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'canis_lupus') },
    // Living insects
    { taxonId: 'danaus_plexippus', acceptedName: 'Danaus plexippus', rank: 'species', firstAppearanceMa: 2, lastAppearanceMa: 0, timeUnitIds: ['pleistocene', 'holocene'], lifeStatus: 'extant', source: 'catalogue_of_life', sourceVersion: 'mock-2026-07', confidence: 'medium', provenance: taxonProv('catalogue_of_life', 'danaus_plexippus') },
    { taxonId: 'apis_mellifera', acceptedName: 'Apis mellifera', rank: 'species', firstAppearanceMa: 30, lastAppearanceMa: 0, timeUnitIds: ['neogene', 'pleistocene', 'holocene'], lifeStatus: 'extant', source: 'catalogue_of_life', sourceVersion: 'mock-2026-07', confidence: 'medium', notes: 'Fossil record sparse; range approximate.', provenance: taxonProv('catalogue_of_life', 'apis_mellifera') },
    // Extinct mammals
    { taxonId: 'mammuthus_primigenius', acceptedName: 'Mammuthus primigenius', rank: 'species', firstAppearanceMa: 0.5, lastAppearanceMa: 0.004, timeUnitIds: ['pleistocene', 'holocene'], lifeStatus: 'extinct', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'mammuthus_primigenius') },
    { taxonId: 'sample_saber_toothed_cat', acceptedName: 'Smilodon fatalis', rank: 'species', firstAppearanceMa: 2.5, lastAppearanceMa: 0.01, timeUnitIds: ['pleistocene'], lifeStatus: 'extinct', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'sample_saber_toothed_cat') },
    // Dinosaurs
    { taxonId: 'tyrannosaurus_rex', acceptedName: 'Tyrannosaurus rex', rank: 'species', firstAppearanceMa: 68, lastAppearanceMa: 66, timeUnitIds: ['late_cretaceous', 'cretaceous'], lifeStatus: 'extinct', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'tyrannosaurus_rex') },
    { taxonId: 'sample_brachiosaurus', acceptedName: 'Brachiosaurus altithorax', rank: 'species', firstAppearanceMa: 154, lastAppearanceMa: 150, timeUnitIds: ['late_jurassic', 'jurassic'], lifeStatus: 'extinct', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'sample_brachiosaurus') },
    { taxonId: 'sample_archaeopteryx', acceptedName: 'Archaeopteryx lithographica', rank: 'species', firstAppearanceMa: 150, lastAppearanceMa: 148, timeUnitIds: ['late_jurassic'], lifeStatus: 'extinct', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'sample_archaeopteryx') },
    { taxonId: 'sample_coelophysis', acceptedName: 'Coelophysis bauri', rank: 'species', firstAppearanceMa: 228, lastAppearanceMa: 208, timeUnitIds: ['late_triassic', 'triassic'], lifeStatus: 'extinct', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'sample_coelophysis') },
    { taxonId: 'trilobita_order', acceptedName: 'Trilobita', rank: 'class', firstAppearanceMa: 521, lastAppearanceMa: 251, timeUnitIds: ['cambrian', 'ordovician', 'silurian', 'devonian', 'carboniferous', 'permian'], lifeStatus: 'representative_group', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', notes: 'Class-level range for hero fossil taxon.', provenance: taxonProv('paleobiodb', 'trilobita_order') },
    // Trilobites (sample stubs)
    { taxonId: 'sample_trilobite_elrathia', acceptedName: 'Elrathia kingii', rank: 'species', firstAppearanceMa: 501, lastAppearanceMa: 497, timeUnitIds: ['cambrian', 'furongian'], lifeStatus: 'extinct', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'sample_trilobite_elrathia') },
    { taxonId: 'sample_trilobite_group', acceptedName: 'Trilobita', rank: 'class', firstAppearanceMa: 521, lastAppearanceMa: 251, timeUnitIds: ['cambrian', 'ordovician', 'silurian', 'devonian', 'carboniferous', 'permian'], lifeStatus: 'representative_group', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', notes: 'Class-level range for Archive representation.', provenance: taxonProv('paleobiodb', 'sample_trilobite_group') },
    // Ammonites
    { taxonId: 'sample_ammonite_devonian', acceptedName: 'Ammonoidea', rank: 'class', firstAppearanceMa: 409, lastAppearanceMa: 66, timeUnitIds: ['devonian', 'carboniferous', 'permian', 'triassic', 'jurassic', 'cretaceous'], lifeStatus: 'representative_group', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'sample_ammonite_devonian') },
    { taxonId: 'sample_ammonite_cretaceous', acceptedName: 'Baculites compressus', rank: 'species', firstAppearanceMa: 100, lastAppearanceMa: 66, timeUnitIds: ['late_cretaceous', 'cretaceous'], lifeStatus: 'extinct', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'sample_ammonite_cretaceous') },
    // Early arthropods
    { taxonId: 'sample_anomalocaris', acceptedName: 'Anomalocaris canadensis', rank: 'species', firstAppearanceMa: 508, lastAppearanceMa: 497, timeUnitIds: ['cambrian'], lifeStatus: 'extinct', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'medium', provenance: taxonProv('paleobiodb', 'sample_anomalocaris') },
    { taxonId: 'sample_meganeura', acceptedName: 'Meganeura monyi', rank: 'species', firstAppearanceMa: 305, lastAppearanceMa: 299, timeUnitIds: ['pennsylvanian', 'carboniferous'], lifeStatus: 'extinct', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'high', provenance: taxonProv('paleobiodb', 'sample_meganeura') },
    // Ediacaran
    { taxonId: 'sample_dickinsonia', acceptedName: 'Dickinsonia costata', rank: 'species', firstAppearanceMa: 558, lastAppearanceMa: 551, timeUnitIds: ['ediacaran'], lifeStatus: 'uncertain', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'low', notes: 'Affinity uncertain — may be animal, lichen, or other.', provenance: taxonProv('paleobiodb', 'sample_dickinsonia') },
    { taxonId: 'sample_charnia', acceptedName: 'Charnia masoni', rank: 'species', firstAppearanceMa: 580, lastAppearanceMa: 550, timeUnitIds: ['ediacaran'], lifeStatus: 'uncertain', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'low', provenance: taxonProv('paleobiodb', 'sample_charnia') },
    // Microbial
    { taxonId: 'sample_stromatolite', acceptedName: 'Stromatolite', rank: 'genus', firstAppearanceMa: 3500, lastAppearanceMa: 0, timeUnitIds: ['archean', 'proterozoic', 'phanerozoic'], lifeStatus: 'microbial_or_pre_animal', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'medium', notes: 'Structure built by microbial communities, not a single species.', provenance: taxonProv('paleobiodb', 'sample_stromatolite') },
    { taxonId: 'sample_archean_microbe', acceptedName: 'Microbial mat community', rank: 'genus', firstAppearanceMa: 3800, lastAppearanceMa: 2500, timeUnitIds: ['archean', 'proterozoic'], lifeStatus: 'microbial_or_pre_animal', source: 'paleobiodb', sourceVersion: 'mock-2026-07', confidence: 'uncertain', provenance: taxonProv('paleobiodb', 'sample_archean_microbe') },
    { taxonId: 'sample_cyanobacteria', acceptedName: 'Cyanobacteria', rank: 'phylum', firstAppearanceMa: 3500, lastAppearanceMa: 0, timeUnitIds: ['archean', 'proterozoic', 'phanerozoic'], lifeStatus: 'microbial_or_pre_animal', source: 'catalogue_of_life', sourceVersion: 'mock-2026-07', confidence: 'medium', provenance: taxonProv('catalogue_of_life', 'sample_cyanobacteria') },
    { taxonId: 'sample_prebiotic_chemistry', acceptedName: 'Prebiotic molecular systems', rank: 'genus', firstAppearanceMa: 4600, lastAppearanceMa: 4000, timeUnitIds: ['hadean'], lifeStatus: 'uncertain', source: 'game_authored', sourceVersion: 'mock-2026-07', confidence: 'uncertain', notes: 'Representative concept, not a biological taxon.', provenance: taxonProv('game_authored', 'sample_prebiotic_chemistry') },
  ];

  return ranges;
}

function main() {
  if (!existsSync(TIME_DIR)) mkdirSync(TIME_DIR, { recursive: true });

  const units = buildGeologicUnits();
  const gates = buildPlayableGates();
  const ranges = buildTaxonTimeRanges();

  const unitsPath = 'time/geologic_time_units.json';
  const gatesPath = 'time/playable_time_gates.json';
  const rangesPath = 'time/taxon_time_ranges.json';

  writeFileSync(
    join(TIME_DIR, 'geologic_time_units.json'),
    JSON.stringify({ snapshotId: SNAPSHOT, version: '1.0.0', source: 'ICS-Chart-v2024/12', isMockData: true, units }, null, 2)
  );
  writeFileSync(
    join(TIME_DIR, 'playable_time_gates.json'),
    JSON.stringify({ snapshotId: SNAPSHOT, version: '1.0.0', gates }, null, 2)
  );
  writeFileSync(
    join(TIME_DIR, 'taxon_time_ranges.json'),
    JSON.stringify({ snapshotId: SNAPSHOT, version: '1.0.0', isMockData: true, ranges }, null, 2)
  );

  const rankCounts = { eon: 0, era: 0, period: 0, epoch: 0, age: 0 };
  for (const u of units) rankCounts[u.rank]++;

  const manifest: TimeManifest = {
    snapshotId: SNAPSHOT,
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    description: 'Sample ICS time scale snapshot — mock provenance until live ICS ingestion connected',
    isMockData: true,
    bundles: {
      geologicTimeUnits: { path: unitsPath, recordCount: units.length },
      playableTimeGates: { path: gatesPath, recordCount: gates.length },
      taxonTimeRanges: { path: rangesPath, recordCount: ranges.length },
    },
    coverage: {
      totalTimeUnits: units.length,
      playableGates: gates.filter((g) => g.isPlayable).length,
      taxaWithTimeRanges: ranges.length,
      eons: rankCounts.eon,
      eras: rankCounts.era,
      periods: rankCounts.period,
      epochs: rankCounts.epoch,
      ages: rankCounts.age,
    },
  };

  writeFileSync(join(TIME_DIR, 'time_manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Generated Time Atlas: ${units.length} units, ${gates.length} gates, ${ranges.length} taxon ranges`);
}

main();
