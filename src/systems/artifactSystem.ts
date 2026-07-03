import type { SaveState, LifelingTrait } from '@/schema';
import type { PlayableSpecies } from '@/services/DataCatalogService';

export function collectArtifact(
  state: SaveState,
  species: PlayableSpecies,
  traits: LifelingTrait[]
) {
  if (state.artifacts.some((a) => a.speciesId === species.id)) {
    return { success: false as const, reason: 'already_collected' };
  }

  const artifactType = species.artifactTypes[0];
  const artifact = {
    id: `${species.id}_${artifactType}`,
    speciesId: species.id,
    speciesName: species.commonName,
    scientificName: species.scientificName,
    artifactType,
    ethical: true as const,
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

  unlockCompanionTraits(state, species.id, traits);
  return { success: true as const, artifact };
}

function unlockCompanionTraits(state: SaveState, speciesId: string, traits: LifelingTrait[]) {
  const toUnlock = traits.filter((t) => t.unlockedBy === speciesId || t.unlockedBy === 'any_artifact');
  for (const trait of toUnlock) {
    if (!state.companion.unlockedTraits.includes(trait.id)) {
      state.companion.unlockedTraits.push(trait.id);
    }
  }
  if (!state.companion.unlockedTraits.includes('celebrate_emote')) {
    state.companion.unlockedTraits.push('celebrate_emote');
  }
}

export function formatArtifactType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function hasArtifact(state: SaveState, speciesId: string): boolean {
  return state.artifacts.some((a) => a.speciesId === speciesId);
}

export function getCollectedIds(state: SaveState): Set<string> {
  return new Set(state.artifacts.map((a) => a.speciesId));
}
