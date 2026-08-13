/**
 * Offline pack — bundle manifest for offline play (regions, encounters, Tier R slice).
 * Does not claim live network access.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
    sha256?: string;
    bytes?: number;
  }>;
  tierRRecordCount: number;
  regionCount: number;
  encounterCount: number;
  flagshipCount: number;
  notes: string;
  /** Optional RC provenance pointer */
  provenanceArtifact?: string;
  actualCountsArtifact?: string;
}

export interface DigitalOfflinePackSpec {
  manifest: OfflinePackManifest;
  provenancePath: string;
  actualCountsPath: string;
  packageVersion: string;
}

export function buildDigitalRcOfflinePack(
  input: OfflinePackInput & {
    provenanceArtifact: string;
    actualCountsArtifact: string;
    packageVersion: string;
  },
): DigitalOfflinePackSpec {
  const manifest = buildOfflinePackManifest(input);
  manifest.packId = input.packId;
  manifest.provenanceArtifact = input.provenanceArtifact;
  manifest.actualCountsArtifact = input.actualCountsArtifact;
  return {
    manifest,
    provenancePath: input.provenanceArtifact,
    actualCountsPath: input.actualCountsArtifact,
    packageVersion: input.packageVersion,
  };
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

export interface OfflineIntegrityResult {
  ok: boolean;
  checked: number;
  missing: string[];
  mismatched: string[];
  liveClaimHonest: boolean;
  detail: string;
}

function sha256Buffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Attach content hashes to every bundle that exists under dataRoot.
 * Used for offline integrity — detects corrupt/missing required files.
 */
export function stampOfflinePackIntegrity(
  manifest: OfflinePackManifest,
  dataRoot: string,
): OfflinePackManifest {
  const bundles = manifest.bundles.map((b) => {
    const abs = join(dataRoot, b.path);
    if (!existsSync(abs)) return { ...b };
    const buf = readFileSync(abs);
    return { ...b, sha256: sha256Buffer(buf), bytes: buf.byteLength };
  });
  return { ...manifest, bundles };
}

/**
 * Verify offline pack files against stamped sha256 / presence.
 * Corrupting a stamped required file must fail. liveClaim must stay false.
 */
export function verifyOfflinePackIntegrity(
  manifest: OfflinePackManifest,
  dataRoot: string,
): OfflineIntegrityResult {
  const missing: string[] = [];
  const mismatched: string[] = [];
  let checked = 0;

  for (const b of manifest.bundles) {
    const abs = join(dataRoot, b.path);
    if (!existsSync(abs)) {
      if (b.required || b.sha256) missing.push(b.key);
      continue;
    }
    if (!b.sha256) continue;
    checked += 1;
    const actual = sha256Buffer(readFileSync(abs));
    if (actual !== b.sha256) mismatched.push(b.key);
  }

  const liveClaimHonest = manifest.liveClaim === false;
  const ok =
    liveClaimHonest &&
    missing.length === 0 &&
    mismatched.length === 0 &&
    offlinePackReady(manifest).ready;

  return {
    ok,
    checked,
    missing,
    mismatched,
    liveClaimHonest,
    detail: ok
      ? `offline integrity ok (${checked} hashed bundles)`
      : `offline integrity fail missing=[${missing.join(',')}] mismatched=[${mismatched.join(',')}] liveClaim=${manifest.liveClaim}`,
  };
}
