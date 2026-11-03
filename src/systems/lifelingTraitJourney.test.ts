import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CompanionState, LifelingTrait } from '@/schema';
import { createDefaultSave } from '@/systems/saveSystem';
import { applyObservationProgress } from '@/systems/companionProgression';
import {
  assertLifelingTraitJourneyHonesty,
  buildLifelingTraitJourney,
  observationsUntilNextLevel,
  renderLifelingTraitJourneyHtml,
} from '@/systems/lifelingTraitJourney';

const traits = JSON.parse(
  readFileSync(join(process.cwd(), 'public/data/bundles/traits.json'), 'utf8'),
) as LifelingTrait[];

function freshCompanion(): CompanionState {
  return createDefaultSave().companion;
}

describe('lifelingTraitJourney', () => {
  it('builds journey with locked observe steps and honesty claims false', () => {
    const journey = buildLifelingTraitJourney(freshCompanion(), traits);
    expect(journey.schema).toBe('aol.lifeling_trait_journey.v1');
    expect(journey.lockedCount).toBeGreaterThan(0);
    expect(journey.nextStep?.kind).toBe('observe_species');
    expect(journey.claims.iucnAssessed).toBe(false);
    expect(journey.claims.mapsUnlocked).toBe(false);
    expect(journey.claims.sourceVerified).toBe(false);
    expect(journey.claims.HUMAN).toBe(false);
    assertLifelingTraitJourneyHonesty(journey);
  });

  it('advances after observation unlock and surfaces equip step', () => {
    const companion = freshCompanion();
    const lion = traits.find((t) => t.id === 'lion_mane_small')!;
    applyObservationProgress(companion, {
      kind: 'observe',
      speciesId: 'panthera_leo',
      traits,
    });
    expect(companion.unlockedTraits).toContain('lion_mane_small');
    const journey = buildLifelingTraitJourney(companion, traits);
    expect(journey.unlockedCount).toBeGreaterThan(0);
    const equip = journey.steps.find((s) => s.id === `equip:${lion.id}`);
    expect(equip).toBeTruthy();
    expect(equip!.complete).toBe(false);
    expect(journey.steps.find((s) => s.id === `observe:${lion.id}`)?.complete).toBe(true);
  });

  it('marks equip complete when trait is equipped', () => {
    const companion = freshCompanion();
    applyObservationProgress(companion, {
      kind: 'observe',
      speciesId: 'panthera_leo',
      traits,
    });
    companion.equippedTraits = ['lion_mane_small'];
    const journey = buildLifelingTraitJourney(companion, traits);
    expect(journey.steps.find((s) => s.id === 'equip:lion_mane_small')?.complete).toBe(true);
    expect(journey.equippedCount).toBe(1);
  });

  it('renders HTML strip without inventing IUCN/maps/source_verified', () => {
    const html = renderLifelingTraitJourneyHtml(buildLifelingTraitJourney(freshCompanion(), traits));
    expect(html).toContain('data-lifeling-trait-journey="1"');
    expect(html).toContain('data-iucn="blocked_external"');
    expect(html).toContain('conservationBadgesShown=false');
    expect(html).toContain('HUMAN/RC2/V1=false');
    expect(html).not.toMatch(/source_verified\s*=\s*true/i);
    expect(html).not.toMatch(/iucnAssessed=true/);
  });

  it('reports observations until next level as positive for fresh companion', () => {
    expect(observationsUntilNextLevel(freshCompanion())).toBeGreaterThan(0);
  });
});
