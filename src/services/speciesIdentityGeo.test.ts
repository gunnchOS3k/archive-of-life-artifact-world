import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertSpeciesIconNotMismatched,
  getSpeciesIcon,
  SPECIES_REPRESENTATION_CONTRACT,
} from './speciesRepresentation';
import {
  assertHorseNotInAfricanSavanna,
  speciesEligibleInRegion,
  timeEligibleForPresentEncounter,
} from './geographicEligibility';

const ROOT = join(process.cwd());

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(ROOT, rel), 'utf8')) as T;
}

describe('species icon identity (lion ≠ horse)', () => {
  it('does not map every Mammal to the lion mark', () => {
    const mammalGroupOnly = getSpeciesIcon({ group: 'Mammal' });
    expect(mammalGroupOnly).not.toBe(SPECIES_REPRESENTATION_CONTRACT.lionIcon);
  });

  it('gives the lion mark only to the lion taxon', () => {
    const lion = getSpeciesIcon({
      id: 'panthera_leo',
      commonName: 'Lion',
      scientificName: 'Panthera leo',
      family: 'Felidae',
      group: 'Mammal',
    });
    expect(lion).toBe(SPECIES_REPRESENTATION_CONTRACT.lionIcon);
    assertSpeciesIconNotMismatched(
      { id: 'panthera_leo', commonName: 'Lion', scientificName: 'Panthera leo', group: 'Mammal' },
      lion,
    );
  });

  it('gives Przewalski\'s horse a horse mark, never a lion', () => {
    const horse = getSpeciesIcon({
      id: 'equus_caballus_ferus',
      commonName: "Przewalski's Horse",
      scientificName: 'Equus ferus przewalskii',
      family: 'Equidae',
      group: 'Mammal',
    });
    expect(horse).toBe(SPECIES_REPRESENTATION_CONTRACT.horseIcon);
    expect(horse).not.toBe(SPECIES_REPRESENTATION_CONTRACT.lionIcon);
    expect(() =>
      assertSpeciesIconNotMismatched(
        { id: 'equus_caballus_ferus', commonName: "Przewalski's Horse", group: 'Mammal' },
        SPECIES_REPRESENTATION_CONTRACT.lionIcon,
      ),
    ).toThrow(/must not use the lion icon/);
  });
});

describe('geographic / time eligibility', () => {
  it('rejects Przewalski\'s horse in the African savanna', () => {
    const result = speciesEligibleInRegion(
      {
        id: 'equus_caballus_ferus',
        continents: ['Asia'],
        habitats: ['grassland', 'steppe'],
        region: 'steppe',
        timeRange: 'Present',
      },
      { id: 'savanna', continents: ['Africa'], biome: 'savanna', speciesIds: ['panthera_leo'] },
    );
    expect(result.ok).toBe(false);
  });

  it('allows Przewalski\'s horse on the Central Asian steppe', () => {
    const result = speciesEligibleInRegion(
      {
        id: 'equus_caballus_ferus',
        continents: ['Asia'],
        habitats: ['grassland', 'steppe'],
        region: 'steppe',
        timeRange: 'Present',
      },
      {
        id: 'steppe',
        continents: ['Asia'],
        biome: 'steppe',
        speciesIds: ['equus_caballus_ferus'],
      },
    );
    expect(result.ok).toBe(true);
  });

  it('allows present-day horse under present/holocene time filter', () => {
    expect(
      timeEligibleForPresentEncounter(
        { id: 'equus_caballus_ferus', timeRange: 'Present', timeUnitIds: ['holocene'] },
        null,
      ).ok,
    ).toBe(true);
  });

  it('source + frozen + generated region floors keep horse out of African savanna', () => {
    const legacy = loadJson<Array<{ id: string; species?: string[] }>>('data/regions.json');
    const savannaLegacy = legacy.find((r) => r.id === 'savanna');
    expect(savannaLegacy?.species ?? []).not.toContain('equus_caballus_ferus');
    const steppeLegacy = legacy.find((r) => r.id === 'steppe');
    expect(steppeLegacy?.species ?? []).toContain('equus_caballus_ferus');

    const frozen = loadJson<Array<{ id: string; speciesIds?: string[] }>>(
      'public/data/launch/frozen/regions.json',
    );
    const savannaFrozen = frozen.find((r) => r.id === 'savanna');
    expect(savannaFrozen?.speciesIds ?? []).not.toContain('equus_caballus_ferus');
    assertHorseNotInAfricanSavanna('savanna', savannaFrozen?.speciesIds ?? []);
    const steppeFrozen = frozen.find((r) => r.id === 'steppe');
    expect(steppeFrozen?.speciesIds ?? []).toContain('equus_caballus_ferus');

    const mammals = loadJson<Array<{ id: string; region: string; continents: string[] }>>(
      'data/species/mammals.json',
    );
    const horse = mammals.find((s) => s.id === 'equus_caballus_ferus');
    expect(horse?.region).toBe('steppe');
    expect(horse?.continents).toContain('Asia');
    expect(horse?.continents).not.toContain('Africa');
  });
});
