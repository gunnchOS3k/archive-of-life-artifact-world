import type { DataSourceProvenance } from '@/schema/provenance';
import type { TaxonomicRank } from '@/schema/taxonomy';

/** Official geologic time ranks per ICS */
export type GeologicTimeRank = 'eon' | 'era' | 'period' | 'epoch' | 'age';

/** Representation depth — every known taxon must exist at tier 0+ */
export type RepresentationTier = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const REPRESENTATION_TIER_LABELS: Record<RepresentationTier, string> = {
  0: 'Archive record',
  1: 'Searchable',
  2: 'Region mapped',
  3: 'Time mapped',
  4: 'Artifact-ready',
  5: 'Questable',
  6: 'Hero taxon',
};

export type TaxonLifeStatus =
  | 'extant'
  | 'extinct'
  | 'fossil_only'
  | 'uncertain'
  | 'microbial_or_pre_animal'
  | 'representative_group';

export interface GeologicTimeUnit {
  id: string;
  name: string;
  rank: GeologicTimeRank;
  parentId: string | null;
  startMa: number;
  endMa: number;
  displayOrder: number;
  description: string;
  majorEvents: string[];
  dominantLife: string[];
  climateSummary: string;
  sourceProvenance: DataSourceProvenance[];
  uncertaintyNotes?: string;
}

export interface GeologicTimeUnitsBundle {
  snapshotId: string;
  version: string;
  source: string;
  isMockData: boolean;
  units: GeologicTimeUnit[];
}

export interface PlayableTimeGate {
  id: string;
  name: string;
  description: string;
  /** Minimum artifacts collected to unlock (0 = always playable) */
  requiredProgress: {
    artifactsCollected: number;
    regionsExplored?: number;
    completedQuests?: string[];
  };
  timeUnitIds: string[];
  availableRegionTypes: string[];
  representativeTaxa: string[];
  fossilArtifactTypes: string[];
  lifelingUnlockThemes: string[];
  educationTopics: string[];
  uncertaintyNotes?: string;
  isPlayable: boolean;
  sourceProvenance: DataSourceProvenance[];
}

export interface PlayableTimeGatesBundle {
  snapshotId: string;
  version: string;
  gates: PlayableTimeGate[];
}

export interface TimeManifest {
  snapshotId: string;
  version: string;
  generatedAt: string;
  description: string;
  isMockData: boolean;
  bundles: {
    geologicTimeUnits: { path: string; recordCount: number };
    playableTimeGates: { path: string; recordCount: number };
    taxonTimeRanges: { path: string; recordCount: number };
  };
  coverage: {
    totalTimeUnits: number;
    playableGates: number;
    taxaWithTimeRanges: number;
    eons: number;
    eras: number;
    periods: number;
    epochs: number;
    ages: number;
  };
}

export interface TaxonTimeRange {
  taxonId: string;
  acceptedName: string;
  rank: TaxonomicRank;
  firstAppearanceMa: number;
  lastAppearanceMa: number;
  timeUnitIds: string[];
  lifeStatus: TaxonLifeStatus;
  source: string;
  sourceVersion: string;
  confidence: 'high' | 'medium' | 'low' | 'uncertain';
  notes?: string;
  provenance: DataSourceProvenance[];
}

export interface TaxonTimeRangesBundle {
  snapshotId: string;
  version: string;
  isMockData: boolean;
  ranges: TaxonTimeRange[];
}
