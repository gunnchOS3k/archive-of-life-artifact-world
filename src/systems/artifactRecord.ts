import type { CollectedArtifact, SaveState } from '@/schema';

export interface GameAuthoredArtifact extends CollectedArtifact {
  provenance: 'game_authored';
  scientificVerification: false;
  ethical: true;
}

export interface ArtifactSpeciesInput {
  id?: string;
  commonName?: string;
  scientificName?: string;
  artifactTypes?: readonly string[];
}

export type ArtifactRecordResult =
  | { success: true; artifact: GameAuthoredArtifact }
  | { success: false; reason: 'missing_species' | 'missing_state' | 'already_collected' };

/** Game-authored collection. Restored rows stay unverified. */
export function recordCollectedArtifact(
  state: SaveState,
  species: ArtifactSpeciesInput,
  now: number = Date.now(),
): ArtifactRecordResult {
  const artifactType = species?.artifactTypes?.[0];
  if (!species?.id || !artifactType) return { success: false, reason: 'missing_species' };
  if (!state?.artifacts || !state.player || !state.stats) return { success: false, reason: 'missing_state' };
  if (state.artifacts.some((item) => item?.speciesId === species.id)) {
    return { success: false, reason: 'already_collected' };
  }
  const artifact: GameAuthoredArtifact = {
    id: `${species.id}_${artifactType}`,
    speciesId: species.id,
    speciesName: species.commonName || species.id,
    scientificName: species.scientificName || '',
    artifactType,
    ethical: true,
    collectedAt: now,
    region: state.player.currentRegion,
    provenance: 'game_authored',
    scientificVerification: false,
  };
  state.artifacts.push(artifact);
  state.stats.artifactsCollected = Number(state.stats.artifactsCollected || 0) + 1;
  return { success: true, artifact };
}

export function restoreCollectedArtifacts(raw: unknown): GameAuthoredArtifact[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is CollectedArtifact => {
    return Boolean(item) && typeof item === 'object' && typeof (item as { speciesId?: unknown }).speciesId === 'string';
  }).map((item) => ({
    ...item,
    ethical: true as const,
    provenance: 'game_authored' as const,
    scientificVerification: false as const,
  }));
}
