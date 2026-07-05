import type { DataSourceProvenance } from './provenance';
import type { RepresentationTier, TaxonLifeStatus } from '@/time/schema';

export type ArchiveDexEntryStatus = 'undocumented' | 'discovered' | 'studied';
export type ArchiveDexTabId =
  | 'overview'
  | 'identity'
  | 'taxonomy'
  | 'time'
  | 'habitat'
  | 'body'
  | 'behavior'
  | 'diet'
  | 'lifecycle'
  | 'ecology'
  | 'conservation'
  | 'artifacts'
  | 'earth'
  | 'human'
  | 'lifeling'
  | 'media'
  | 'sources';

export const ARCHIVEDEX_TAB_LABELS: Record<ArchiveDexTabId, string> = {
  overview: 'Overview',
  identity: 'Identity',
  taxonomy: 'Taxonomy',
  time: 'Time',
  habitat: 'Habitat & Range',
  body: 'Body & Traits',
  behavior: 'Behavior',
  diet: 'Diet & Food Web',
  lifecycle: 'Life Cycle',
  ecology: 'Ecology',
  conservation: 'Conservation',
  artifacts: 'Artifacts & Evidence',
  earth: 'Earth Systems',
  human: 'Human Connections',
  lifeling: 'Lifeling Unlocks',
  media: 'Media',
  sources: 'Sources & Uncertainty',
};

export interface ArchiveDexOverview {
  shortDescription?: string;
  whyItMatters?: string;
  playerFieldNote?: string;
  discoveryRegion?: string;
  discoveryDate?: string;
  completionPercent?: number;
}

export interface TaxonomyProfile {
  domain?: string;
  kingdom?: string;
  phylum?: string;
  className?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
  subspecies?: string;
  rank?: string;
  acceptedName?: string;
  synonyms?: string[];
  parentTaxon?: string;
  relatedTaxa?: string[];
  taxonomyConfidence?: string;
  taxonomyLastUpdated?: string;
  sourceIds?: {
    catalogueOfLifeId?: string;
    gbifTaxonKey?: number;
    iucnTaxonId?: number;
    paleobiodbTaxonNo?: number;
  };
}

export interface TimeProfile {
  timeUnitIds?: string[];
  firstAppearanceMa?: number | null;
  lastAppearanceMa?: number | null;
  timeRangeLabel?: string;
  eon?: string;
  era?: string;
  period?: string;
  epoch?: string;
  age?: string;
  confidence?: string;
  massExtinctionEvents?: string[];
  evolutionaryEvents?: string[];
  ancientEnvironment?: string;
  fossilRecordLimitations?: string;
  relatedTimeTaxa?: string[];
}

export interface HabitatRangeProfile {
  continents?: string[];
  countries?: string[];
  biomes?: string[];
  habitats?: string[];
  elevationRange?: string;
  depthRange?: string;
  migration?: string;
  endemicStatus?: string;
  fossilLocations?: string[];
  formations?: string[];
  paleoenvironment?: string;
  inGameClue?: string;
  bestExpeditionConditions?: string;
  requiredTools?: string[];
  habitatThreats?: string[];
}

export interface BodyTraitsProfile {
  size?: string;
  weight?: string;
  bodyPlan?: string;
  covering?: string;
  keyFeatures?: string[];
  sexualDimorphism?: string;
  adaptations?: string[];
  locomotion?: string;
  fossilAnatomy?: string[];
  reconstructionConfidence?: string;
}

export interface BehaviorProfile {
  activity?: string;
  socialStructure?: string;
  communication?: string[];
  movement?: string;
  defense?: string;
  fieldSafety?: string;
  behaviorEvidence?: string[];
  speculationWarning?: string;
}

export interface DietFoodWebProfile {
  dietCategory?: string;
  mainFoods?: string[];
  trophicLevel?: string;
  predators?: string[];
  prey?: string[];
  competitors?: string[];
  ecosystemRole?: string;
  foodWebDiagram?: string;
}

export interface LifeCycleProfile {
  reproduction?: string;
  offspring?: string;
  parenting?: string;
  lifespan?: string;
  growthStages?: string[];
  metamorphosis?: string;
}

export interface EcologyProfile {
  roles?: string[];
  keystoneStatus?: string;
  relationships?: string[];
  ecosystemImpact?: string;
  ecosystemServices?: string[];
  climateSensitivity?: string;
}

export interface ArchiveDexConservationProfile {
  iucnCategory?: string;
  assessed?: boolean;
  threatened?: boolean;
  populationTrend?: string;
  majorThreats?: string[];
  conservationActions?: string[];
  extinctionCauses?: string[];
  whyConservationMatters?: string;
}

export interface ArtifactsEvidenceProfile {
  collectedArtifactTypes?: string[];
  availableArtifacts?: Array<{ id: string; type: string; ethical: boolean; label: string }>;
  evidenceStrength?: string;
  ethicalRules?: string[];
  requiredTools?: string[];
}

export interface EarthSystemsProfile {
  climateSensitivity?: string;
  environmentalDependencies?: string[];
  habitatSignals?: string[];
}

export interface HumanConnectionsProfile {
  culturalNotes?: string[];
  humanWildlifeConflict?: string;
  ethicalViewingRules?: string[];
  communityConservation?: string[];
  scientificDiscovery?: string;
}

export interface LifelingUnlockProfile {
  unlocks?: Array<{
    traitId: string;
    traitName: string;
    category: string;
    unlockCondition: string;
  }>;
  masteryBadge?: string;
}

export interface MediaProfile {
  images?: string[];
  audio?: string[];
  playerPhotos?: string[];
  licenseNotes?: string[];
}

export interface UncertaintyProfile {
  missingFields?: string[];
  taxonomicUncertainty?: string | null;
  rangeUncertainty?: string | null;
  fossilUncertainty?: string | null;
  conservationUncertainty?: string | null;
  notes?: string;
  unknownToScience?: string[];
}

/** Full Known Life Entry — the ArchiveDex encyclopedia record */
export interface ArchiveDexEntry {
  id: string;
  archiveNumber?: string;
  commonName: string;
  scientificName: string;
  pronunciation?: string;
  nameMeaning?: string;
  group: string;
  lifeStatus: TaxonLifeStatus;
  representationTier: RepresentationTier;
  entryStatus: ArchiveDexEntryStatus;
  region?: string;
  overview?: ArchiveDexOverview;
  identity?: {
    similarSpecies?: string[];
    identificationTips?: string[];
    fieldMarks?: string[];
    misidentifications?: string[];
    identificationConfidence?: string;
    fossilIdentification?: string[];
    debatedClassification?: string;
  };
  taxonomy: TaxonomyProfile;
  time?: TimeProfile;
  habitatRange?: HabitatRangeProfile;
  bodyTraits?: BodyTraitsProfile;
  behavior?: BehaviorProfile;
  dietFoodWeb?: DietFoodWebProfile;
  lifeCycle?: LifeCycleProfile;
  ecology?: EcologyProfile;
  conservation?: ArchiveDexConservationProfile;
  artifactsEvidence?: ArtifactsEvidenceProfile;
  earthSystems?: EarthSystemsProfile;
  humanConnections?: HumanConnectionsProfile;
  lifeling?: LifelingUnlockProfile;
  media?: MediaProfile;
  sources: DataSourceProvenance[];
  uncertainty?: UncertaintyProfile;
}

export interface ArchiveDexProfileOverlay {
  id: string;
  archiveNumber?: string;
  pronunciation?: string;
  nameMeaning?: string;
  overview?: ArchiveDexOverview;
  identity?: ArchiveDexEntry['identity'];
  taxonomy?: Partial<TaxonomyProfile>;
  time?: Partial<TimeProfile>;
  habitatRange?: Partial<HabitatRangeProfile>;
  bodyTraits?: Partial<BodyTraitsProfile>;
  behavior?: Partial<BehaviorProfile>;
  dietFoodWeb?: Partial<DietFoodWebProfile>;
  lifeCycle?: Partial<LifeCycleProfile>;
  ecology?: Partial<EcologyProfile>;
  conservation?: Partial<ArchiveDexConservationProfile>;
  artifactsEvidence?: Partial<ArtifactsEvidenceProfile>;
  earthSystems?: Partial<EarthSystemsProfile>;
  humanConnections?: Partial<HumanConnectionsProfile>;
  lifeling?: Partial<LifelingUnlockProfile>;
  media?: Partial<MediaProfile>;
  uncertainty?: Partial<UncertaintyProfile>;
}

export interface ArchiveDexProfilesBundle {
  snapshotId: string;
  version: string;
  profiles: ArchiveDexProfileOverlay[];
}

export interface ArchiveDexCompletionScope {
  region?: string;
  timePeriod?: string;
  group?: string;
  heroOnly?: boolean;
}

export interface ArchiveDexCompletionStats {
  scope: string;
  documented: number;
  total: number;
  percent: number;
  label: string;
}

export interface ArchiveDexSearchFilters {
  query?: string;
  group?: string;
  region?: string;
  conservationStatus?: string;
  threatenedOnly?: boolean;
  extinctOnly?: boolean;
  extantOnly?: boolean;
  fossilOnly?: boolean;
  collectedFilter?: 'all' | 'collected' | 'uncollected';
  tier?: string;
  representationTier?: string;
  timePeriod?: string;
  lifeStatus?: string;
  source?: string;
  heroOnly?: boolean;
  questableOnly?: boolean;
  lifelingUnlockAvailable?: boolean;
  page?: number;
  pageSize?: number;
}
