/** External biodiversity data source identifiers */
export type SourceName =
  | 'catalogue_of_life'
  | 'gbif'
  | 'iucn'
  | 'paleobiodb'
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
  isMockData?: boolean;
}
