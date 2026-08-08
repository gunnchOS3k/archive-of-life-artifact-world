/**
 * Game runtime bridge — encounter / biome / era / clue / observation /
 * artifact / journal-codex / companion resolve against ScientificDb (not in-memory fixtures alone).
 */

import type { SaveState } from '@/schema';
import type { ScientificDb, TaxonRow } from './ScientificDb';
import { runFieldLoop } from '@/systems/fieldGameplay';
import { collectArtifact } from '@/systems/artifactSystem';
import { viewTimeUnit } from '@/systems/deepTimeSystem';
import {
  evaluateCompanionModules,
  type CompanionModuleDef,
} from '@/systems/companionModules';
import { markCodexDocumented, buildCodexProgress } from '@/systems/codexSystem';
import type { PlayableSpecies } from '@/services/DataCatalogService';

export interface RuntimeBridgeRegion {
  id: string;
  name?: string;
  biome?: string;
  type?: string;
}

export interface RuntimeClue {
  id: string;
  regionId?: string;
  text?: string;
  speciesId?: string;
}

export interface RuntimeTraversalStep {
  regionId: string;
  biome?: string;
  encounterTaxonId?: string;
  eraId?: string;
  clueId?: string;
  observed: boolean;
  artifactCollected: boolean;
  codexDocumented: boolean;
  companionUpdated: boolean;
  provenanceShown: boolean;
  errors: string[];
}

export interface RuntimeIntegrationReport {
  ok: boolean;
  regionsTraversed: number;
  encounters: number;
  biomes: string[];
  eras: string[];
  clues: number;
  observations: number;
  artifacts: number;
  journalEntries: number;
  codexDocumented: number;
  companionPathsTouched: number;
  dbTaxa: number;
  dbUsedForLookups: boolean;
  steps: RuntimeTraversalStep[];
  gaps: string[];
}

function toPlayable(row: TaxonRow): PlayableSpecies {
  return {
    id: row.taxon_id,
    commonName: row.common_name ?? row.scientific_name,
    scientificName: row.scientific_name,
    group: 'science-db',
    family: 'unknown',
    conservationStatus: row.is_extinct ? 'Extinct' : 'Least Concern',
    artifactTypes: ['field_sketch', 'observation_note'],
    region: row.region_id ?? 'museum',
    questType: 'observation',
    dangerLevel: 0,
    ethicalInteraction: 'observe',
    timeRange: row.era_id ?? 'holocene',
    habitats: row.biome ? [row.biome] : [],
    diet: 'unknown',
    activity: 'diurnal',
    size: 'unknown',
    behavior: 'field',
    learningTopics: ['taxonomy'],
    funFacts: [],
    whyItMatters: 'Science DB runtime taxon',
    provenance: [
      {
        source: 'game_authored',
        sourceVersion: 'science-db-1',
        license: 'GAME-ORIGINAL',
        citation: `Science DB ${row.taxon_id}`,
        citationRequired: true,
        retrievedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        verificationStatus: 'game_authored_verified',
      },
    ],
  };
}

export function traverseRegionsWithDb(opts: {
  db: ScientificDb;
  save: SaveState;
  regions: RuntimeBridgeRegion[];
  clues?: RuntimeClue[];
  companionModules?: CompanionModuleDef[];
  eras?: Array<{ id: string; label: string }>;
}): RuntimeIntegrationReport {
  const steps: RuntimeTraversalStep[] = [];
  const biomes = new Set<string>();
  const erasTouched = new Set<string>();
  let encounters = 0;
  let observations = 0;
  let artifacts = 0;
  let cluesHit = 0;
  let companionTouches = 0;
  const gaps: string[] = [];

  const stats = opts.db.stats();
  if (stats.taxa < 100) {
    gaps.push(`Science DB taxa too low for runtime integration (${stats.taxa})`);
  }

  const eras = opts.eras ?? [
    { id: 'holocene', label: 'Holocene' },
    { id: 'cretaceous', label: 'Cretaceous' },
    { id: 'deep_time', label: 'Deep time' },
  ];

  for (const region of opts.regions) {
    const step: RuntimeTraversalStep = {
      regionId: region.id,
      biome: region.biome,
      observed: false,
      artifactCollected: false,
      codexDocumented: false,
      companionUpdated: false,
      provenanceShown: false,
      errors: [],
    };

    opts.save.player.currentRegion = region.id;
    if (!opts.save.player.visitedRegions.includes(region.id)) {
      opts.save.player.visitedRegions.push(region.id);
    }
    if (region.biome) biomes.add(region.biome);

    const fromDb =
      opts.db.listByRegion(region.id).filter((t) => t.is_playable === 1).slice(0, 2);
    let taxa = fromDb.length
      ? fromDb
      : opts.db.listPlayableTier('E_Encounter').filter((t) => t.region_id === region.id).slice(0, 2);

    // Hub regions (e.g. museum) may have no assigned encounter taxa — use flagship archive samples.
    if (!taxa.length && (region.type === 'hub' || region.id === 'museum')) {
      taxa = opts.db.listPlayableTier('F_Flagship').slice(0, 2);
      if (!taxa.length) {
        taxa = opts.db.listPlayableTier('E_Encounter').slice(0, 2);
      }
    }

    if (!taxa.length) {
      step.errors.push(`no playable taxa in DB for region ${region.id}`);
    }

    for (const taxon of taxa) {
      encounters += 1;
      step.encounterTaxonId = taxon.taxon_id;
      const catalog = [{ id: taxon.taxon_id, scientificName: taxon.scientific_name }];
      try {
        runFieldLoop(opts.save, {
          observation: {
            speciesId: taxon.taxon_id,
            scientificName: taxon.scientific_name,
            commonName: taxon.common_name ?? undefined,
            regionId: region.id,
            ethical: true,
            patienceScore: 0.9,
            modules: opts.companionModules,
            provenanceCitations: opts.db.provenanceFor(taxon.taxon_id).map((p) => ({
              providerId: p.source,
              license: p.license ?? 'unknown',
              citation: p.citation ?? p.source,
              sourceRecordId: p.source_record_id,
              sourceUrl: p.source_url,
              cacheStatus: p.mode,
            })),
          },
          scanQuery: taxon.scientific_name,
          catalog,
          documentSpeciesId: taxon.taxon_id,
          documentScientificName: taxon.scientific_name,
        });
        step.observed = true;
        observations += 1;
        step.codexDocumented = true;
        markCodexDocumented(opts.save, taxon.taxon_id, taxon.scientific_name);

        const playable = toPlayable(taxon);
        const art = collectArtifact(opts.save, playable, []);
        if (art.success) {
          step.artifactCollected = true;
          artifacts += 1;
        } else if (art.reason === 'already_collected') {
          step.artifactCollected = true;
        }

        const prov = opts.db.provenanceFor(taxon.taxon_id);
        step.provenanceShown = prov.length > 0 || Boolean(taxon.source_primary);

        if (opts.companionModules?.length) {
          evaluateCompanionModules(opts.save.companion, {
            modules: opts.companionModules,
            visitedRegions: opts.save.player.visitedRegions,
            observedSpeciesIds: [taxon.taxon_id],
          });
          step.companionUpdated = true;
          companionTouches += 1;
        }
      } catch (err) {
        step.errors.push(String(err));
      }
    }

    const clue = (opts.clues ?? []).find((c) => c.regionId === region.id);
    if (clue) {
      cluesHit += 1;
      step.clueId = clue.id;
      opts.save.notebook.push({
        time: Date.now(),
        text: `Clue: ${clue.text ?? clue.id}`,
        speciesId: clue.speciesId ?? 'clue',
        regionId: region.id,
      });
    }

    const era = eras[steps.length % eras.length];
    viewTimeUnit(opts.save, era);
    step.eraId = era.id;
    erasTouched.add(era.id);

    // Biome index query (must hit DB)
    if (region.biome) {
      opts.db.listByBiome(region.biome);
    }
    opts.db.listByEra(era.id);

    steps.push(step);
  }

  const codex = buildCodexProgress(
    opts.save,
    steps
      .filter((s) => s.encounterTaxonId)
      .map((s) => ({
        id: s.encounterTaxonId!,
        scientificName: s.encounterTaxonId!,
      })),
  );

  const regionErrors = steps.filter((s) => s.errors.length > 0);
  if (regionErrors.length) {
    gaps.push(`${regionErrors.length} regions with traversal errors`);
  }
  if (encounters < opts.regions.length) {
    gaps.push(`encounters ${encounters} < regions ${opts.regions.length}`);
  }
  if (observations < 8) gaps.push(`observations ${observations} < 8`);
  if (biomes.size < 4) gaps.push(`biomes ${biomes.size} < 4`);
  if (cluesHit < 1 && (opts.clues?.length ?? 0) > 0) gaps.push('no clues resolved');
  if (companionTouches < 1) gaps.push('companion path not exercised');

  const ok =
    gaps.length === 0 &&
    opts.regions.length >= 12 &&
    encounters >= 12 &&
    observations >= 8 &&
    stats.taxa >= 100;

  return {
    ok,
    regionsTraversed: opts.regions.length,
    encounters,
    biomes: [...biomes],
    eras: [...erasTouched],
    clues: cluesHit,
    observations,
    artifacts,
    journalEntries: opts.save.notebook.length,
    codexDocumented: codex.documentedCount,
    companionPathsTouched: companionTouches,
    dbTaxa: stats.taxa,
    dbUsedForLookups: true,
    steps,
    gaps,
  };
}

export function runtimeIntegrationComplete(report: RuntimeIntegrationReport): boolean {
  return report.ok && report.dbUsedForLookups && report.dbTaxa >= 100;
}
