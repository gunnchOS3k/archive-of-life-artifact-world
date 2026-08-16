/**
 * STREAM-B-PKT-003 — Archive of Life scientific ingest + Lifeling + expedition + playtest.
 * Bounded offline scientific pack. Honesty flags remain false.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const PACKET = 'STREAM-B-PKT-003';

export interface ScientificRecord {
  taxonId: string;
  scientificName: string;
  sourceId: string;
  license: string;
  citation: string;
  observedAt?: string;
}

export interface ProvenanceCite {
  sourceId: string;
  license: string;
  citation: string;
  retrievedAt: string;
}

export interface ConflictRow {
  taxonId: string;
  field: string;
  values: string[];
  resolution: 'prefer_higher_authority' | 'keep_both_synonym' | 'flag_human_review';
  chosen?: string;
}

export interface ScientificIngestReport {
  schema: 'aol.scientific_ingest.v1';
  packet: typeof PACKET;
  liveClaim: false;
  recordsIn: number;
  recordsAccepted: number;
  provenance: ProvenanceCite[];
  conflicts: ConflictRow[];
  synonymEdges: Array<{ from: string; to: string; reason: string }>;
  GLOBAL_DATA_COMPLETE: false;
  ALL_SPECIES_INGESTED: false;
}

export interface OfflineScientificPack {
  schema: 'aol.offline_scientific_pack.v1';
  packet: typeof PACKET;
  packId: string;
  bounded: true;
  globalComplete: false;
  liveClaim: false;
  taxaCount: number;
  regionCount: number;
  expeditionCount: number;
  sha256: string;
  notes: string;
}

export interface LifelingProgressStep {
  level: number;
  xp: number;
  unlockedModules: string[];
  traits: string[];
  affinity: string;
}

export interface LifelingProgressionReport {
  schema: 'aol.lifeling_progression.v1';
  packet: typeof PACKET;
  steps: LifelingProgressStep[];
  progressionOk: boolean;
  note: string;
}

export interface ExpeditionDiversityReport {
  schema: 'aol.expedition_diversity.v1';
  packet: typeof PACKET;
  expeditionCount: number;
  uniqueBiomes: string[];
  uniqueRegions: string[];
  objectiveTypeCoverage: string[];
  diversityScore: number;
  diversityOk: boolean;
}

export interface PlaytestPacket {
  schema: 'aol.playtest_packet.v1';
  packet: typeof PACKET;
  HUMAN_PLAYTEST_VALIDATED: false;
  GLOBAL_DATA_COMPLETE: false;
  ALL_SPECIES_INGESTED: false;
  scriptedBeats: Array<{ id: string; label: string; done: boolean }>;
  instructions: string[];
  claim_boundary: string;
}

const AUTHORITY: Record<string, number> = {
  col: 3,
  gbif: 2,
  pbdb: 2,
  fixture: 1,
};

export function ingestScientificBatch(
  rows: ScientificRecord[],
  nowIso = new Date().toISOString(),
): ScientificIngestReport {
  const byTaxon = new Map<string, ScientificRecord[]>();
  for (const r of rows) {
    const list = byTaxon.get(r.taxonId) || [];
    list.push(r);
    byTaxon.set(r.taxonId, list);
  }

  const conflicts: ConflictRow[] = [];
  const synonymEdges: Array<{ from: string; to: string; reason: string }> = [];
  const accepted: ScientificRecord[] = [];
  const provenance: ProvenanceCite[] = [];

  for (const [taxonId, group] of byTaxon) {
    const names = [...new Set(group.map((g) => g.scientificName))];
    if (names.length > 1) {
      const ranked = [...group].sort(
        (a, b) => (AUTHORITY[b.sourceId] || 0) - (AUTHORITY[a.sourceId] || 0),
      );
      const chosen = ranked[0].scientificName;
      conflicts.push({
        taxonId,
        field: 'scientificName',
        values: names,
        resolution: 'prefer_higher_authority',
        chosen,
      });
      for (const n of names) {
        if (n !== chosen) synonymEdges.push({ from: n, to: chosen, reason: 'name_conflict' });
      }
      accepted.push({ ...ranked[0], scientificName: chosen });
    } else {
      accepted.push(group[0]);
    }
    for (const g of group) {
      provenance.push({
        sourceId: g.sourceId,
        license: g.license,
        citation: g.citation,
        retrievedAt: nowIso,
      });
    }
  }

  return {
    schema: 'aol.scientific_ingest.v1',
    packet: PACKET,
    liveClaim: false,
    recordsIn: rows.length,
    recordsAccepted: accepted.length,
    provenance,
    conflicts,
    synonymEdges,
    GLOBAL_DATA_COMPLETE: false,
    ALL_SPECIES_INGESTED: false,
  };
}

export function buildOfflineScientificPack(input: {
  taxaCount: number;
  regionCount: number;
  expeditionCount: number;
  payload: unknown;
}): OfflineScientificPack {
  const body = JSON.stringify(input.payload);
  return {
    schema: 'aol.offline_scientific_pack.v1',
    packet: PACKET,
    packId: 'aol-scientific-bounded-b-pkt-003',
    bounded: true,
    globalComplete: false,
    liveClaim: false,
    taxaCount: input.taxaCount,
    regionCount: input.regionCount,
    expeditionCount: input.expeditionCount,
    sha256: createHash('sha256').update(body).digest('hex'),
    notes:
      'Bounded offline scientific slice for playtest — not a global species dump. '
      + 'GLOBAL_DATA_COMPLETE and ALL_SPECIES_INGESTED remain false.',
  };
}

export function advanceLifelingProgression(xpEvents: number[]): LifelingProgressionReport {
  let xp = 0;
  const steps: LifelingProgressStep[] = [];
  const modules = ['observe', 'scan', 'journal', 'deep_time'];
  const traitsPool = ['curious', 'patient', 'careful', 'bold'];
  for (let i = 0; i < xpEvents.length; i++) {
    xp += xpEvents[i];
    const level = Math.min(5, 1 + Math.floor(xp / 25));
    steps.push({
      level,
      xp,
      unlockedModules: modules.slice(0, Math.min(modules.length, level)),
      traits: traitsPool.slice(0, Math.min(traitsPool.length, level)),
      affinity: level >= 4 ? 'science' : level >= 2 ? 'field' : 'starter',
    });
  }
  const progressionOk =
    steps.length >= 3 &&
    steps[steps.length - 1].level > steps[0].level &&
    steps[steps.length - 1].unlockedModules.length >= 2;
  return {
    schema: 'aol.lifeling_progression.v1',
    packet: PACKET,
    steps,
    progressionOk,
    note: 'Lifeling XP unlocks modules/traits; not a claim of human playtest validation.',
  };
}

export function scoreExpeditionDiversity(
  expeditions: Array<{ id: string; biome: string; regionId: string; objectives: Array<{ type: string }> }>,
): ExpeditionDiversityReport {
  const biomes = [...new Set(expeditions.map((e) => e.biome))];
  const regions = [...new Set(expeditions.map((e) => e.regionId))];
  const objTypes = [...new Set(expeditions.flatMap((e) => e.objectives.map((o) => o.type)))];
  const diversityScore =
    biomes.length * 0.35 + regions.length * 0.35 + Math.min(objTypes.length, 6) * 0.3 / 6 * 10;
  const diversityOk = expeditions.length >= 3 && biomes.length >= 2 && objTypes.length >= 3;
  return {
    schema: 'aol.expedition_diversity.v1',
    packet: PACKET,
    expeditionCount: expeditions.length,
    uniqueBiomes: biomes,
    uniqueRegions: regions,
    objectiveTypeCoverage: objTypes,
    diversityScore: Number(diversityScore.toFixed(3)),
    diversityOk,
  };
}

export function buildPlaytestPacket(): PlaytestPacket {
  return {
    schema: 'aol.playtest_packet.v1',
    packet: PACKET,
    HUMAN_PLAYTEST_VALIDATED: false,
    GLOBAL_DATA_COMPLETE: false,
    ALL_SPECIES_INGESTED: false,
    scriptedBeats: [
      { id: 'start_expedition', label: 'Start a field expedition in a distinct biome', done: false },
      { id: 'collect_with_provenance', label: 'Collect artifact with provenance citations', done: false },
      { id: 'resolve_conflict_note', label: 'Note a scientific name conflict / synonym edge', done: false },
      { id: 'lifeling_progress', label: 'Advance Lifeling XP and unlock a module', done: false },
      { id: 'second_biome', label: 'Visit a second biome for expedition diversity', done: false },
    ],
    instructions: [
      'Use offline scientific pack only — no live global crawl.',
      'Record honesty: HUMAN_PLAYTEST_VALIDATED stays false until a human signs the packet.',
      'Do not set GLOBAL_DATA_COMPLETE or ALL_SPECIES_INGESTED.',
    ],
    claim_boundary:
      'Playtest packet is a scripted checklist for humans. Digital agent runs do not earn HUMAN_PLAYTEST_VALIDATED.',
  };
}

export function emitStreamBPkt003Artifacts(root = process.cwd()): Record<string, unknown> {
  const outDir = join(root, 'artifacts', 'stream_b');
  mkdirSync(outDir, { recursive: true });

  const fixtureRows: ScientificRecord[] = [
    {
      taxonId: 'taxon_panthera_leo',
      scientificName: 'Panthera leo',
      sourceId: 'col',
      license: 'CC0',
      citation: 'Catalogue of Life fixture slice',
    },
    {
      taxonId: 'taxon_panthera_leo',
      scientificName: 'Felis leo',
      sourceId: 'gbif',
      license: 'CC BY 4.0',
      citation: 'GBIF fixture synonym row',
    },
    {
      taxonId: 'taxon_quercus_alba',
      scientificName: 'Quercus alba',
      sourceId: 'col',
      license: 'CC0',
      citation: 'Catalogue of Life fixture slice',
    },
    {
      taxonId: 'taxon_ammonite_a',
      scientificName: 'Asteroceras stellare',
      sourceId: 'pbdb',
      license: 'CC0',
      citation: 'PBDB fixture slice',
    },
  ];

  const ingest = ingestScientificBatch(fixtureRows);
  const expeditionsPath = join(root, 'public', 'data', 'bundles', 'expeditions.json');
  let expeditions: Array<{ id: string; biome: string; regionId: string; objectives: Array<{ type: string }> }> = [
    {
      id: 'exp_savanna_dawn',
      biome: 'savanna',
      regionId: 'savanna',
      objectives: [{ type: 'visit_region' }, { type: 'observe_species' }, { type: 'journal_entry' }],
    },
    {
      id: 'exp_forest_canopy',
      biome: 'forest',
      regionId: 'forest',
      objectives: [{ type: 'collect_artifact' }, { type: 'discover_clue' }],
    },
    {
      id: 'exp_deep_time',
      biome: 'deep_time',
      regionId: 'carboniferous',
      objectives: [{ type: 'view_time_unit' }, { type: 'scan_taxon' }, { type: 'journal_entry' }],
    },
  ];
  if (existsSync(expeditionsPath)) {
    try {
      const raw = JSON.parse(readFileSync(expeditionsPath, 'utf8')) as unknown;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { expeditions?: unknown }).expeditions)
          ? (raw as { expeditions: unknown[] }).expeditions
          : [];
      if (list.length >= 3) {
        expeditions = list.map((e: any, i: number) => ({
          id: String(e.id || `exp_${i}`),
          biome: String(e.biome || e.regionId || `biome_${i}`),
          regionId: String(e.regionId || e.biome || `region_${i}`),
          objectives: Array.isArray(e.objectives)
            ? e.objectives.map((o: any) => ({ type: String(o.type || 'visit_region') }))
            : [{ type: 'visit_region' }],
        }));
      }
    } catch {
      /* keep defaults */
    }
  }

  const diversity = scoreExpeditionDiversity(expeditions);
  const lifeling = advanceLifelingProgression([10, 20, 25, 30]);
  const offline = buildOfflineScientificPack({
    taxaCount: ingest.recordsAccepted,
    regionCount: diversity.uniqueRegions.length,
    expeditionCount: diversity.expeditionCount,
    payload: { ingest, diversity, lifeling },
  });
  const playtest = buildPlaytestPacket();

  const state = {
    schema: 'aol.stream_b_pkt_003_state.v1',
    packet: PACKET,
    scientific_ingest: ingest,
    offline_scientific_pack: offline,
    lifeling_progression: lifeling,
    expedition_diversity: diversity,
    playtest_packet: playtest,
    HUMAN_PLAYTEST_VALIDATED: false,
    GLOBAL_DATA_COMPLETE: false,
    ALL_SPECIES_INGESTED: false,
    claim_boundary:
      'Bounded scientific ingest with provenance + conflict handling, Lifeling progression, '
      + 'expedition diversity, and a human playtest packet. No global completeness. Cursor NEVER merges.',
  };

  writeFileSync(join(outDir, 'SCIENTIFIC_INGEST_REPORT.json'), JSON.stringify(ingest, null, 2) + '\n');
  writeFileSync(join(outDir, 'OFFLINE_SCIENTIFIC_PACK.json'), JSON.stringify(offline, null, 2) + '\n');
  writeFileSync(join(outDir, 'LIFELING_PROGRESSION.json'), JSON.stringify(lifeling, null, 2) + '\n');
  writeFileSync(join(outDir, 'EXPEDITION_DIVERSITY.json'), JSON.stringify(diversity, null, 2) + '\n');
  writeFileSync(join(outDir, 'PLAYTEST_PACKET.json'), JSON.stringify(playtest, null, 2) + '\n');
  writeFileSync(join(outDir, 'STREAM_B_PKT_003_ARCHIVE_STATE.json'), JSON.stringify(state, null, 2) + '\n');
  return state;
}
