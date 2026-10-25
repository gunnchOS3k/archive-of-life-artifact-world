/** Game-authored collection. Restored rows stay unverified. */

export function recordCollectedArtifact(state, species, now = Date.now()) {
  const artifactType = species?.artifactTypes?.[0];
  if (!species?.id || !artifactType) return { success: false, reason: 'missing_species' };
  if (!state?.artifacts || !state.player || !state.stats) return { success: false, reason: 'missing_state' };
  if (state.artifacts.some((item) => item?.speciesId === species.id)) {
    return { success: false, reason: 'already_collected' };
  }
  const artifact = {
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

export function restoreCollectedArtifacts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && typeof item.speciesId === 'string').map((item) => ({
    ...item,
    provenance: 'game_authored',
    scientificVerification: false,
  }));
}
