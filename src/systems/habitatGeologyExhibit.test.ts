import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ArchiveSpecies } from '@/schema';
import type { TemporalEarthMapCatalog } from '@/schema/temporalMap';
import { mapSpeciesToArchiveDexEntry } from '@/services/archivedexMapper';
import { getFlagshipProfile, listFlagshipTaxonIds } from '@/services/flagshipTaxonProfiles';
import { TemporalMapService, temporalMapService } from '@/services/TemporalMapService';
import { renderArchiveDexTab } from '@/ui/archiveDexTabs';
import { buildGeologyExhibit, buildHabitatExhibit, renderGeologyExhibitHtml } from './habitatGeologyExhibit';

const ROOT = process.cwd();
const BUNDLE_DIR = join(ROOT, 'public/data/bundles');

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function bundleSpecies(): Map<string, ArchiveSpecies> {
  const byId = new Map<string, ArchiveSpecies>();
  const files = readdirSync(BUNDLE_DIR).filter((f) => f.startsWith('region-') && f.endsWith('.json'));
  for (const file of [...files, 'hero-species.json']) {
    for (const sp of loadJson<{ species: ArchiveSpecies[] }>(join(BUNDLE_DIR, file)).species) {
      if (!byId.has(sp.id)) byId.set(sp.id, sp);
    }
  }
  return byId;
}

const SPECIES = bundleSpecies();
const CATALOG = loadJson<TemporalEarthMapCatalog>(join(ROOT, 'public/data/maps/temporal_map_catalog.json'));

function entryFor(id: string) {
  const sp = SPECIES.get(id);
  if (!sp) throw new Error(`missing bundle species ${id}`);
  return mapSpeciesToArchiveDexEntry(sp, { entryStatus: 'studied' });
}

afterEach(() => vi.unstubAllGlobals());

describe('habitat exhibit depth', () => {
  it('every bundled flagship carries its authored habitat cues and a non-verified range claim', () => {
    const flagships = listFlagshipTaxonIds().filter((id) => SPECIES.has(id));
    expect(flagships.length).toBe(24);
    for (const id of flagships) {
      const exhibit = buildHabitatExhibit(entryFor(id));
      expect(exhibit.fieldCues).toEqual(getFlagshipProfile(id)!.habitatCues);
      expect(exhibit.fieldCues.length).toBeGreaterThan(0);
      expect(exhibit.rangeClaim, id).not.toBe('source_verified');
    }
  });

  it('mock_sample distribution stays sample_fallback with the bundle uncertainty note', () => {
    const sp = SPECIES.get('panthera_leo')!;
    const exhibit = buildHabitatExhibit(entryFor('panthera_leo'));
    expect(exhibit.rangeClaim).toBe('sample_fallback');
    if (sp.distribution?.uncertaintyNote) expect(exhibit.rangeNote).toBe(sp.distribution.uncertaintyNote);
    else expect(exhibit.rangeNote).toMatch(/not GBIF occurrence-verified/);
  });

  it('a launch-floor range without dataMode but a mock sourceVersion is still sample_fallback', () => {
    const sp = SPECIES.get('panthera_leo')!;
    const floor = { ...sp, distribution: { ...sp.distribution!, dataMode: undefined, uncertaintyNote: undefined, sourceVersion: 'mock-gbif-2026-07' } };
    const entry = mapSpeciesToArchiveDexEntry(floor, { entryStatus: 'studied' });
    expect(buildHabitatExhibit(entry).rangeClaim).toBe('sample_fallback');
    const unlabeled = { ...floor, distribution: { ...floor.distribution, sourceVersion: 'snapshot-2026-07' } };
    expect(buildHabitatExhibit(mapSpeciesToArchiveDexEntry(unlabeled, { entryStatus: 'studied' })).rangeClaim).toBe('unlabeled');
  });

  it('links the expedition region card without an Earth-complete claim', () => {
    const exhibit = buildHabitatExhibit(entryFor('balaenoptera_musculus'));
    expect(exhibit.region?.regionId).toBe('coastal');
    expect(exhibit.region?.earthCompleteClaim).toBe(false);
    expect(exhibit.region?.scientificScope).toMatch(/not a surveyed/i);
  });

  it('biomes are no longer a copy of habitats', () => {
    for (const id of listFlagshipTaxonIds().filter((t) => SPECIES.has(t))) {
      const sp = SPECIES.get(id)!;
      expect(entryFor(id).habitatRange?.biomes).toEqual(sp.distribution?.biomes);
    }
  });

  it('habitat tab renders the exhibit for a discovered flagship', () => {
    const html = renderArchiveDexTab(entryFor('castor_canadensis'), 'habitat', true);
    expect(html).toContain('data-range-claim="sample_fallback"');
    expect(html).toContain('lodge pool');
    expect(html).toContain('Field habitat cues (authored observation hints)');
  });
});

describe('geology exhibit depth', () => {
  it('maps T. rex time units to the Cretaceous gate interval with paleomaps locked', () => {
    const exhibit = buildGeologyExhibit(entryFor('tyrannosaurus_rex'), CATALOG);
    expect(exhibit.intervals.map((i) => i.timeGateId)).toEqual(['gate_cretaceous']);
    expect(CATALOG.isMockData).toBe(true);
    expect(exhibit.intervals[0]).toMatchObject({ oldestMa: 145, youngestMa: 66, paleomapState: 'illustration', scientificallyUnlocked: false });
    expect(exhibit.scientificallyUnlockedCount).toBe(0);
  });

  it('orders a long-ranging taxon oldest first with one row per gate', () => {
    const exhibit = buildGeologyExhibit(entryFor('trilobita_order'), CATALOG);
    expect(exhibit.intervals.map((i) => i.timeGateId)).toEqual([
      'gate_cambrian', 'gate_ordovician', 'gate_silurian', 'gate_devonian', 'gate_carboniferous', 'gate_permian',
    ]);
    expect(exhibit.unmatchedTimeUnitIds).toEqual([]);
  });

  it('refuses a source_verified label without an authorized asset', () => {
    const sabotaged: TemporalEarthMapCatalog = {
      ...CATALOG,
      isMockData: false,
      maps: CATALOG.maps.map((m) => (m.timeGateId === 'gate_cretaceous' ? { ...m, status: 'source_verified' as const } : m)),
    };
    const exhibit = buildGeologyExhibit(entryFor('tyrannosaurus_rex'), sabotaged);
    expect(exhibit.intervals[0].scientificallyUnlocked).toBe(false);
    expect(exhibit.scientificallyUnlockedCount).toBe(0);
  });

  it('says status is unknown when the catalog has not loaded', () => {
    const html = renderGeologyExhibitHtml(entryFor('mammuthus_primigenius'), null);
    expect(html).toContain('data-catalog-loaded="false"');
    expect(html).toMatch(/unknown and not verified/);
  });

  it('time tab renders gate rows from the runtime catalog service', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => CATALOG })));
    await temporalMapService.initialize();
    const html = renderArchiveDexTab(entryFor('mammuthus_primigenius'), 'time', true);
    expect(html).toContain('data-time-gate="gate_pleistocene"');
    expect(html).toContain('data-paleomaps-unlocked="0"');
    expect(html).not.toMatch(/data-paleomap-state="verified"/);
    expect(new TemporalMapService().peekCatalog()).toBeNull();
  });
});
