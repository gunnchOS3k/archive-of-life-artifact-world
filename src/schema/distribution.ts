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
}
