export interface PlayerState {
  x: number;
  y: number;
  currentRegion: string;
  visitedRegions: string[];
}

export interface CollectedArtifact {
  id: string;
  speciesId: string;
  speciesName: string;
  scientificName: string;
  artifactType: string;
  ethical: true;
  collectedAt: number;
  region: string;
}

export interface NotebookProvenanceCite {
  providerId: string;
  license: string;
  citation: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  cacheStatus?: string;
}

export interface NotebookEntry {
  time: number;
  text: string;
  speciesId: string;
  /** Provenance citations for journal depth (COL/GBIF/authored). */
  provenanceCitations?: NotebookProvenanceCite[];
  scientificName?: string;
  regionId?: string;
  timePeriodId?: string | null;
}

export interface CompanionState {
  name: string;
  bodyColor: string;
  equippedTraits: string[];
  unlockedTraits: string[];
  bond: number;
  /** Lifeling progression level (original Archive model). */
  level?: number;
  /** Cumulative observation XP. */
  xp?: number;
  /** Successful ethical observations / excavations. */
  observationCount?: number;
}

export interface QuestState {
  active: string[];
  completed: string[];
}

export interface GameStats {
  artifactsCollected: number;
  speciesDocumented: number;
  regionsExplored: number;
}

export interface EarthLayerProgress {
  viewedTabs: string[];
  analyzedRegions: string[];
}

export interface TimeAtlasProgress {
  viewedTimeUnits: string[];
  viewedGates: string[];
  analyzedPeriods: string[];
  /** Active period/unit filter for encounter tables. */
  activeTimeUnitId?: string | null;
}

export interface SaveState {
  version: number;
  player: PlayerState;
  artifacts: CollectedArtifact[];
  notebook: NotebookEntry[];
  quests: QuestState;
  companion: CompanionState;
  stats: GameStats;
  earthLayers: EarthLayerProgress;
  timeAtlas: TimeAtlasProgress;
  timestamp: number;
}
