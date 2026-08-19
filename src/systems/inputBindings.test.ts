import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_BINDINGS,
  defaultProfile,
  loadInputBindings,
  probeInputRemappingPersistence,
  resetInputBindings,
  saveInputBindings,
  setBinding,
} from '@/systems/inputBindings';

describe('inputBindings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('default profile covers all normalized actions', () => {
    const profile = defaultProfile();
    expect(profile.bindings.move_up).toBe(DEFAULT_BINDINGS.move_up);
    expect(Object.keys(profile.bindings)).toHaveLength(8);
  });

  it('persists change and reloads round-trip', () => {
    expect(setBinding('map', 'touch:map_corner')).toBe(true);
    expect(loadInputBindings().bindings.map).toBe('touch:map_corner');
  });

  it('rejects invalid and conflicting bindings', () => {
    expect(setBinding('pause', '')).toBe(false);
    expect(setBinding('journal', DEFAULT_BINDINGS.interact)).toBe(false);
  });

  it('reset restores defaults', () => {
    setBinding('interact', 'touch:custom');
    resetInputBindings();
    expect(loadInputBindings().bindings.interact).toBe(DEFAULT_BINDINGS.interact);
  });

  it('save rejects malformed profile', () => {
    const bad = defaultProfile();
    // @ts-expect-error intentional invalid binding for validation test
    bad.bindings.interact = '';
    expect(saveInputBindings(bad)).toBe(false);
  });

  it('probe round-trip passes', () => {
    const result = probeInputRemappingPersistence();
    expect(result.ok).toBe(true);
  });
});
