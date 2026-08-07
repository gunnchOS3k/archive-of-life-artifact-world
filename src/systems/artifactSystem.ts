import type { SaveState, LifelingTrait, NotebookProvenanceCite } from '@/schema';
import type { PlayableSpecies } from '@/services/DataCatalogService';
import { applyObservationProgress } from '@/systems/companionProgression';

export function collectArtifact(
  state: SaveState,
  species: PlayableSpecies,
  traits: LifelingTrait[],
  opts: { timePeriodId?: string | null } = {},
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

  const provenanceCitations = provenanceFromSpecies(species);
  const citeLine =
    provenanceCitations.length > 0
      ? ` Provenance: ${provenanceCitations
          .map((c) => `${c.providerId} [${c.license}] ${c.citation}`)
          .join('; ')}.`
      : ' Provenance: authored species record — COL/GBIF live/fixture pending.';

  const kind = species.conservationStatus === 'Extinct' ? 'excavate' : 'observe';
  const periodNote = opts.timePeriodId ? ` Time filter: ${opts.timePeriodId}.` : '';

  state.notebook.unshift({
    time: Date.now(),
    text: `Collected ${formatArtifactType(artifactType)} from ${species.commonName} (${species.scientificName}) in ${state.player.currentRegion}.${periodNote}${citeLine}`,
    speciesId: species.id,
    scientificName: species.scientificName,
    regionId: state.player.currentRegion,
    timePeriodId: opts.timePeriodId ?? state.timeAtlas?.activeTimeUnitId ?? null,
    provenanceCitations,
  });

  const progression = applyObservationProgress(state.companion, {
    kind,
    speciesId: species.id,
    traits,
  });

  return { success: true as const, artifact, progression };
}

function provenanceFromSpecies(species: PlayableSpecies): NotebookProvenanceCite[] {
  const rows = species.provenance ?? [];
  return rows.map((p) => ({
    providerId: p.source,
    license: p.license,
    citation: p.citation,
    sourceRecordId: p.sourceRecordId ?? p.catalogueOfLifeId ?? (p.gbifTaxonKey != null ? String(p.gbifTaxonKey) : undefined),
    sourceUrl: undefined,
    cacheStatus: p.verificationStatus ?? (p.isMockData ? 'mock_sample' : 'source'),
  }));
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
