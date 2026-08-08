/**
 * Scanning system — match field scans against encounter catalog + Tier R index.
 */

import type { SaveState } from '@/schema';
import type { TierREntry, TierRRecordIndex } from '@/coverage/TierRRecordIndex';
import { normalizeScientificName } from '@/services/ingestion/dedup';

export interface ScanTarget {
  id: string;
  scientificName: string;
  commonName?: string;
  regionId?: string;
  programTier?: string;
}

export interface ScanResult {
  matched: boolean;
  confidence: 'high' | 'medium' | 'none';
  target?: ScanTarget;
  tierR?: TierREntry;
  liveClaim: boolean;
  message: string;
}

export interface ScanHistoryEntry {
  at: number;
  query: string;
  matchedId?: string;
  scientificName?: string;
  liveClaim: boolean;
}

export interface SaveWithScans extends SaveState {
  scans?: ScanHistoryEntry[];
}

export function ensureScanHistory(state: SaveWithScans): ScanHistoryEntry[] {
  if (!state.scans) state.scans = [];
  return state.scans;
}

export function scanTaxon(
  query: string,
  catalog: ScanTarget[],
  tierR?: TierRRecordIndex | null,
  state?: SaveWithScans,
  now = Date.now(),
): ScanResult {
  const q = normalizeScientificName(query);
  if (!q || q.length < 3) {
    return {
      matched: false,
      confidence: 'none',
      liveClaim: false,
      message: 'Scan query too short',
    };
  }

  const exact = catalog.find((t) => normalizeScientificName(t.scientificName) === q);
  const partial = catalog.find((t) => normalizeScientificName(t.scientificName).includes(q));
  const target = exact ?? partial;
  const tierHit = tierR?.lookupByName(query);

  if (target || tierHit) {
    const liveClaim = tierHit?.liveClaim === true;
    const result: ScanResult = {
      matched: true,
      confidence:
        exact || (tierHit && normalizeScientificName(tierHit.scientificName) === q)
          ? 'high'
          : 'medium',
      target,
      tierR: tierHit,
      liveClaim,
      message: target
        ? `Matched ${target.scientificName}${liveClaim ? ' (Tier R live)' : ' (catalog/authored)'}`
        : `Matched Tier R record ${tierHit!.scientificName}${liveClaim ? ' (live)' : ' (fixture/import)'}`,
    };
    if (state) {
      ensureScanHistory(state).push({
        at: now,
        query,
        matchedId: target?.id ?? tierHit?.key,
        scientificName: target?.scientificName ?? tierHit?.scientificName,
        liveClaim,
      });
    }
    return result;
  }

  const miss: ScanResult = {
    matched: false,
    confidence: 'none',
    liveClaim: false,
    message: 'No match in encounter catalog or Tier R index',
  };
  if (state) {
    ensureScanHistory(state).push({ at: now, query, liveClaim: false });
  }
  return miss;
}
