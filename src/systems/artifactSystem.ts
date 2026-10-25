import type { SaveState, LifelingTrait, NotebookProvenanceCite } from '@/schema';
import type { PlayableSpecies } from '@/services/DataCatalogService';
import { applyObservationProgress } from '@/systems/companionProgression';
import {
  evaluateCompanionModules,
  type CompanionModuleDef,
} from '@/systems/companionModules';
import { recordCollectedArtifact } from './artifactRecord.mjs';

export function collectArtifact(
  state: SaveState,
  species: PlayableSpecies,
  traits: LifelingTrait[],
  opts: {
    timePeriodId?: string | null;
    /** Live companion affinity modules — wired into Game collection path. */
    modules?: CompanionModuleDef[];
  } = {},
) {
  const recorded = recordCollectedArtifact(state, species, Date.now());
  if (!recorded.success) {
    return { success: false as const, reason: recorded.reason };
  }
  const artifact = recorded.artifact;
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
    text: `Collected ${formatArtifactType(artifact.artifactType)} from ${species.commonName} (${species.scientificName}) in ${state.player.currentRegion}.${periodNote}${citeLine}`,
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

  const newlyUnlockedModules =
    opts.modules && opts.modules.length > 0
      ? evaluateCompanionModules(state.companion, {
          modules: opts.modules,
          observedSpeciesIds: state.artifacts.map((a) => a.speciesId),
          visitedRegions: state.player.visitedRegions,
          completedExpeditions: state.expeditions?.completed ?? [],
          discoveredClueIds: state.expeditions?.discoveredClueIds ?? [],
          viewedTimeUnitIds: state.timeAtlas?.viewedTimeUnits ?? [],
        })
      : [];

  return { success: true as const, artifact, progression, newlyUnlockedModules };
}

function provenanceFromSpecies(species: PlayableSpecies): NotebookProvenanceCite[] {
  const rows = species.provenance ?? [];
  return rows.map((p) => ({
    providerId: p.source,
    license: p.license,
    citation: p.citation,
    sourceRecordId: p.sourceRecordId ?? p.catalogueOfLifeId ?? (p.gbifTaxonKey != null ? String(p.gbifTaxonKey) : undefined),
    sourceUrl: undefined,
    cacheStatus: p.verificationStatus ?? (p.isMockData ? 'mock_sample' : 'needs_source_verification'),
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
