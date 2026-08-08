/**
 * Tier R (Record) database/index path — scalable beyond authored encounter catalog (~167).
 * Stores imported taxa with provenance; reports ACTUAL counts by source.
 * Never invents liveClaim for unqueried or fixture sources.
 */

import type { IngestedTaxonRecord, IngestionMode, IngestionSource } from '@/services/ingestion/types';
import { recordKey, normalizeScientificName } from '@/services/ingestion/dedup';
import { validateIngestedRecord } from '@/services/ingestion/validateRecord';

export interface TierREntry {
  key: string;
  scientificName: string;
  acceptedName?: string;
  taxonomicRank?: string;
  source: IngestionSource | string;
  sourceRecordId: string;
  license: string;
  attribution: string;
  citation: string;
  sourceUrl?: string;
  mode: IngestionMode;
  liveClaim: boolean;
  snapshotId: string;
  snapshotVersion: string;
  importedAt: string;
}

export interface TierRSourceCount {
  source: string;
  records: number;
  mode: IngestionMode | 'mixed';
  liveClaim: boolean;
  notes?: string;
}

export interface TierRIndexReport {
  snapshotId: string;
  snapshotVersion: string;
  generatedAt: string;
  totalRecords: number;
  /** Unique names in index after dedup */
  uniqueRecords: number;
  /** Actual per-source imports before cross-source name dedup (when provided) */
  importedBySource?: Array<{
    source: string;
    imported: number;
    mode: string;
    liveClaim: boolean;
  }>;
  capacityNote: string;
  bySource: TierRSourceCount[];
  honesty: {
    fixturesNeverClaimedLive: true;
    liveOnlyWhenQueried: true;
  };
}

export class TierRRecordIndex {
  private readonly byKey = new Map<string, TierREntry>();
  private readonly byName = new Map<string, string>(); // normalized name → key
  readonly snapshotId: string;
  readonly snapshotVersion: string;

  constructor(snapshotId: string, snapshotVersion: string) {
    this.snapshotId = snapshotId;
    this.snapshotVersion = snapshotVersion;
  }

  get size(): number {
    return this.byKey.size;
  }

  get(key: string): TierREntry | undefined {
    return this.byKey.get(key);
  }

  lookupByName(scientificName: string): TierREntry | undefined {
    const k = this.byName.get(normalizeScientificName(scientificName));
    return k ? this.byKey.get(k) : undefined;
  }

  /** Import ingested records; returns how many newly added. */
  importRecords(records: IngestedTaxonRecord[]): { added: number; skipped: number; rejected: number } {
    let added = 0;
    let skipped = 0;
    let rejected = 0;
    const now = new Date().toISOString();

    for (const r of records) {
      const v = validateIngestedRecord(r);
      if (!v.ok) {
        rejected += 1;
        continue;
      }
      const key = recordKey(r.provenance.source, r.provenance.sourceRecordId);
      if (this.byKey.has(key)) {
        skipped += 1;
        continue;
      }
      const liveClaim =
        r.provenance.mode === 'live' && r.provenance.isLive === true && r.provenance.isFixture === false;
      if (r.provenance.isFixture && liveClaim) {
        rejected += 1;
        continue;
      }
      const entry: TierREntry = {
        key,
        scientificName: r.scientificName,
        acceptedName: r.acceptedName,
        taxonomicRank: r.taxonomicRank,
        source: r.provenance.source,
        sourceRecordId: r.provenance.sourceRecordId,
        license: r.provenance.license,
        attribution: r.provenance.attribution,
        citation: r.provenance.citation,
        sourceUrl: r.provenance.sourceUrl,
        mode: r.provenance.mode,
        liveClaim,
        snapshotId: this.snapshotId,
        snapshotVersion: this.snapshotVersion,
        importedAt: now,
      };
      this.byKey.set(key, entry);
      this.byName.set(normalizeScientificName(r.scientificName), key);
      added += 1;
    }
    return { added, skipped, rejected };
  }

  entries(): TierREntry[] {
    return [...this.byKey.values()];
  }

  countsBySource(): TierRSourceCount[] {
    const map = new Map<string, TierRSourceCount>();
    for (const e of this.byKey.values()) {
      let row = map.get(e.source);
      if (!row) {
        row = {
          source: e.source,
          records: 0,
          mode: e.mode,
          liveClaim: false,
          notes: e.liveClaim
            ? undefined
            : e.mode === 'fixture'
              ? 'Fixture/snapshot import — not a live ingest claim'
              : 'Imported without liveClaim',
        };
        map.set(e.source, row);
      }
      row.records += 1;
      if (row.mode !== e.mode) row.mode = 'mixed';
      // liveClaim true only if ALL records for source are live
      // We'll recompute after loop
    }
    for (const [source, row] of map) {
      const rows = this.entries().filter((e) => e.source === source);
      row.liveClaim = rows.length > 0 && rows.every((e) => e.liveClaim);
      if (!row.liveClaim && row.mode === 'fixture') {
        row.notes = 'Fixture/snapshot import — not a live ingest claim';
      }
    }
    return [...map.values()].sort((a, b) => a.source.localeCompare(b.source));
  }

  report(importedBySource?: Array<{
    source: string;
    imported: number;
    mode: string;
    liveClaim: boolean;
  }>): TierRIndexReport {
    return {
      snapshotId: this.snapshotId,
      snapshotVersion: this.snapshotVersion,
      generatedAt: new Date().toISOString(),
      totalRecords: this.size,
      uniqueRecords: this.size,
      importedBySource,
      capacityNote:
        'In-memory Map index; designed to scale beyond authored encounter catalog (~167). Not a claim of global COL coverage.',
      bySource: this.countsBySource(),
      honesty: {
        fixturesNeverClaimedLive: true,
        liveOnlyWhenQueried: true,
      },
    };
  }

  /** Export serializable snapshot for offline pack / status JSON. */
  toJSON(): { snapshotId: string; snapshotVersion: string; records: TierREntry[] } {
    return {
      snapshotId: this.snapshotId,
      snapshotVersion: this.snapshotVersion,
      records: this.entries(),
    };
  }

  static fromJSON(data: {
    snapshotId: string;
    snapshotVersion: string;
    records: TierREntry[];
  }): TierRRecordIndex {
    const idx = new TierRRecordIndex(data.snapshotId, data.snapshotVersion);
    for (const e of data.records) {
      idx.byKey.set(e.key, e);
      idx.byName.set(normalizeScientificName(e.scientificName), e.key);
    }
    return idx;
  }
}
