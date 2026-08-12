/**
 * Local telemetry hooks — privacy-safe event bus (no PII, no remote ship by default).
 */

export type TelemetryEventName =
  | 'game_start'
  | 'region_travel'
  | 'encounter_soft'
  | 'encounter_walk_up'
  | 'observe_start'
  | 'observe_complete'
  | 'excavate_start'
  | 'excavate_complete'
  | 'companion_level_up'
  | 'save'
  | 'load'
  | 'device_role_apply'
  | 'a11y_change'
  | 'time_period_filter'
  | 'panel_open'
  | 'pause_toggle'
  | 'suspend'
  | 'resume'
  | 'pagehide_save'
  | 'clean_exit';

export interface TelemetryEvent {
  name: TelemetryEventName;
  at: number;
  props?: Record<string, string | number | boolean | null>;
}

type Listener = (event: TelemetryEvent) => void;

const MAX_BUFFER = 200;
const buffer: TelemetryEvent[] = [];
const listeners = new Set<Listener>();
let enabled = true;

export function setTelemetryEnabled(value: boolean): void {
  enabled = value;
}

export function isTelemetryEnabled(): boolean {
  return enabled;
}

export function track(
  name: TelemetryEventName,
  props?: TelemetryEvent['props'],
): TelemetryEvent | null {
  if (!enabled) return null;
  const event: TelemetryEvent = { name, at: Date.now(), props };
  buffer.push(event);
  if (buffer.length > MAX_BUFFER) buffer.shift();
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      /* never break gameplay */
    }
  }
  return event;
}

export function onTelemetry(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTelemetryBuffer(): readonly TelemetryEvent[] {
  return buffer;
}

export function clearTelemetryBuffer(): void {
  buffer.length = 0;
}
