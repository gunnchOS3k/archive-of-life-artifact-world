/**
 * Museum hub + ArchiveDex presentation honesty.
 * Authored floors and identity candidates only — never Earth-complete / source_verified release.
 */

import {
  FLAGSHIP_OBSERVATION_PROFILES,
  flagshipArtStatusLabel,
  listFlagshipTaxonIds,
  type FlagshipObservationProfile,
} from '@/services/flagshipTaxonProfiles';
import { getSpeciesIcon } from '@/services/speciesRepresentation';
import {
  getRegionExplorationCard,
  REGION_EXPLORATION_CARDS,
} from '@/systems/regionExploration';

export type MuseumDexClaimClass =
  | 'game_authored_floor'
  | 'sample_fallback'
  | 'blocked_external'
  | 'source_verified';

export interface MuseumHubPresentation {
  regionId: 'museum';
  title: string;
  subtitle: string;
  exploreRegionCount: number;
  flagshipCount: number;
  earthCompleteClaim: false;
  productionReadyClaim: false;
  sourceVerifiedReleaseClaim: false;
  temporalMapsHonesty: '0/17 full-Earth maps source-verified — blocked';
  iucnHonesty: 'IUCN blocked_external until owner token + rights review';
  objectives: string[];
  ariaLabel: string;
}

export interface ArchiveDexEntryPresentation {
  taxonId: string;
  scientificName: string;
  representationMark: string;
  artStatusLabel: string;
  claimClass: MuseumDexClaimClass;
  iucnAssessed: false;
  finishedModelClaimed: false;
  ariaLabel: string;
}

export function buildMuseumHubPresentation(): MuseumHubPresentation {
  const museum = getRegionExplorationCard('museum');
  const exploreCount = REGION_EXPLORATION_CARDS.filter((c) => c.regionId !== 'museum').length;
  const flagshipCount = listFlagshipTaxonIds().length;
  const title = museum?.displayName ?? 'Archive of Life Museum';
  const subtitle =
    'Museum hub for expeditions, ArchiveDex, and Lifelings — authored floors, not Earth-complete science.';
  return {
    regionId: 'museum',
    title,
    subtitle,
    exploreRegionCount: exploreCount,
    flagshipCount,
    earthCompleteClaim: false,
    productionReadyClaim: false,
    sourceVerifiedReleaseClaim: false,
    temporalMapsHonesty: '0/17 full-Earth maps source-verified — blocked',
    iucnHonesty: 'IUCN blocked_external until owner token + rights review',
    objectives: museum?.objectives ?? [],
    ariaLabel: `${title}. ${subtitle} Explore regions: ${exploreCount}. Flagship taxa: ${flagshipCount}. Maps: 0 of 17 source-verified. IUCN blocked.`,
  };
}

export function buildArchiveDexEntryPresentation(
  taxonId: string,
): ArchiveDexEntryPresentation | null {
  const profile: FlagshipObservationProfile | undefined =
    FLAGSHIP_OBSERVATION_PROFILES[taxonId];
  if (!profile) return null;
  const mark = getSpeciesIcon({
    id: profile.taxonId,
    scientificName: profile.scientificName,
  });
  const artStatusLabel = flagshipArtStatusLabel(profile);
  return {
    taxonId: profile.taxonId,
    scientificName: profile.scientificName,
    representationMark: mark,
    artStatusLabel,
    claimClass: 'game_authored_floor',
    iucnAssessed: false,
    finishedModelClaimed: false,
    ariaLabel: `ArchiveDex entry ${profile.scientificName}. ${artStatusLabel}. IUCN assessed false. Not source-verified release.`,
  };
}

export function listArchiveDexFlagshipPresentations(): ArchiveDexEntryPresentation[] {
  return listFlagshipTaxonIds()
    .map((id) => buildArchiveDexEntryPresentation(id))
    .filter((entry): entry is ArchiveDexEntryPresentation => entry !== null);
}

/** Fail closed if presentation ever claims production / Earth-complete / IUCN assessed. */
export function assertMuseumDexHonesty(
  hub: MuseumHubPresentation,
  entries: ArchiveDexEntryPresentation[],
): void {
  if (hub.earthCompleteClaim || hub.productionReadyClaim || hub.sourceVerifiedReleaseClaim) {
    throw new Error('Museum hub must not claim Earth-complete / production / source_verified release');
  }
  if (!hub.temporalMapsHonesty.includes('0/17')) {
    throw new Error('Museum hub must retain 0/17 temporal map honesty');
  }
  for (const entry of entries) {
    if (entry.iucnAssessed || entry.finishedModelClaimed) {
      throw new Error(`ArchiveDex ${entry.taxonId}: assessed/finished claims forbidden without approval`);
    }
    if (entry.claimClass === 'source_verified') {
      throw new Error(`ArchiveDex ${entry.taxonId}: source_verified presentation forbidden for flagship floor`);
    }
  }
}
