import type { Taxonomy } from './taxonomy';
import type { ConservationProfile } from './conservation';
import type { DistributionProfile } from './distribution';
import type { FossilProfile } from './fossil';
import type { ArtifactTemplate } from './artifact';
import type { DataSourceProvenance } from './provenance';
import type { HabitatSignal, NasaLayerDependency } from './earth';

export type GameplayTier = 'hero' | 'regional' | 'family' | 'database';

export interface GameplayProfile {
  region: string;
  questType: string;
  dangerLevel: number;
  ethicalInteraction: string;
  timeRange: string;
  diet: string;
  activity: string;
  size: string;
  behavior: string;
  learningTopics: string[];
  funFacts: string[];
  whyItMatters: string;
  fossilLocations?: string[];
  livingRelatives?: string[];
}

export interface ArchiveSpecies {
  id: string;
  commonName: string;
  scientificName: string;
  group: string;
  taxonomy: Taxonomy;
  tier: GameplayTier;
  conservation?: ConservationProfile;
  distribution?: DistributionProfile;
  fossil?: FossilProfile;
  artifactTemplates: ArtifactTemplate[];
  gameplay?: GameplayProfile;
  /** Environmental signals this species needs — linked to NASA Earth layers */
  requiredHabitatSignals?: HabitatSignal[];
  /** NASA data products that inform understanding of this species */
  nasaLayerDependencies?: NasaLayerDependency[];
  provenance: DataSourceProvenance[];
}

/** Lightweight index entry — safe to paginate across millions */
export interface SpeciesIndexEntry {
  id: string;
  commonName: string;
  scientificName: string;
  group: string;
  family: string;
  tier: GameplayTier;
  region?: string;
  iucnCategory?: string;
  isExtinct: boolean;
  isThreatened: boolean;
  isPlayable: boolean;
}

export interface SpeciesSearchIndex {
  snapshotId: string;
  version: string;
  totalCount: number;
  entries: SpeciesIndexEntry[];
}
