/**
 * Deduplicate ingested taxon records by source+id and normalized scientific name.
 */

import type { IngestedTaxonRecord, IngestionSource } from './types';

export function recordKey(source: IngestionSource | string, sourceRecordId: string): string {
  return `${source}:${sourceRecordId}`;
}

export function normalizeScientificName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export interface DedupStats {
  input: number;
  kept: number;
  droppedById: number;
  droppedByName: number;
}

/**
 * Keep first occurrence per source+id; optionally also drop duplicate names across sources.
 */
export function dedupRecords(
  records: IngestedTaxonRecord[],
  opts: { crossSourceNameDedup?: boolean } = {},
): { records: IngestedTaxonRecord[]; stats: DedupStats } {
  const byId = new Set<string>();
  const byName = new Set<string>();
  const kept: IngestedTaxonRecord[] = [];
  let droppedById = 0;
  let droppedByName = 0;

  for (const r of records) {
    const idKey = recordKey(r.provenance.source, r.provenance.sourceRecordId);
    if (byId.has(idKey)) {
      droppedById += 1;
      continue;
    }
    const nameKey = normalizeScientificName(r.scientificName);
    if (opts.crossSourceNameDedup && byName.has(nameKey)) {
      droppedByName += 1;
      continue;
    }
    byId.add(idKey);
    byName.add(nameKey);
    kept.push(r);
  }

  return {
    records: kept,
    stats: {
      input: records.length,
      kept: kept.length,
      droppedById,
      droppedByName,
    },
  };
}
