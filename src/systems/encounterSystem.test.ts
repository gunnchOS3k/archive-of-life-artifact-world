import { describe, expect, it } from 'vitest';
import {
  buildEncounterTable,
  describeEthicalPrompt,
  rollSoftEncounter,
} from '@/systems/encounterSystem';
import type { PlayableSpecies } from '@/services/DataCatalogService';

function species(partial: Partial<PlayableSpecies> & Pick<PlayableSpecies, 'id' | 'scientificName'>): PlayableSpecies {
  return {
    commonName: partial.commonName ?? partial.id,
    group: 'Mammal',
    family: 'Testidae',
    conservationStatus: partial.conservationStatus ?? 'Least Concern',
    artifactTypes: ['behavioral_field_note'],
    region: 'savanna',
    questType: 'observation',
    dangerLevel: partial.dangerLevel ?? 2,
    ethicalInteraction: 'observe_from_distance',
    timeRange: 'Present',
    habitats: ['savanna'],
    diet: '',
    activity: '',
    size: '',
    behavior: '',
    learningTopics: [],
    funFacts: [],
    whyItMatters: '',
    timeUnitIds: partial.timeUnitIds,
    ...partial,
  };
}

describe('encounterSystem', () => {
  it('builds tables only from authored species (never invents taxa)', () => {
    const table = buildEncounterTable({
      regionId: 'savanna',
      biome: 'savanna',
      species: [
        species({ id: 'panthera_leo', scientificName: 'Panthera leo', commonName: 'Lion' }),
        species({
          id: 'mammuthus_primigenius',
          scientificName: 'Mammuthus primigenius',
          commonName: 'Woolly Mammoth',
          conservationStatus: 'Extinct',
          timeUnitIds: ['pleistocene'],
        }),
      ],
      timePeriodId: null,
    });
    expect(table.candidates).toHaveLength(2);
    expect(table.candidates.every((c) => c.species.scientificName.length > 0)).toBe(true);
    expect(table.candidates.find((c) => c.ethicalFlow === 'excavate')?.speciesId).toBe(
      'mammuthus_primigenius',
    );
  });

  it('filters encounter candidates by time atlas period', () => {
    const table = buildEncounterTable({
      regionId: 'fossil_site',
      biome: 'fossil_bed',
      species: [
        species({
          id: 'panthera_leo',
          scientificName: 'Panthera leo',
          timeUnitIds: ['holocene', 'pleistocene'],
        }),
        species({
          id: 'trilobita_order',
          scientificName: 'Trilobita',
          conservationStatus: 'Extinct',
          timeUnitIds: ['cambrian'],
        }),
      ],
      timePeriodId: 'cambrian',
    });
    expect(table.candidates.map((c) => c.speciesId)).toEqual(['trilobita_order']);
  });

  it('soft rolls use weights and never invent taxa on empty tables', () => {
    const empty = buildEncounterTable({
      regionId: 'museum',
      biome: 'museum',
      species: [],
    });
    expect(rollSoftEncounter(empty, { chance: 1, rng: () => 0 }).reason).toBe('empty_table');

    const table = buildEncounterTable({
      regionId: 'savanna',
      biome: 'savanna',
      species: [species({ id: 'panthera_leo', scientificName: 'Panthera leo', dangerLevel: 1 })],
    });
    const hit = rollSoftEncounter(table, { chance: 1, rng: () => 0 });
    expect(hit.reason).toBe('hit');
    expect(hit.candidate?.speciesId).toBe('panthera_leo');
    expect(hit.candidate?.kind).toBe('soft_random');
    expect(describeEthicalPrompt(hit.candidate!)).toMatch(/Observe panthera_leo \(Panthera leo\)|ethical field note/);
  });
});
