/**
 * Biome / time-period encounter tables driven by authored + provenanced species.
 * Soft random walks and walk-up targets — never invented taxa blobs.
 */

import type { PlayableSpecies } from '@/services/DataCatalogService';

export type EncounterKind = 'walk_up' | 'soft_random';

export interface EncounterCandidate {
  speciesId: string;
  species: PlayableSpecies;
  weight: number;
  kind: EncounterKind;
  ethicalFlow: 'observe' | 'excavate';
  biome: string;
  timeUnitIds: string[];
}

export interface EncounterTable {
  regionId: string;
  biome: string;
  timePeriodId: string | null;
  candidates: EncounterCandidate[];
}

export interface EncounterRoll {
  candidate: EncounterCandidate | null;
  reason: 'hit' | 'empty_table' | 'filtered_out' | 'miss';
}

export interface EncounterBuildInput {
  regionId: string;
  biome: string;
  species: PlayableSpecies[];
  /** Active Time Atlas period/unit; null = present-day / no filter */
  timePeriodId?: string | null;
  /** Already-documented species skip soft-random re-rolls (walk-up still allowed) */
  collectedIds?: Set<string>;
}

const SOFT_ENCOUNTER_BASE_CHANCE = 0.12;

function ethicalFlowFor(species: PlayableSpecies): 'observe' | 'excavate' {
  return species.conservationStatus === 'Extinct' ? 'excavate' : 'observe';
}

function weightFor(species: PlayableSpecies): number {
  // Hero / lower danger = more likely soft encounters; never invent weight from thin air.
  const danger = Math.max(0, Math.min(5, species.dangerLevel ?? 1));
  return Math.max(1, 6 - danger);
}

function matchesTimePeriod(species: PlayableSpecies, timePeriodId: string | null | undefined): boolean {
  if (!timePeriodId || timePeriodId === 'all' || timePeriodId === 'present' || timePeriodId === 'holocene') {
    // Present / holocene / unset: exclude deep-time-only fossils that lack holocene/pleistocene.
    if (!timePeriodId || timePeriodId === 'all' || timePeriodId === 'present') {
      return true;
    }
  }
  const units = species.timeUnitIds ?? [];
  if (units.length === 0) {
    // Authored species without time units stay available in present exploration only.
    return !timePeriodId || timePeriodId === 'all' || timePeriodId === 'present' || timePeriodId === 'holocene';
  }
  return units.includes(timePeriodId!);
}

/**
 * Build an encounter table from region-loaded, provenanced species only.
 * Empty when no authored species remain after time filters — never fabricates taxa.
 */
export function buildEncounterTable(input: EncounterBuildInput): EncounterTable {
  const timePeriodId = input.timePeriodId ?? null;
  const candidates: EncounterCandidate[] = [];

  for (const species of input.species) {
    if (!species?.id || !species.scientificName) continue;
    if (!matchesTimePeriod(species, timePeriodId)) continue;

    const flow = ethicalFlowFor(species);
    candidates.push({
      speciesId: species.id,
      species,
      weight: weightFor(species),
      kind: 'walk_up',
      ethicalFlow: flow,
      biome: input.biome,
      timeUnitIds: species.timeUnitIds ?? [],
    });
  }

  return {
    regionId: input.regionId,
    biome: input.biome,
    timePeriodId,
    candidates,
  };
}

export function filterEncounterTable(
  table: EncounterTable,
  opts: { collectedIds?: Set<string>; softOnly?: boolean } = {},
): EncounterCandidate[] {
  let list = table.candidates;
  if (opts.softOnly && opts.collectedIds) {
    list = list.filter((c) => !opts.collectedIds!.has(c.speciesId));
  }
  return list;
}

function pickWeighted(
  candidates: EncounterCandidate[],
  rng: () => number,
): EncounterCandidate | null {
  if (!candidates.length) return null;
  const total = candidates.reduce((s, c) => s + c.weight, 0);
  let roll = rng() * total;
  for (const c of candidates) {
    roll -= c.weight;
    if (roll <= 0) return { ...c, kind: 'soft_random' };
  }
  return { ...candidates[candidates.length - 1], kind: 'soft_random' };
}

/**
 * Soft random encounter while exploring — low chance, provenance-backed species only.
 */
export function rollSoftEncounter(
  table: EncounterTable,
  opts: {
    collectedIds?: Set<string>;
    chance?: number;
    rng?: () => number;
  } = {},
): EncounterRoll {
  const rng = opts.rng ?? Math.random;
  const chance = opts.chance ?? SOFT_ENCOUNTER_BASE_CHANCE;
  const pool = filterEncounterTable(table, { collectedIds: opts.collectedIds, softOnly: true });
  if (!table.candidates.length) return { candidate: null, reason: 'empty_table' };
  if (!pool.length) return { candidate: null, reason: 'filtered_out' };
  if (rng() > chance) return { candidate: null, reason: 'miss' };
  const candidate = pickWeighted(pool, rng);
  return candidate ? { candidate, reason: 'hit' } : { candidate: null, reason: 'miss' };
}

export function describeEthicalPrompt(candidate: EncounterCandidate): string {
  if (candidate.ethicalFlow === 'excavate') {
    return `Excavate fossil of ${candidate.species.commonName} (${candidate.species.scientificName}) — document only, never invent taxa.`;
  }
  return `Observe ${candidate.species.commonName} (${candidate.species.scientificName}) — ethical field note, no capture.`;
}
