/**
 * Modular companion progression — affinity modules unlock from observations,
 * region visits, clues, and expeditions. Two different save histories diverge.
 */

import type { CompanionState, LifelingTrait } from '@/schema';
import {
  applyObservationProgress,
  ensureCompanionProgressFields,
  type ProgressionResult,
} from '@/systems/companionProgression';

export type ModuleUnlockKind =
  | 'observe_species'
  | 'visit_region'
  | 'complete_expedition'
  | 'discover_clue_count';

export interface CompanionModuleDef {
  id: string;
  label: string;
  unlockWhen: {
    kind: ModuleUnlockKind;
    speciesId?: string;
    regionId?: string;
    expeditionId?: string;
    count?: number;
  };
  affinity: string;
  xpBonus: number;
}

export interface CompanionModuleProgress {
  unlockedModules: string[];
  /** Ordered history of module unlock events — drives path divergence */
  pathHistory: string[];
  /** Affinity scores by module affinity key */
  affinities: Record<string, number>;
  /** Stable hash of pathHistory for save comparison */
  pathHash: string;
}

export interface ModularProgressContext {
  modules: CompanionModuleDef[];
  observedSpeciesIds?: string[];
  visitedRegions?: string[];
  completedExpeditions?: string[];
  discoveredClueIds?: string[];
}

const EMPTY_PROGRESS: CompanionModuleProgress = {
  unlockedModules: [],
  pathHistory: [],
  affinities: {},
  pathHash: 'empty',
};

export function ensureCompanionModules(companion: CompanionState): CompanionModuleProgress {
  ensureCompanionProgressFields(companion);
  if (!companion.modules) {
    companion.modules = { ...EMPTY_PROGRESS, affinities: {}, unlockedModules: [], pathHistory: [] };
  }
  if (!Array.isArray(companion.modules.unlockedModules)) companion.modules.unlockedModules = [];
  if (!Array.isArray(companion.modules.pathHistory)) companion.modules.pathHistory = [];
  if (!companion.modules.affinities) companion.modules.affinities = {};
  companion.modules.pathHash = hashPath(companion.modules.pathHistory);
  return companion.modules;
}

export function hashPath(pathHistory: string[]): string {
  if (!pathHistory.length) return 'empty';
  // FNV-1a 32-bit — deterministic, no crypto dependency
  let h = 0x811c9dc5;
  const s = pathHistory.join('>');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `path_${(h >>> 0).toString(16)}`;
}

function isUnlocked(mod: CompanionModuleDef, ctx: ModularProgressContext): boolean {
  const u = mod.unlockWhen;
  switch (u.kind) {
    case 'observe_species':
      return !!u.speciesId && (ctx.observedSpeciesIds ?? []).includes(u.speciesId);
    case 'visit_region':
      return !!u.regionId && (ctx.visitedRegions ?? []).includes(u.regionId);
    case 'complete_expedition':
      return !!u.expeditionId && (ctx.completedExpeditions ?? []).includes(u.expeditionId);
    case 'discover_clue_count':
      return (ctx.discoveredClueIds ?? []).length >= (u.count ?? 1);
    default:
      return false;
  }
}

/**
 * Evaluate module unlocks against current history. Mutates companion.modules.
 * Returns newly unlocked module ids (order = unlock order this call).
 */
export function evaluateCompanionModules(
  companion: CompanionState,
  ctx: ModularProgressContext,
): string[] {
  const progress = ensureCompanionModules(companion);
  const newly: string[] = [];

  for (const mod of ctx.modules) {
    if (progress.unlockedModules.includes(mod.id)) continue;
    if (!isUnlocked(mod, ctx)) continue;

    progress.unlockedModules.push(mod.id);
    progress.pathHistory.push(mod.id);
    progress.affinities[mod.affinity] = (progress.affinities[mod.affinity] ?? 0) + 1;
    companion.xp = (companion.xp ?? 0) + mod.xpBonus;
    newly.push(mod.id);
  }

  progress.pathHash = hashPath(progress.pathHistory);
  companion.level = Math.max(companion.level ?? 1, 1);
  // Reconcile level from xp via existing curve
  ensureCompanionProgressFields(companion);
  return newly;
}

/**
 * Apply observation progress then re-evaluate modular unlocks.
 */
export function applyModularObservation(
  companion: CompanionState,
  opts: {
    kind: 'observe' | 'excavate';
    speciesId: string;
    traits: LifelingTrait[];
    modules: CompanionModuleDef[];
    visitedRegions?: string[];
    completedExpeditions?: string[];
    discoveredClueIds?: string[];
    previouslyObserved?: string[];
  },
): ProgressionResult & { newlyUnlockedModules: string[] } {
  const observed = [...(opts.previouslyObserved ?? []), opts.speciesId];
  const base = applyObservationProgress(companion, {
    kind: opts.kind,
    speciesId: opts.speciesId,
    traits: opts.traits,
  });
  const newlyUnlockedModules = evaluateCompanionModules(companion, {
    modules: opts.modules,
    observedSpeciesIds: observed,
    visitedRegions: opts.visitedRegions,
    completedExpeditions: opts.completedExpeditions,
    discoveredClueIds: opts.discoveredClueIds,
  });
  return { ...base, newlyUnlockedModules };
}

/** True when two companion module histories have diverged. */
export function companionPathsDiverge(a: CompanionState, b: CompanionState): boolean {
  const pa = ensureCompanionModules(a);
  const pb = ensureCompanionModules(b);
  return pa.pathHash !== pb.pathHash || pa.pathHistory.join('|') !== pb.pathHistory.join('|');
}

export function serializeModuleFingerprint(companion: CompanionState): string {
  const p = ensureCompanionModules(companion);
  return JSON.stringify({
    pathHash: p.pathHash,
    pathHistory: p.pathHistory,
    unlockedModules: [...p.unlockedModules].sort(),
    affinities: p.affinities,
  });
}
