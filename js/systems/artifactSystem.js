export function collectArtifact(state, species, gameData) {
  if (state.artifacts.some(a => a.speciesId === species.id)) {
    return { success: false, reason: 'already_collected' };
  }

  const artifactType = species.artifactTypes[0];
  const artifact = {
    id: `${species.id}_${artifactType}`,
    speciesId: species.id,
    speciesName: species.commonName,
    scientificName: species.scientificName,
    artifactType,
    ethical: true,
    collectedAt: Date.now(),
    region: state.player.currentRegion,
  };

  state.artifacts.push(artifact);
  state.stats.artifactsCollected++;
  state.stats.speciesDocumented++;

  state.notebook.unshift({
    time: Date.now(),
    text: `Collected ${formatArtifactType(artifactType)} from ${species.commonName} (${species.scientificName}) in ${state.player.currentRegion}.`,
    speciesId: species.id,
  });

  unlockCompanionTraits(state, species.id, gameData.traits);

  return { success: true, artifact };
}

function unlockCompanionTraits(state, speciesId, traits) {
  const toUnlock = traits.filter(t => t.unlockedBy === speciesId || t.unlockedBy === 'any_artifact');
  for (const trait of toUnlock) {
    if (!state.companion.unlockedTraits.includes(trait.id)) {
      state.companion.unlockedTraits.push(trait.id);
    }
  }
  if (!state.companion.unlockedTraits.includes('celebrate_emote')) {
    state.companion.unlockedTraits.push('celebrate_emote');
  }
}

export function formatArtifactType(type) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function hasArtifact(state, speciesId) {
  return state.artifacts.some(a => a.speciesId === speciesId);
}

export function getArtifactCount(state, group) {
  if (!group) return state.artifacts.length;
  return state.artifacts.filter(a => {
    // group filtering done by caller with species data
    return true;
  }).length;
}
