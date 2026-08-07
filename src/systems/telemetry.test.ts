import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearTelemetryBuffer,
  getTelemetryBuffer,
  isTelemetryEnabled,
  setTelemetryEnabled,
  track,
} from '@/systems/telemetry';

describe('telemetry', () => {
  beforeEach(() => {
    clearTelemetryBuffer();
    setTelemetryEnabled(true);
  });

  it('buffers local events without requiring remote ship', () => {
    expect(isTelemetryEnabled()).toBe(true);
    const event = track('device_role_apply', { role: 'handheld_hybrid' });
    expect(event?.name).toBe('device_role_apply');
    expect(getTelemetryBuffer()).toHaveLength(1);
    setTelemetryEnabled(false);
    expect(track('save')).toBeNull();
    expect(getTelemetryBuffer()).toHaveLength(1);
  });
});
