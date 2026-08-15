/**
 * Audio cue hook — fail-soft SFX trigger points for real gameplay moments
 * (artifact collected, companion level-up, pause toggle). No bundled audio
 * assets ship yet, so playback is best-effort: a missing/blocked file or an
 * unavailable Audio/AudioContext (headless CI, vitest/jsdom) must never
 * throw or affect gameplay — only the last-cue record below is guaranteed.
 */

export type AudioCueName =
  | 'artifact_collected'
  | 'companion_level_up'
  | 'pause_toggle'
  | 'region_travel'
  | 'discovery_chime'
  | 'era_shift'
  | 'achievement_presented'
  | 'finale_return';

export interface AudioCueEvent {
  name: AudioCueName;
  at: number;
  played: boolean;
}

const CUE_PATH = (name: AudioCueName) => `/audio/sfx/${name}.mp3`;

let enabled = true;
let lastCue: AudioCueEvent | null = null;
const history: AudioCueEvent[] = [];
const MAX_HISTORY = 50;

export function setAudioCuesEnabled(value: boolean): void {
  enabled = value;
}

export function isAudioCuesEnabled(): boolean {
  return enabled;
}

export function playCue(name: AudioCueName): AudioCueEvent {
  let played = false;
  if (enabled && typeof Audio !== 'undefined') {
    try {
      const el = new Audio(CUE_PATH(name));
      el.volume = 0.6;
      const p = el.play();
      // jsdom/headless returns undefined or a rejecting promise (no decoder) — both are fine.
      if (p && typeof p.catch === 'function') p.catch(() => {});
      played = true;
    } catch {
      played = false;
    }
  }
  const event: AudioCueEvent = { name, at: Date.now(), played };
  lastCue = event;
  history.push(event);
  if (history.length > MAX_HISTORY) history.shift();
  return event;
}

export function getLastCue(): AudioCueEvent | null {
  return lastCue;
}

export function getCueHistory(): readonly AudioCueEvent[] {
  return history;
}

export function clearCueHistory(): void {
  history.length = 0;
  lastCue = null;
}
