/**
 * HUMAN_POLISH instrumentation — capture hooks for Experience Review Council.
 * Does NOT earn human polish; AI cannot claim HUMAN_POLISH via these hooks.
 */

import { track } from '@/systems/telemetry';

export type PolishHookId =
  | 'companion_customize'
  | 'artifact_collected'
  | 'map_era_context'
  | 'offline_integrity'
  | 'a11y_settings'
  | 'manual_review_marker'
  | 'discovery_feedback'
  | 'launch_pacing'
  | 'hud_presentation'
  | 'achievement_presentation'
  | 'postgame_continue';

export interface PolishCapture {
  id: PolishHookId;
  at: number;
  props?: Record<string, string | number | boolean | null>;
}

const captures: PolishCapture[] = [];
const MAX = 100;

export function capturePolishHook(
  id: PolishHookId,
  props?: PolishCapture['props'],
): PolishCapture {
  const row: PolishCapture = { id, at: Date.now(), props };
  captures.push(row);
  if (captures.length > MAX) captures.shift();
  track('polish_capture', { hook: id, ...(props ?? {}) });
  return row;
}

export function getPolishCaptures(): readonly PolishCapture[] {
  return captures;
}

export function clearPolishCaptures(): void {
  captures.length = 0;
}

/** Honest readiness — instrumentation only; validation is HUMAN_PENDING. */
export function humanPolishInstrumentationReady(): boolean {
  return true;
}

export function humanPolishValidationStatus(): 'HUMAN_PENDING' {
  return 'HUMAN_PENDING';
}
