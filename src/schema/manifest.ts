export type BundleKind =
  | 'hero_species'
  | 'region_species'
  | 'conservation'
  | 'occurrence'
  | 'fossil'
  | 'search_index'
  | 'game_config';

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
    conservation: BundleRef;
    occurrence: BundleRef;
    fossil: BundleRef;
    searchIndex: BundleRef;
    regions: BundleRef;
    quests: BundleRef;
    traits: BundleRef;
    regionSpecies: Record<string, BundleRef>;
  };
  coverage: {
    representedSpecies: number;
    iucnAssessed: number;
    threatened: number;
    extinctFossil: number;
    playableQuestSpecies: number;
    heroSpecies: number;
  };
}
