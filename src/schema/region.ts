export interface RegionBundle {
  id: string;
  name: string;
  type: 'hub' | 'explore' | 'expedition';
  description: string;
  color: string;
  biome: string;
  /** Authored geographic scope for eligibility (game-authored; not a surveyed claim). */
  continents?: string[];
  speciesIds: string[];
  connections: string[];
  bundlePath?: string;
}
