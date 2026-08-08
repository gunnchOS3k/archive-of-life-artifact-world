/**
 * Scientific ingestion types — pagination, retry, rate-limit, provenance.
 * Fixtures are for tests / offline fallback only; never claim fixture as live.
 */

import type { CacheStatus, DataConfidence } from '@/services/providers/types';

export type IngestionSource = 'col' | 'gbif' | 'pbdb';

export type IngestionMode = 'live' | 'fixture' | 'cached';

export interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Window length in ms */
  windowMs: number;
  /** Minimum delay between requests (ms) */
  minIntervalMs: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Retry on these HTTP status codes */
  retryStatuses: number[];
}

export interface PaginationConfig {
  pageSize: number;
  maxPages: number;
  /** Query param name for offset/page (GBIF uses offset, COL uses page or offset) */
  offsetParam: 'offset' | 'page';
}

export interface IngestionClientConfig {
  rateLimit: RateLimitConfig;
  retry: RetryConfig;
  pagination: PaginationConfig;
  timeoutMs: number;
  /** When true, live network is skipped and only fixtures may be used (tests). */
  fixtureOnly?: boolean;
}

export interface ProvenanceStamp {
  source: IngestionSource;
  sourceRecordId: string;
  license: string;
  attribution: string;
  citation: string;
  sourceUrl?: string;
  retrievedAt: string;
  mode: IngestionMode;
  /** Explicit honesty flag — true only when live HTTP succeeded */
  isLive: boolean;
  /** True when record came from a test/offline fixture */
  isFixture: boolean;
}

export interface IngestedTaxonRecord {
  scientificName: string;
  acceptedName?: string;
  taxonomicRank?: string;
  /** Synonym strings when provided by source */
  synonyms?: string[];
  provenance: ProvenanceStamp;
  confidence: DataConfidence;
  cacheStatus: CacheStatus;
  payload: unknown;
}

export interface IngestionPageResult {
  records: IngestedTaxonRecord[];
  page: number;
  offset: number;
  pageSize: number;
  hasMore: boolean;
  mode: IngestionMode;
  errors: string[];
}

export interface IngestionQuery {
  scientificName?: string;
  limit?: number;
  offset?: number;
  /** Force fixture path (tests). Never labels results as live. */
  useFixture?: boolean;
}

export const DEFAULT_INGESTION_CONFIG: IngestionClientConfig = {
  rateLimit: {
    maxRequests: 30,
    windowMs: 60_000,
    minIntervalMs: 100,
  },
  retry: {
    maxAttempts: 3,
    baseDelayMs: 200,
    maxDelayMs: 2_000,
    retryStatuses: [408, 429, 500, 502, 503, 504],
  },
  pagination: {
    pageSize: 20,
    maxPages: 5,
    offsetParam: 'offset',
  },
  timeoutMs: 10_000,
  fixtureOnly: false,
};
