export type BundleKind =
  | 'hero_species'
  | 'region_species'
  | 'conservation'
  | 'occurrence'
  | 'fossil'
  | 'search_index'
  | 'game_config'
  | 'archive_stubs'
  | 'time_atlas';

export interface BundleRef {
  path: string;
  kind: BundleKind;
  recordCount: number;
  checksum?: string;
}

export interface DataManifest {
  snapshotId: string;
  version: string;
  generatedAt: string;
  description: string;
  bundles: {
    heroSpecies: BundleRef;
    archiveStubs?: BundleRef;
    conservation: BundleRef;
    occurrence: BundleRef;
    fossil: BundleRef;
    searchIndex: BundleRef;
    regions: BundleRef;
    quests: BundleRef;
    traits: BundleRef;
    regionSpecies: Record<string, BundleRef>;
    timeAtlas?: {
      manifest: { path: string; kind: BundleKind };
      geologicTimeUnits: BundleRef;
      playableTimeGates: BundleRef;
      taxonTimeRanges: BundleRef;
    };
  };
  coverage: {
    representedSpecies: number;
    iucnAssessed: number;
    threatened: number;
    extinctFossil: number;
    playableQuestSpecies: number;
    heroSpecies: number;
    timeUnits?: number;
    playableTimeGates?: number;
    taxaWithTimeRanges?: number;
  };
}
