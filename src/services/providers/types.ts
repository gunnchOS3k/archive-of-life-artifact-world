/**
 * Scientific data provider federation — normalized provenance for all external sources.
 */

export type DataConfidence = 'observed' | 'reconstructed' | 'inferred' | 'artistic' | 'unknown';
export type CacheStatus = 'live' | 'fixture' | 'cached' | 'unavailable';

export interface ProviderAttribution {
  organization: string;
  dataset: string;
  license: string;
  citation: string;
  sourceUrl?: string;
}

export interface FederatedRecord<T = unknown> {
  providerId: string;
  sourceRecordId: string;
  sourceUrl?: string;
  retrievedAt: string;
  license: string;
  attribution: string;
  scientificName?: string;
  acceptedName?: string;
  taxonomicRank?: string;
  eventDate?: string;
  latitude?: number;
  longitude?: number;
  geographicPrecision?: string;
  temporalPrecision?: string;
  qualityFlag?: string;
  confidence: DataConfidence;
  interpretation: DataConfidence;
  cacheStatus: CacheStatus;
  payload: T;
}

export interface TaxonQuery {
  scientificName?: string;
  providerId?: string;
  rank?: string;
}

export interface OccurrenceQuery {
  taxonId?: string;
  scientificName?: string;
  regionId?: string;
  bbox?: [number, number, number, number];
  limit?: number;
}

export interface EnvironmentalLayerQuery {
  regionId: string;
  layerId: string;
  temporalRange?: { start: string; end: string };
}

export interface DataProvider {
  readonly id: string;
  readonly organization: string;
  readonly domains: string[];
  healthCheck(): Promise<{ ok: boolean; message: string }>;
  getAttribution(): ProviderAttribution;
  searchTaxa?(query: TaxonQuery): Promise<FederatedRecord[]>;
  getTaxon?(id: string): Promise<FederatedRecord | null>;
  getOccurrences?(query: OccurrenceQuery): Promise<FederatedRecord[]>;
  getFossilOccurrences?(query: OccurrenceQuery): Promise<FederatedRecord[]>;
  getMarineOccurrences?(query: OccurrenceQuery): Promise<FederatedRecord[]>;
  getEnvironmentalLayer?(query: EnvironmentalLayerQuery): Promise<FederatedRecord | null>;
  getMedia?(id: string): Promise<FederatedRecord | null>;
}

export interface ProviderConflict<T = unknown> {
  field: string;
  assertions: Array<{
    providerId: string;
    value: T;
    confidence: DataConfidence;
    retrievedAt: string;
  }>;
  selectedProviderId?: string;
  selectionReason?: string;
}

/** Aggregated Sources & Evidence lookup outcome (never hangs indefinitely). */
export type EvidencePanelStatus =
  | 'live'
  | 'partial'
  | 'cached'
  | 'fixture'
  | 'empty'
  | 'offline'
  | 'timed_out'
  | 'error';

export interface SpeciesEvidenceResult {
  records: FederatedRecord[];
  failures: Array<{ providerId: string; reason: string; timedOut: boolean }>;
  offline: boolean;
  status: EvidencePanelStatus;
  conflicts: ProviderConflict[];
}
