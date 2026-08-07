import { describe, expect, it } from 'vitest';
import {
  OBSERVATION_XP,
  applyObservationProgress,
  companionProgressSummary,
  ensureCompanionProgressFields,
  levelFromXp,
  xpForLevel,
  xpProgressInLevel,
} from '@/systems/companionProgression';
import type { CompanionState, LifelingTrait } from '@/schema';

const traits: LifelingTrait[] = [
  {
    id: 'lion_mane_small',
    name: 'Lion Mane',
    category: 'head',
    description: 'mane',
    unlockedBy: 'panthera_leo',
  },
];

function companion(partial: Partial<CompanionState> = {}): CompanionState {
  return {
    name: 'Relic',
    bodyColor: '#7EC8A3',
    equippedTraits: [],
    unlockedTraits: [],
    bond: 0,
    level: 1,
    xp: 0,
    observationCount: 0,
    ...partial,
  };
}

describe('companionProgression', () => {
  it('levels from observation XP using original Lifeling curve', () => {
    expect(xpForLevel(1)).toBe(100);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(xpProgressInLevel(100).level).toBe(2);
  });

  it('applies observation progress, traits, and bond', () => {
    const c = companion();
    const result = applyObservationProgress(c, {
      kind: 'observe',
      speciesId: 'panthera_leo',
      traits,
    });
    expect(result.xpGained).toBe(OBSERVATION_XP);
    expect(c.xp).toBe(OBSERVATION_XP);
    expect(c.observationCount).toBe(1);
    expect(c.unlockedTraits).toContain('lion_mane_small');
    expect(result.newlyUnlockedTraits).toContain('lion_mane_small');
    expect(c.bond).toBeGreaterThan(0);
    expect(companionProgressSummary(c)).toMatch(/Lv/);
  });

  it('levels up after enough observations', () => {
    const c = companion({ xp: 90 });
    ensureCompanionProgressFields(c);
    const result = applyObservationProgress(c, {
      kind: 'observe',
      speciesId: 'panthera_leo',
      traits,
    });
    expect(result.leveledUp).toBe(true);
    expect(result.level).toBeGreaterThanOrEqual(2);
    expect(c.level).toBe(result.level);
  });
});
