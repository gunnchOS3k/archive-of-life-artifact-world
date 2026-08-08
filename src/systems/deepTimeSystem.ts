/**
 * Deep time system — gates / periods for expeditions and encounters.
 */

import type { SaveState } from '@/schema';

export interface DeepTimeUnit {
  id: string;
  label: string;
  gateId?: string;
  startMa?: number;
  endMa?: number;
  /** ICS sample vs source-verified — honesty flag */
  isMockSample?: boolean;
}

export interface DeepTimeProgress {
  viewedTimeUnits: string[];
  viewedGates: string[];
  analyzedPeriods: string[];
  activeTimeUnitId: string | null;
}

export function ensureDeepTime(state: SaveState): DeepTimeProgress {
  if (!state.timeAtlas) {
    state.timeAtlas = {
      viewedTimeUnits: [],
      viewedGates: [],
      analyzedPeriods: [],
      activeTimeUnitId: null,
    };
  }
  return {
    viewedTimeUnits: state.timeAtlas.viewedTimeUnits,
    viewedGates: state.timeAtlas.viewedGates,
    analyzedPeriods: state.timeAtlas.analyzedPeriods,
    activeTimeUnitId: state.timeAtlas.activeTimeUnitId ?? null,
  };
}

export function viewTimeUnit(state: SaveState, unit: DeepTimeUnit): void {
  const t = ensureDeepTime(state);
  if (!state.timeAtlas!.viewedTimeUnits.includes(unit.id)) {
    state.timeAtlas!.viewedTimeUnits.push(unit.id);
  }
  if (unit.gateId && !state.timeAtlas!.viewedGates.includes(unit.gateId)) {
    state.timeAtlas!.viewedGates.push(unit.gateId);
  }
  void t;
}

export function analyzePeriod(state: SaveState, periodId: string): void {
  ensureDeepTime(state);
  if (!state.timeAtlas!.analyzedPeriods.includes(periodId)) {
    state.timeAtlas!.analyzedPeriods.push(periodId);
  }
}

export function setActiveTimeUnit(state: SaveState, unitId: string | null): void {
  ensureDeepTime(state);
  state.timeAtlas!.activeTimeUnitId = unitId;
}

export function deepTimeReady(units: DeepTimeUnit[]): {
  unitCount: number;
  hasSample: boolean;
  sourceVerifiedCount: number;
} {
  return {
    unitCount: units.length,
    hasSample: units.some((u) => u.isMockSample === true) || units.length > 0,
    sourceVerifiedCount: units.filter((u) => u.isMockSample === false).length,
  };
}
