import { describe, expect, it } from 'vitest';
import {
  buildCrossDeviceContract,
  CONTRACT_VERSION,
  GAME_ID,
} from '@/crossDevice/contractProvider';

describe('Wave001 cross-device contract (archive)', () => {
  it('builds contract with passing probes from runtime modules', () => {
    const doc = buildCrossDeviceContract({ platform: 'node' });
    expect(doc.contract_version).toBe(CONTRACT_VERSION);
    expect(doc.game_id).toBe(GAME_ID);
    expect(doc.probes.save_roundtrip.status).toBe('pass');
    expect(doc.probes.core_loop.status).toBe('pass');
    expect(doc.probes.multiplayer.status).toBe('not_applicable');
    expect(doc.capability_model.required_features.length).toBeGreaterThan(0);
  });

  it('rules surface is stable for parity', () => {
    const a = buildCrossDeviceContract();
    const b = buildCrossDeviceContract({ roleId: 'student_14_5' });
    expect(a.rules_surface.rules_version).toBe(b.rules_surface.rules_version);
    expect(a.rules_surface.canonical_hash).toBe(b.rules_surface.canonical_hash);
  });
});
