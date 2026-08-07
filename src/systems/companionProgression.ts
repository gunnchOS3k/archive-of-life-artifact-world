/**
 * Lifeling companion progression — original Archive of Life growth model.
 * Levels / traits from successful observations (not Pokémon clones).
 */

import type { CompanionState, LifelingTrait } from '@/schema';

export const OBSERVATION_XP = 25;
export const EXCAVATION_XP = 30;
export const BOND_PER_LEVEL = 8;

/** Soft level curve: level N requires N*100 cumulative XP */
export function xpForLevel(level: number): number {
  return Math.max(1, level) * 100;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  let remaining = Math.max(0, xp);
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
    if (level > 99) break;
  }
  return level;
}

export function xpProgressInLevel(xp: number): { level: number; intoLevel: number; needed: number } {
  let level = 1;
  let remaining = Math.max(0, xp);
  while (remaining >= xpForLevel(level) && level < 99) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return { level, intoLevel: remaining, needed: xpForLevel(level) };
}

export interface ProgressionResult {
  leveledUp: boolean;
  previousLevel: number;
  level: number;
  xpGained: number;
  bondGained: number;
  newlyUnlockedTraits: string[];
}

export function ensureCompanionProgressFields(companion: CompanionState): CompanionState {
  if (typeof companion.level !== 'number' || companion.level < 1) companion.level = 1;
  if (typeof companion.xp !== 'number' || companion.xp < 0) companion.xp = 0;
  if (typeof companion.observationCount !== 'number' || companion.observationCount < 0) {
    companion.observationCount = 0;
  }
  // Reconcile level from xp if stale
  companion.level = levelFromXp(companion.xp);
  return companion;
}

/**
 * Apply XP / bond / trait unlocks after a successful ethical observation or excavation.
 */
export function applyObservationProgress(
  companion: CompanionState,
  opts: {
    kind: 'observe' | 'excavate';
    speciesId: string;
    traits: LifelingTrait[];
  },
): ProgressionResult {
  ensureCompanionProgressFields(companion);
  const previousLevel = companion.level ?? 1;
  const xpGained = opts.kind === 'excavate' ? EXCAVATION_XP : OBSERVATION_XP;
  const nextXp = (companion.xp ?? 0) + xpGained;
  const nextObservations = (companion.observationCount ?? 0) + 1;
  companion.xp = nextXp;
  companion.observationCount = nextObservations;
  companion.level = levelFromXp(nextXp);

  const leveledUp = companion.level > previousLevel;
  const bondGained = leveledUp ? BOND_PER_LEVEL * (companion.level - previousLevel) : 3;
  companion.bond = Math.min(100, companion.bond + bondGained);

  const newlyUnlockedTraits: string[] = [];
  const toUnlock = opts.traits.filter(
    (t) => t.unlockedBy === opts.speciesId || t.unlockedBy === 'any_artifact',
  );
  for (const trait of toUnlock) {
    if (!companion.unlockedTraits.includes(trait.id)) {
      companion.unlockedTraits.push(trait.id);
      newlyUnlockedTraits.push(trait.id);
    }
  }
  // Milestone trait: field attentiveness at level 3+
  if (companion.level >= 3 && !companion.unlockedTraits.includes('celebrate_emote')) {
    companion.unlockedTraits.push('celebrate_emote');
    newlyUnlockedTraits.push('celebrate_emote');
  }

  return {
    leveledUp,
    previousLevel,
    level: companion.level,
    xpGained,
    bondGained,
    newlyUnlockedTraits,
  };
}

export function companionProgressSummary(companion: CompanionState): string {
  ensureCompanionProgressFields(companion);
  const xp = companion.xp ?? 0;
  const { level, intoLevel, needed } = xpProgressInLevel(xp);
  return `Lv ${level} · ${intoLevel}/${needed} XP · ${companion.observationCount ?? 0} observations · bond ${companion.bond}`;
}
