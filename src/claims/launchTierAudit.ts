/**
 * Launch Tier E (encounter) / Tier F (flagship) audit.
 * Floors from ADR-GAME-AR-001: E ≥ 120, F = 24, regions = 12.
 */

export const LAUNCH_TIER_E_FLOOR = 120;
export const LAUNCH_TIER_F_FLOOR = 24;
export const LAUNCH_REGION_FLOOR = 12;

export interface LaunchTierAuditInput {
  snapshotId: string;
  regions: Array<{ id: string; biome?: string; speciesIds?: string[] }>;
  encounterSpecies: Array<{
    id: string;
    scientificName: string;
    programTier?: string;
    region?: string;
    isPlayable?: boolean;
  }>;
  flagshipSpecies: Array<{
    id: string;
    scientificName: string;
    gameplay?: unknown;
    artifactTemplates?: unknown;
  }>;
  polarRegionId?: string;
}

export interface LaunchTierAuditReport {
  snapshotId: string;
  generatedAt: string;
  tierE: {
    required: number;
    actual: number;
    met: boolean;
    playable: number;
    byRegion: Record<string, number>;
  };
  tierF: {
    required: number;
    actual: number;
    met: boolean;
    withGameplay: number;
    withArtifacts: number;
  };
  regions: {
    required: number;
    actual: number;
    met: boolean;
    biomes: string[];
    polarPresent: boolean;
  };
  tokens: {
    LAUNCH_TIER_E_COMPLETE: boolean;
    LAUNCH_TIER_F_COMPLETE: boolean;
  };
  gaps: string[];
}

export function auditLaunchTiers(input: LaunchTierAuditInput): LaunchTierAuditReport {
  const e = input.encounterSpecies.filter((s) => s.programTier === 'E_Encounter');
  const playable = e.filter((s) => s.isPlayable !== false);
  const byRegion: Record<string, number> = {};
  for (const s of e) {
    const r = s.region ?? 'unknown';
    byRegion[r] = (byRegion[r] ?? 0) + 1;
  }

  const f = input.flagshipSpecies;
  const withGameplay = f.filter((s) => s.gameplay != null).length;
  const withArtifacts = f.filter(
    (s) => Array.isArray(s.artifactTemplates) && (s.artifactTemplates as unknown[]).length > 0,
  ).length;

  const biomes = [...new Set(input.regions.map((r) => r.biome ?? 'unknown'))];
  const polarId = input.polarRegionId ?? 'polar_ice';
  const polarPresent = input.regions.some((r) => r.id === polarId);

  const gaps: string[] = [];
  if (e.length < LAUNCH_TIER_E_FLOOR) {
    gaps.push(`Tier E ${e.length}/${LAUNCH_TIER_E_FLOOR}`);
  }
  if (f.length < LAUNCH_TIER_F_FLOOR) {
    gaps.push(`Tier F ${f.length}/${LAUNCH_TIER_F_FLOOR}`);
  }
  if (input.regions.length < LAUNCH_REGION_FLOOR) {
    gaps.push(`Regions ${input.regions.length}/${LAUNCH_REGION_FLOOR}`);
  }
  if (!polarPresent) gaps.push('polar region missing');
  if (withGameplay < LAUNCH_TIER_F_FLOOR) {
    gaps.push(`Flagship gameplay links ${withGameplay}/${LAUNCH_TIER_F_FLOOR}`);
  }
  if (withArtifacts < LAUNCH_TIER_F_FLOOR) {
    gaps.push(`Flagship artifact templates ${withArtifacts}/${LAUNCH_TIER_F_FLOOR}`);
  }

  const eComplete = e.length >= LAUNCH_TIER_E_FLOOR && playable.length >= LAUNCH_TIER_E_FLOOR;
  const fComplete =
    f.length >= LAUNCH_TIER_F_FLOOR &&
    withGameplay >= LAUNCH_TIER_F_FLOOR &&
    withArtifacts >= LAUNCH_TIER_F_FLOOR;

  return {
    snapshotId: input.snapshotId,
    generatedAt: new Date().toISOString(),
    tierE: {
      required: LAUNCH_TIER_E_FLOOR,
      actual: e.length,
      met: e.length >= LAUNCH_TIER_E_FLOOR,
      playable: playable.length,
      byRegion,
    },
    tierF: {
      required: LAUNCH_TIER_F_FLOOR,
      actual: f.length,
      met: f.length >= LAUNCH_TIER_F_FLOOR,
      withGameplay,
      withArtifacts,
    },
    regions: {
      required: LAUNCH_REGION_FLOOR,
      actual: input.regions.length,
      met: input.regions.length >= LAUNCH_REGION_FLOOR,
      biomes,
      polarPresent,
    },
    tokens: {
      LAUNCH_TIER_E_COMPLETE: eComplete,
      LAUNCH_TIER_F_COMPLETE: fComplete,
    },
    gaps,
  };
}
