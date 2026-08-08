/**
 * Machine-readable Tier R / E / F coverage by source.
 * Honest: authored ≠ live; fixture ≠ live.
 */

import type { SpeciesIndexEntry } from '@/schema';

export type ProgramTier = 'R_Record' | 'E_Encounter' | 'F_Flagship';

export interface SourceTierCounts {
  source: string;
  records: number;
  encounters: number;
  flagship: number;
  mode: 'live' | 'fixture' | 'authored' | 'mixed' | 'unknown';
  liveClaim: boolean;
  notes?: string;
}

export interface TierCoverageBySourceReport {
  snapshotId: string;
  generatedAt: string;
  floors: {
    regions: { required: number; actual: number; met: boolean };
    encounterTaxa: { required: number; actual: number; met: boolean };
    flagship: { required: number; actual: number; met: boolean };
    polarRegion: { required: true; present: boolean; met: boolean };
  };
  totals: {
    records: number;
    encounters: number;
    flagship: number;
    taxa: number;
  };
  bySource: SourceTierCounts[];
  honesty: {
    fixturesNeverClaimedLive: true;
    authoredPublicTaxonomyLiveClaim: false;
    ingestionService: string;
  };
  programTierLegend: Record<ProgramTier, string>;
}

export function programTierFor(entry: SpeciesIndexEntry & { programTier?: string }): ProgramTier {
  if (entry.programTier === 'F_Flagship' || entry.tier === 'hero' || (entry.representationTier ?? 0) >= 5) {
    return 'F_Flagship';
  }
  if (entry.programTier === 'E_Encounter' || (entry.representationTier ?? 0) >= 2) {
    return 'E_Encounter';
  }
  return 'R_Record';
}

export function buildTierCoverageReport(input: {
  snapshotId: string;
  entries: Array<SpeciesIndexEntry & { programTier?: string; sources?: string[] }>;
  regionIds: string[];
  generatedAt?: string;
}): TierCoverageBySourceReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const bySource = new Map<string, SourceTierCounts>();

  const bump = (source: string, tier: ProgramTier) => {
    let row = bySource.get(source);
    if (!row) {
      row = {
        source,
        records: 0,
        encounters: 0,
        flagship: 0,
        mode: source === 'game_authored' ? 'authored' : source === 'mock_sample' ? 'fixture' : 'unknown',
        liveClaim: false,
        notes:
          source === 'game_authored'
            ? 'Authored public taxonomy — not a live ingest claim'
            : undefined,
      };
      bySource.set(source, row);
    }
    if (tier === 'F_Flagship') row.flagship += 1;
    else if (tier === 'E_Encounter') row.encounters += 1;
    else row.records += 1;
  };

  let records = 0;
  let encounters = 0;
  let flagship = 0;

  for (const entry of input.entries) {
    const tier = programTierFor(entry);
    if (tier === 'F_Flagship') flagship += 1;
    else if (tier === 'E_Encounter') encounters += 1;
    else records += 1;

    const sources = entry.sources?.length ? entry.sources : ['game_authored'];
    for (const src of sources) bump(src, tier);
  }

  // Also emit COL/GBIF/PBDB rows as live-capable (counts 0 until live ingest attributed)
  for (const src of ['catalogue_of_life', 'gbif', 'paleobiodb'] as const) {
    if (!bySource.has(src)) {
      bySource.set(src, {
        source: src,
        records: 0,
        encounters: 0,
        flagship: 0,
        mode: 'live',
        liveClaim: false,
        notes: 'Live via ScientificIngestionService when public API reachable; not counted until attributed',
      });
    } else {
      const row = bySource.get(src)!;
      // Presence in authored index does not equal live ingest
      row.liveClaim = false;
      if (row.mode === 'unknown') row.mode = 'mixed';
      row.notes =
        (row.notes ? row.notes + '; ' : '') +
        'Index references must not be reported as live ingest';
    }
  }

  const polarPresent = input.regionIds.includes('polar_ice');
  const regionCount = input.regionIds.length;

  return {
    snapshotId: input.snapshotId,
    generatedAt,
    floors: {
      regions: { required: 12, actual: regionCount, met: regionCount >= 12 },
      encounterTaxa: { required: 120, actual: encounters, met: encounters >= 120 },
      flagship: { required: 24, actual: flagship, met: flagship >= 24 },
      polarRegion: { required: true, present: polarPresent, met: polarPresent },
    },
    totals: {
      records,
      encounters,
      flagship,
      taxa: input.entries.length,
    },
    bySource: [...bySource.values()].sort((a, b) => a.source.localeCompare(b.source)),
    honesty: {
      fixturesNeverClaimedLive: true,
      authoredPublicTaxonomyLiveClaim: false,
      ingestionService: 'src/services/ingestion/ScientificIngestionService.ts',
    },
    programTierLegend: {
      R_Record: 'representationTier 0–1',
      E_Encounter: 'representationTier 2–4 (plus playable encounter catalog)',
      F_Flagship: 'representationTier 5–6 / hero',
    },
  };
}
