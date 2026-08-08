/**
 * Machine-readable actual counts — never fabricate global-complete.
 */

import type { SynonymConflictStats } from '@/services/ingestion/synonyms';
import type { SourceAvailabilityState } from '@/services/ingestion/sourceRegistry';

export interface ActualCountsReport {
  schemaVersion: '1.0.0';
  snapshotId: string;
  snapshotVersion: string;
  generatedAt: string;
  /** Explicit non-claim */
  globalCompleteClaim: false;
  liveClaimAny: boolean;
  records_by_source: Record<string, number>;
  records_by_source_detail: Array<{
    source: string;
    records: number;
    mode: string;
    liveClaim: boolean;
    sourceState: SourceAvailabilityState | string;
  }>;
  unique_taxa: number;
  unique_taxa_by_accepted_name: number;
  synonyms: number;
  synonym_edges: number;
  conflicts: number;
  rejected: number;
  dropped_by_id: number;
  dropped_by_name: number;
  pages_fetched: number;
  checkpoint_count: number;
  cache_entries: number;
  synonymStats?: SynonymConflictStats;
  honesty: {
    fixturesNeverClaimedLive: true;
    liveOnlyWhenQueried: true;
    noFabricatedGlobalComplete: true;
  };
  notes: string[];
}

export function buildActualCountsReport(input: {
  snapshotId: string;
  snapshotVersion: string;
  recordsBySource: Array<{
    source: string;
    records: number;
    mode: string;
    liveClaim: boolean;
    sourceState?: string;
  }>;
  uniqueTaxa: number;
  uniqueAccepted?: number;
  synonyms: number;
  synonymEdges?: number;
  conflicts: number;
  rejected?: number;
  droppedById?: number;
  droppedByName?: number;
  pagesFetched?: number;
  checkpointCount?: number;
  cacheEntries?: number;
  liveClaimAny: boolean;
  synonymStats?: SynonymConflictStats;
  notes?: string[];
}): ActualCountsReport {
  const records_by_source: Record<string, number> = {};
  for (const row of input.recordsBySource) {
    records_by_source[row.source] = row.records;
  }
  return {
    schemaVersion: '1.0.0',
    snapshotId: input.snapshotId,
    snapshotVersion: input.snapshotVersion,
    generatedAt: new Date().toISOString(),
    globalCompleteClaim: false,
    liveClaimAny: input.liveClaimAny,
    records_by_source,
    records_by_source_detail: input.recordsBySource.map((r) => ({
      source: r.source,
      records: r.records,
      mode: r.mode,
      liveClaim: r.liveClaim,
      sourceState: r.sourceState ?? 'UNKNOWN',
    })),
    unique_taxa: input.uniqueTaxa,
    unique_taxa_by_accepted_name: input.uniqueAccepted ?? input.uniqueTaxa,
    synonyms: input.synonyms,
    synonym_edges: input.synonymEdges ?? input.synonyms,
    conflicts: input.conflicts,
    rejected: input.rejected ?? 0,
    dropped_by_id: input.droppedById ?? 0,
    dropped_by_name: input.droppedByName ?? 0,
    pages_fetched: input.pagesFetched ?? 0,
    checkpoint_count: input.checkpointCount ?? 0,
    cache_entries: input.cacheEntries ?? 0,
    synonymStats: input.synonymStats,
    honesty: {
      fixturesNeverClaimedLive: true,
      liveOnlyWhenQueried: true,
      noFabricatedGlobalComplete: true,
    },
    notes: input.notes ?? [
      'Counts are actual imports for this snapshot only',
      'Not a claim of global COL/GBIF/PBDB completeness',
    ],
  };
}
