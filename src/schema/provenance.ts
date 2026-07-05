/** External biodiversity data source identifiers */
export type SourceName =
  | 'catalogue_of_life'
  | 'gbif'
  | 'iucn'
  | 'paleobiodb'
  | 'neotoma'
  | 'nasa_earthdata'
  | 'ics_chronostratigraphic'
  | 'encyclopedia_of_life'
  | 'game_authored'
  | 'mock_sample';

export type LicenseLabel =
  | 'CC-BY-4.0'
  | 'CC-BY-NC-4.0'
  | 'CC0-1.0'
  | 'IUCN-TOS'
  | 'GAME-ORIGINAL'
  | 'MOCK-SAMPLE';

/** How a record's data was verified for release reporting. */
export type VerificationStatus =
  | 'game_authored_verified'
  | 'source_verified'
  | 'mock_sample'
  | 'blocked_external'
  | 'derived_inferred'
  | 'needs_source_verification';

export interface DataSourceProvenance {
  source: SourceName;
  sourceVersion: string;
  sourceRecordId?: string;
  catalogueOfLifeId?: string;
  gbifTaxonKey?: number;
  iucnTaxonId?: number;
  paleobiodbTaxonNo?: number;
  license: LicenseLabel;
  citation: string;
  citationRequired: boolean;
  retrievedAt: string;
  lastUpdated: string;
  /** @deprecated Prefer verificationStatus — kept for bundle compatibility */
  isMockData?: boolean;
  verificationStatus?: VerificationStatus;
}
