/**
 * Region exploration depth — authored gameplay loops without Earth-complete claims.
 */

export type RegionExplorationStatus =
  | 'data_registered'
  | 'runtime_playable'
  | 'gameplay_tested'
  | 'final_asset_candidate'
  | 'final_asset_human_approved'
  | 'rc'
  | 'commercial_authorized';

export interface RegionExplorationCard {
  regionId: string;
  displayName: string;
  continents: string[];
  biome: string;
  encounterTaxonIds: string[];
  objectives: string[];
  offlineIntegrityKey: string;
  status: RegionExplorationStatus;
  earthCompleteClaim: false;
  scientificScope: string;
  blockers: string[];
}

const STEPPE_SCOPE =
  'Central Asian Steppe is a game-authored planning twin for Przewalski\'s horse encounters. Not a surveyed Earth-complete regional catalog; external CoL/GBIF/IUCN fields remain quarantined until approved snapshot import.';

/** Authored exploration cards currently deepened in-product. */
export const REGION_EXPLORATION_CARDS: RegionExplorationCard[] = [
  {
    regionId: 'steppe',
    displayName: 'Central Asian Steppe',
    continents: ['Asia'],
    biome: 'steppe',
    encounterTaxonIds: ['equus_caballus_ferus'],
    objectives: [
      'Enter the Asian Steppe portal from the museum hub',
      'Observe Przewalski\'s horse with a horse-correct representation (never lion)',
      'Record a field observation and open ArchiveDex for the collected taxon',
      'Verify offline pack still hashes region-steppe + hero bundles',
    ],
    offlineIntegrityKey: 'regionSteppe',
    status: 'gameplay_tested',
    earthCompleteClaim: false,
    scientificScope: STEPPE_SCOPE,
    blockers: [
      'External source-verified CoL/GBIF/IUCN provenance not yet imported for hero taxa',
      'Human playtest / RC / commercial authorization remain false',
    ],
  },
];

export function getRegionExplorationCard(regionId: string): RegionExplorationCard | undefined {
  return REGION_EXPLORATION_CARDS.find((c) => c.regionId === regionId);
}

export function evaluateRegionExploration(
  _card: RegionExplorationCard,
  evidence: {
    portalReachable: boolean;
    taxonEncountered: boolean;
    iconHonest: boolean;
    observationRecorded: boolean;
    offlineIntegrityOk: boolean;
  },
): {
  complete: boolean;
  status: RegionExplorationStatus;
  earthCompleteClaim: false;
  missing: string[];
} {
  const missing: string[] = [];
  if (!evidence.portalReachable) missing.push('portalReachable');
  if (!evidence.taxonEncountered) missing.push('taxonEncountered');
  if (!evidence.iconHonest) missing.push('iconHonest');
  if (!evidence.observationRecorded) missing.push('observationRecorded');
  if (!evidence.offlineIntegrityOk) missing.push('offlineIntegrityOk');

  const complete = missing.length === 0;
  return {
    complete,
    status: complete ? 'gameplay_tested' : 'runtime_playable',
    earthCompleteClaim: false,
    missing,
  };
}

export function assertNoEarthCompleteClaim(card: RegionExplorationCard): void {
  if (card.earthCompleteClaim !== false) {
    throw new Error(`Region ${card.regionId} must not claim Earth-complete catalog`);
  }
}
