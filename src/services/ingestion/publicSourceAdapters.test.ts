import { describe, expect, it } from 'vitest';
import {
  IUCN_OWNER_SETUP_STEPS,
  assertNeverPromoteMock,
  buildIcsLabelSnapshot,
  classifyUnsupportedClaim,
  fetchIucnGated,
} from './publicSourceAdapters';

describe('publicSourceAdapters honesty', () => {
  it('ICS label snapshot never claims approvedForUse or liveClaim', () => {
    const result = buildIcsLabelSnapshot();
    expect(result.ok).toBe(true);
    expect(result.meta.approvedForUse).toBe(false);
    expect(result.meta.liveClaim).toBe(false);
    expect(result.meta.verificationStatus).toBe('needs_source_verification');
    expect(result.records.length).toBeGreaterThanOrEqual(17);
  });

  it('IUCN without token stays blocked_external with owner setup steps', async () => {
    const result = await fetchIucnGated(null);
    expect(result.blocked).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.meta.verificationStatus).toBe('blocked_external');
    expect(result.meta.access).toBe('blocked_until_authorized');
    expect(result.ownerSetupSteps?.length).toBe(IUCN_OWNER_SETUP_STEPS.length);
    expect(result.records).toEqual([]);
  });

  it('never promotes mock to source_verified', () => {
    expect(() => assertNeverPromoteMock('source_verified', true)).toThrow(/Honesty violation/);
    expect(() => assertNeverPromoteMock('mock_sample', true)).not.toThrow();
    expect(() => assertNeverPromoteMock('blocked_external', false)).not.toThrow();
  });

  it('flags Earth-complete / fake map unlock as unsupported_claim', () => {
    expect(classifyUnsupportedClaim('Earth-complete catalog')).toBe('unsupported_claim');
    expect(classifyUnsupportedClaim('17 maps unlocked')).toBe('unsupported_claim');
    expect(classifyUnsupportedClaim('bounded COL fetch')).toBe('needs_source_verification');
  });
});
