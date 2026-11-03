import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  TemporalEarthMapCatalog,
  TemporalEarthMapRecord,
} from '@/schema/temporalMap';
import { TemporalMapService } from '@/services/TemporalMapService';
import {
  assertTemporalMapCatalogHonesty,
  assertTemporalMapPresentationHonesty,
  isAuthorizedSourceVerifiedMap,
  quarantineTemporalMapUnlockHack,
  renderTemporalMapBlockedPanelHtml,
  renderTemporalMapCatalogBannerHtml,
  renderTemporalMapStatusHtml,
  resolveTemporalMapPresentation,
  summarizeTemporalMapCatalogHonesty,
} from '@/systems/timeAtlasBlockedPresentation';

const ROOT = join(__dirname, '../..');

function loadCatalog(): TemporalEarthMapCatalog {
  return JSON.parse(
    readFileSync(join(ROOT, 'public/data/maps/temporal_map_catalog.json'), 'utf8'),
  ) as TemporalEarthMapCatalog;
}

function baseMap(over: Partial<TemporalEarthMapRecord> = {}): TemporalEarthMapRecord {
  return {
    id: 'temporal_map_gate_test',
    timeGateId: 'gate_test',
    timeUnitIds: ['test'],
    timeRange: { oldestMa: 100, youngestMa: 0 },
    status: 'blocked_external',
    fullEarthCoverage: false,
    expectedGridCellCount: 648,
    coveredGridCellCount: 0,
    coveredGridCellIds: [],
    projection: 'EPSG:4326',
    globalBounds: [-180, -90, 180, 90],
    asset: null,
    sourceSnapshotIds: [],
    requiredEvidence: ['paleogeographic_reconstruction'],
    uncertaintyNotes: 'test',
    blockedReason: 'No authorized asset',
    ...over,
  };
}

describe('Time Atlas blocked / illustration / verified map UX', () => {
  it('catalog honesty stays 0/17 scientifically unlocked', () => {
    const catalog = loadCatalog();
    expect(catalog.maps).toHaveLength(17);
    expect(catalog.isMockData).toBe(true);

    const honesty = summarizeTemporalMapCatalogHonesty(catalog);
    expect(honesty.scientificallyUnlocked).toBe(0);
    expect(honesty.labeledSourceVerified).toBe(0);
    expect(honesty.expectedTotal).toBe(17);
    expect(honesty.honestyCopy).toContain('0/17');
    expect(honesty.illustration + honesty.blocked).toBe(17);
    expect(() => assertTemporalMapCatalogHonesty(honesty)).not.toThrow();

    const banner = renderTemporalMapCatalogBannerHtml(honesty);
    expect(banner).toMatch(/data-temporal-maps-unlocked="0"/);
    expect(banner).toMatch(/FULL-EARTH MAPS 0\/17 SOURCE-VERIFIED/);
    expect(banner).toMatch(/blocked|illustration|verified/i);
    expect(banner).toMatch(/authorized reconstruction assets/i);
  });

  it('resolves blocked vs illustration vs verified distinctly', () => {
    const blocked = resolveTemporalMapPresentation(baseMap(), { catalogIsMockData: false });
    expect(blocked.playerState).toBe('blocked');
    expect(blocked.scientificallyUnlocked).toBe(false);
    expect(blocked.sourceVerified).toBe(false);

    const illustration = resolveTemporalMapPresentation(baseMap({ status: 'partial', coveredGridCellCount: 12 }), {
      catalogIsMockData: false,
    });
    expect(illustration.playerState).toBe('illustration');
    expect(illustration.scientificallyUnlocked).toBe(false);

    const mockIllustration = resolveTemporalMapPresentation(baseMap(), { catalogIsMockData: true });
    expect(mockIllustration.playerState).toBe('illustration');
    expect(mockIllustration.scientificallyUnlocked).toBe(false);

    const sha = 'a'.repeat(64);
    const verified = resolveTemporalMapPresentation(
      baseMap({
        status: 'source_verified',
        fullEarthCoverage: true,
        coveredGridCellCount: 648,
        coveredGridCellIds: Array.from({ length: 648 }, (_, i) => `c${i}`),
        asset: {
          path: 'maps/authorized.geojson',
          mediaType: 'application/geo+json',
          sizeBytes: 100,
          sha256: sha,
        },
      }),
      { catalogIsMockData: false },
    );
    expect(verified.playerState).toBe('verified');
    expect(verified.scientificallyUnlocked).toBe(true);
    expect(verified.sourceVerified).toBe(true);
    expect(() => assertTemporalMapPresentationHonesty(verified)).not.toThrow();
  });

  it('refuses fake source_verified status without authorized asset (UI/state hack)', () => {
    const sabotaged = baseMap({
      status: 'source_verified',
      fullEarthCoverage: true,
      coveredGridCellCount: 648,
      asset: null,
    });

    expect(isAuthorizedSourceVerifiedMap(sabotaged, false)).toBe(false);
    const p = resolveTemporalMapPresentation(sabotaged, { catalogIsMockData: false });
    expect(p.playerState).toBe('blocked');
    expect(p.scientificallyUnlocked).toBe(false);
    expect(p.sourceVerified).toBe(false);
    expect(p.refusedFakeVerifiedLabel).toBe(true);

    const statusHtml = renderTemporalMapStatusHtml(p);
    expect(statusHtml).toMatch(/data-temporal-map-unlocked="false"/);
    expect(statusHtml).toMatch(/data-temporal-map-source-verified="false"/);
    expect(statusHtml).toMatch(/REFUSED FAKE source_verified LABEL|BLOCKED/i);
    expect(statusHtml).not.toMatch(/SOURCE VERIFIED — UNLOCKED/);

    const quarantined = quarantineTemporalMapUnlockHack(sabotaged, { catalogIsMockData: false });
    expect(quarantined.status).toBe('blocked_external');
    expect(quarantined.asset).toBeNull();
    expect(quarantined.fullEarthCoverage).toBe(false);
    expect(isAuthorizedSourceVerifiedMap(quarantined, false)).toBe(false);
  });

  it('TemporalMapService cannot unlock blocked maps via status mutation', () => {
    const catalog = loadCatalog();
    const svc = new TemporalMapService();
    (svc as unknown as { catalog: TemporalEarthMapCatalog }).catalog = catalog;

    for (const map of catalog.maps) {
      expect(svc.isScientificallyUnlocked(map)).toBe(false);
      const hacked: TemporalEarthMapRecord = {
        ...map,
        status: 'source_verified',
        fullEarthCoverage: true,
        coveredGridCellCount: map.expectedGridCellCount,
      };
      // Still blocked: mock catalog + no asset
      expect(svc.isScientificallyUnlocked(hacked)).toBe(false);
      const p = resolveTemporalMapPresentation(hacked, { catalogIsMockData: true });
      expect(p.scientificallyUnlocked).toBe(false);
      expect(p.sourceVerified).toBe(false);
      expect(['blocked', 'illustration']).toContain(p.playerState);
    }

    const summary = svc.getSummary();
    expect(summary.scientificallyUnlocked).toBe(0);
    expect(summary.sourceVerified).toBe(0);
    expect(summary.total).toBe(17);
  });

  it('player HTML never claims unlock or source_verified for current catalog', () => {
    const catalog = loadCatalog();
    const honesty = summarizeTemporalMapCatalogHonesty(catalog);
    const banner = renderTemporalMapCatalogBannerHtml(honesty);
    const panels = catalog.maps.map((map) => {
      const p = resolveTemporalMapPresentation(map, { catalogIsMockData: catalog.isMockData });
      return `${renderTemporalMapStatusHtml(p)}\n${renderTemporalMapBlockedPanelHtml(p)}`;
    });
    const blob = `${banner}\n${panels.join('\n')}`;

    expect(blob).toMatch(/data-temporal-maps-unlocked="0"/);
    expect(blob).toMatch(/authorized reconstruction assets/i);
    expect(blob).not.toMatch(/data-temporal-map-unlocked="true"/);
    expect(blob).not.toMatch(/data-temporal-map-source-verified="true"/);
    expect(blob).not.toMatch(/SOURCE VERIFIED — UNLOCKED/);
    expect(blob).toMatch(/data-temporal-map-state="illustration"|data-temporal-map-state="blocked"/);
  });
});
