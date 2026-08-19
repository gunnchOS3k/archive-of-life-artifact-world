/**
 * Input binding profile — persisted locally (touch-primary + optional keyboard).
 * Touch zone IDs are truthful for Capacitor/Android; keyboard codes optional on web.
 */

export const BINDING_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'aol_input_bindings';

export const NORMALIZED_ACTIONS = [
  'move_up',
  'move_down',
  'move_left',
  'move_right',
  'interact',
  'journal',
  'map',
  'pause',
] as const;

export type NormalizedAction = (typeof NORMALIZED_ACTIONS)[number];

export interface InputBindingProfile {
  schemaVersion: number;
  layoutId: string;
  bindings: Record<NormalizedAction, string>;
}

/** Default touch-primary layout (honest for phone/tablet). */
export const DEFAULT_BINDINGS: Record<NormalizedAction, string> = {
  move_up: 'touch:dpad_up',
  move_down: 'touch:dpad_down',
  move_left: 'touch:dpad_left',
  move_right: 'touch:dpad_right',
  interact: 'touch:primary',
  journal: 'touch:journal',
  map: 'touch:map',
  pause: 'touch:menu',
};

export function defaultProfile(): InputBindingProfile {
  return {
    schemaVersion: BINDING_SCHEMA_VERSION,
    layoutId: 'pointer_touch_primary',
    bindings: { ...DEFAULT_BINDINGS },
  };
}

export function validateBindings(
  bindings: Partial<Record<NormalizedAction, string>>,
): bindings is Record<NormalizedAction, string> {
  const seen = new Set<string>();
  for (const action of NORMALIZED_ACTIONS) {
    const value = bindings[action];
    if (typeof value !== 'string' || value.trim().length === 0) {
      return false;
    }
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
  }
  return true;
}

export function loadInputBindings(): InputBindingProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultProfile();
    }
    const parsed = JSON.parse(raw) as Partial<InputBindingProfile>;
    if (parsed.schemaVersion !== BINDING_SCHEMA_VERSION) {
      return defaultProfile();
    }
    if (!validateBindings(parsed.bindings ?? {})) {
      return defaultProfile();
    }
    return {
      schemaVersion: BINDING_SCHEMA_VERSION,
      layoutId: parsed.layoutId ?? 'pointer_touch_primary',
      bindings: { ...DEFAULT_BINDINGS, ...parsed.bindings },
    };
  } catch {
    return defaultProfile();
  }
}

export function saveInputBindings(profile: InputBindingProfile): boolean {
  if (profile.schemaVersion !== BINDING_SCHEMA_VERSION) {
    return false;
  }
  if (!validateBindings(profile.bindings)) {
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function setBinding(action: NormalizedAction, binding: string): boolean {
  if (!NORMALIZED_ACTIONS.includes(action)) {
    return false;
  }
  if (!binding.trim()) {
    return false;
  }
  const profile = loadInputBindings();
  for (const other of NORMALIZED_ACTIONS) {
    if (other !== action && profile.bindings[other] === binding) {
      return false;
    }
  }
  profile.bindings[action] = binding;
  return saveInputBindings(profile);
}

export function resetInputBindings(): InputBindingProfile {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return defaultProfile();
}

/** Executed persistence round-trip for contract probes and Vitest. */
export function probeInputRemappingPersistence(): {
  ok: boolean;
  detail: Record<string, unknown>;
} {
  const store = new Map<string, string>();
  const before = globalThis.localStorage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  };
  try {
    resetInputBindings();
    const defaults = defaultProfile();
    const detail: Record<string, unknown> = {
      defaults_exist: NORMALIZED_ACTIONS.every((a) => defaults.bindings[a]?.length > 0),
    };

    const changed = setBinding('interact', 'touch:primary_alt');
    detail.changed = changed;
    detail.file_written = store.has(STORAGE_KEY);

    const reloaded = loadInputBindings();
    detail.reload_matches = reloaded.bindings.interact === 'touch:primary_alt';

    const invalidRejected = !setBinding('interact', '');
    detail.invalid_rejected = invalidRejected;

    const conflictRejected = !setBinding('journal', 'touch:primary_alt');
    detail.conflict_rejected = conflictRejected;

    resetInputBindings();
    const afterReset = loadInputBindings();
    detail.reset_restores_defaults =
      afterReset.bindings.interact === DEFAULT_BINDINGS.interact && !store.has(STORAGE_KEY);

    const ok = Boolean(
      detail.defaults_exist &&
        detail.changed &&
        detail.file_written &&
        detail.reload_matches &&
        detail.invalid_rejected &&
        detail.conflict_rejected &&
        detail.reset_restores_defaults,
    );
    return { ok, detail };
  } finally {
    globalThis.localStorage = before;
  }
}
