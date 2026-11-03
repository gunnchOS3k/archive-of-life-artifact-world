export interface OccurrenceSummary {
  region: string;
  occurrenceCount: number;
  centroidLat?: number;
  centroidLng?: number;
}

export interface DistributionProfile {
  continents: string[];
  habitats: string[];
  biomes?: string[];
  occurrenceSummaries?: OccurrenceSummary[];
  gbifTaxonKey?: number;
  sourceVersion: string;
  lastUpdated: string;
  /** When mock_sample, ranges are planning twins — not GBIF source-verified. */
  dataMode?: 'mock_sample' | 'source_verified' | 'game_authored';
  uncertaintyNote?: string;
}
