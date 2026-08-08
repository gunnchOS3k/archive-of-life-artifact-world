export interface RegionBundle {
  id: string;
  name: string;
  type: 'hub' | 'explore' | 'expedition';
  description: string;
  color: string;
  biome: string;
  speciesIds: string[];
  connections: string[];
  bundlePath?: string;
}
