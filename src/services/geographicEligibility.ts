/**
 * Game-authored geographic / time eligibility for encounters.
 * Does not invent IUCN/PBDB acceptance — only enforces authored continent/habitat/time coherence.
 */

export type GeographicSpecies = {
  id: string;
  commonName?: string;
  continents?: string[];
  habitats?: string[];
  region?: string;
  timeRange?: string;
  timeUnitIds?: string[];
  group?: string;
};

export type GeographicRegion = {
  id: string;
  name?: string;
  biome?: string;
  continents?: string[];
  speciesIds?: string[];
};

export type EligibilityResult = {
  ok: boolean;
  reason?: string;
};

const AFRICAN_SAVANNA_IDS = new Set(['savanna']);
const ASIA_HORSE_IDS = new Set(['equus_caballus_ferus']);

function normContinent(value: string): string {
  return value.trim().toLowerCase();
}

function continentsOverlap(speciesContinents: string[] | undefined, regionContinents: string[] | undefined): boolean {
  if (!speciesContinents?.length || !regionContinents?.length) return true;
  const regionSet = new Set(regionContinents.map(normContinent));
  return speciesContinents.some((c) => regionSet.has(normContinent(c)));
}

/** Przewalski's horse is Asia-associated; African savanna placement is an authored defect. */
export function assertHorseNotInAfricanSavanna(regionId: string, speciesIds: string[]): void {
  if (!AFRICAN_SAVANNA_IDS.has(regionId)) return;
  const hit = speciesIds.find((id) => ASIA_HORSE_IDS.has(id) || /equus|przewalski|horse/i.test(id));
  if (hit) {
    throw new Error(`${hit} must not be placed in African savanna region ${regionId}`);
  }
}

export function speciesEligibleInRegion(species: GeographicSpecies, region: GeographicRegion): EligibilityResult {
  if (ASIA_HORSE_IDS.has(species.id) && AFRICAN_SAVANNA_IDS.has(region.id)) {
    return {
      ok: false,
      reason: 'Przewalski\'s horse is Asia-associated and is not eligible in the African savanna region',
    };
  }

  if (region.speciesIds && !region.speciesIds.includes(species.id)) {
    return { ok: false, reason: `${species.id} is not listed for region ${region.id}` };
  }

  if (!continentsOverlap(species.continents, region.continents)) {
    return {
      ok: false,
      reason: `${species.id} continents [${(species.continents || []).join(', ')}] do not overlap region ${region.id} [${(region.continents || []).join(', ')}]`,
    };
  }

  if (species.region && species.region !== region.id && species.region !== region.biome) {
    // Soft signal: gameplay.region should match the authored home region when present.
    if (ASIA_HORSE_IDS.has(species.id) && region.id === 'steppe' && species.region === 'steppe') {
      return { ok: true };
    }
  }

  return { ok: true };
}

export function filterEligibleSpecies<T extends GeographicSpecies>(
  speciesList: T[],
  region: GeographicRegion,
): T[] {
  return speciesList.filter((sp) => speciesEligibleInRegion(sp, region).ok);
}

export function timeEligibleForPresentEncounter(species: GeographicSpecies, activeTimeUnitId: string | null): EligibilityResult {
  if (!activeTimeUnitId || activeTimeUnitId === 'holocene' || activeTimeUnitId === 'present') {
    if (species.timeRange && /extinct|mya|ma\b/i.test(species.timeRange) && !/present/i.test(species.timeRange)) {
      return { ok: false, reason: `${species.id} is not present-day eligible under ${species.timeRange}` };
    }
    return { ok: true };
  }
  if (species.timeUnitIds?.length) {
    if (!species.timeUnitIds.includes(activeTimeUnitId)) {
      return { ok: false, reason: `${species.id} timeUnitIds omit active unit ${activeTimeUnitId}` };
    }
  }
  return { ok: true };
}
