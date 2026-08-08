/**
 * Offline pack — bundle manifest for offline play (regions, encounters, Tier R slice).
 * Does not claim live network access.
 */

export interface OfflinePackManifest {
  packId: string;
  snapshotId: string;
  createdAt: string;
  liveClaim: false;
  bundles: Array<{
    key: string;
    path: string;
    recordCount: number;
    required: boolean;
  }>;
  tierRRecordCount: number;
  regionCount: number;
  encounterCount: number;
  flagshipCount: number;
  notes: string;
}

export interface OfflinePackInput {
  packId: string;
  snapshotId: string;
  regionCount: number;
  encounterCount: number;
  flagshipCount: number;
  tierRRecordCount: number;
  bundlePaths?: Array<{ key: string; path: string; recordCount: number; required?: boolean }>;
}

const DEFAULT_BUNDLES = [
  { key: 'regions', path: 'bundles/regions.json', required: true },
  { key: 'encounterTaxa', path: 'bundles/encounter-taxa.json', required: true },
  { key: 'heroSpecies', path: 'bundles/hero-species.json', required: true },
  { key: 'expeditions', path: 'bundles/expeditions.json', required: false },
  { key: 'clues', path: 'bundles/clues.json', required: false },
  { key: 'companionModules', path: 'bundles/companion-modules.json', required: false },
  { key: 'gameConfig', path: 'bundles/game-config.json', required: false },
  { key: 'searchIndex', path: 'bundles/search-index.json', required: false },
];

export function buildOfflinePackManifest(input: OfflinePackInput): OfflinePackManifest {
  const bundles = (
    input.bundlePaths ??
    DEFAULT_BUNDLES.map((b) => ({
      ...b,
      recordCount:
        b.key === 'regions'
          ? input.regionCount
          : b.key === 'encounterTaxa'
            ? input.encounterCount
            : b.key === 'heroSpecies'
              ? input.flagshipCount
              : 1, // path included in pack (count not floor-gated)
      required: b.required ?? false,
    }))
  ).map((b) => ({
    key: b.key,
    path: b.path,
    recordCount: b.recordCount,
    required: b.required ?? false,
  }));

  return {
    packId: input.packId,
    snapshotId: input.snapshotId,
    createdAt: new Date().toISOString(),
    liveClaim: false,
    bundles,
    tierRRecordCount: input.tierRRecordCount,
    regionCount: input.regionCount,
    encounterCount: input.encounterCount,
    flagshipCount: input.flagshipCount,
    notes:
      'Offline pack is authored + imported snapshot content only. liveClaim is always false — no live ingest while offline.',
  };
}

export function offlinePackReady(manifest: OfflinePackManifest): {
  ready: boolean;
  missingRequired: string[];
} {
  const missingRequired = manifest.bundles
    .filter((b) => b.required && b.recordCount <= 0)
    .map((b) => b.key);
  return {
    ready:
      missingRequired.length === 0 &&
      manifest.regionCount >= 12 &&
      manifest.encounterCount >= 120 &&
      manifest.flagshipCount >= 24 &&
      manifest.liveClaim === false,
    missingRequired,
  };
}
