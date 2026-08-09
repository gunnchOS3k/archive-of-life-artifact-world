import { describe, expect, it } from 'vitest';
import { runMockReleaseFirewall } from '@/claims/mockReleaseFirewall';
import { buildBulkSnapshotManifest, DEFAULT_BULK_SPECS } from '@/services/ingestion/bulk/BulkSnapshotManifest';

describe('Cont VII release integrity', () => {
  it('MOCK firewall rejects mock-as-release and keeps global catalog false', () => {
    const fw = runMockReleaseFirewall();
    expect(fw.releaseRuntimeAllowsMockClaims).toBe(false);
    expect(fw.honesty.globalCatalogComplete).toBe(false);
    expect(fw.honesty.mockCannotSatisfyReleaseGates).toBe(true);
    expect(fw.ok).toBe(true);
    expect(fw.releaseEligibleEntries).toBeGreaterThan(0);
  });

  it('deepens bulk ingest sources without claiming global complete', () => {
    const m = buildBulkSnapshotManifest({
      snapshotId: 't',
      snapshotVersion: '2.2.0-cont-vii',
    });
    expect(m.globalCompleteClaim).toBe(false);
    expect(m.continuation).toBe('VII');
    expect(m.engineRcScope).toBe('launch_tier_engine_runtime');
    expect(m.sources.length).toBeGreaterThanOrEqual(7);
    expect(DEFAULT_BULK_SPECS.map((s) => s.source)).toEqual(
      expect.arrayContaining(['col', 'gbif', 'pbdb', 'iucn', 'neotoma', 'ics', 'smithsonian']),
    );
    expect(m.honesty.deepenBulkDoesNotEqualGlobalCatalog).toBe(true);
  });
});
