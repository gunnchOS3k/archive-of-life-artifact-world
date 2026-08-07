/**
 * ARCHIVE_LIVE_OPEN_DATA_PIPELINE_DIGITAL_PASS — truthful adapter coverage.
 * Covers COL/GBIF provenance+license+invalid taxa, PBDB (paleobiology) attribution/fixture,
 * and Smithsonian unavailable/blocked fixture path. Does not claim live Smithsonian API access.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adaptColGbifRecords,
  assertRealTaxonName,
  federatedToProvenanced,
  getColAttribution,
  getGbifAttribution,
} from '@/services/providers/provenanceAdapters';
import type { FederatedRecord } from '@/services/providers/types';
import {
  colProvider,
  gbifProvider,
  pbdbProvider,
  smithsonianProvider,
} from '@/services/providers/registry';

function federated(
  partial: Partial<FederatedRecord> & { providerId: string },
): FederatedRecord {
  return {
    sourceRecordId: partial.sourceRecordId ?? '1',
    retrievedAt: '2026-08-07T00:00:00.000Z',
    license: partial.license ?? 'CC BY 4.0',
    attribution: partial.attribution ?? 'test',
    confidence: 'observed',
    interpretation: 'observed',
    cacheStatus: partial.cacheStatus ?? 'fixture',
    payload: partial.payload ?? {},
    scientificName: partial.scientificName,
    acceptedName: partial.acceptedName,
    ...partial,
  };
}

describe('ARCHIVE_LIVE_OPEN_DATA_PIPELINE_DIGITAL_PASS', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('COL/GBIF adapters require license + real taxon; reject invalid names', () => {
    expect(assertRealTaxonName('Panthera leo')).toBe(true);
    expect(assertRealTaxonName('unknown')).toBe(false);
    expect(assertRealTaxonName('placeholder_taxon')).toBe(false);

    const adapted = federatedToProvenanced(
      federated({
        providerId: 'col',
        scientificName: 'Panthera leo',
        license: 'COL terms of use',
        attribution: 'Catalogue of Life',
        sourceRecordId: 'COL-1',
      }),
      'col',
    );
    expect(adapted?.license).toBe('COL terms of use');
    expect(adapted?.providerId).toBe('col');
    expect(adapted?.scientificName).toBe('Panthera leo');

    const filtered = adaptColGbifRecords([
      federated({
        providerId: 'gbif',
        scientificName: 'Danaus plexippus',
        license: 'CC BY 4.0',
      }),
      federated({
        providerId: 'gbif',
        scientificName: 'unknown',
        license: 'CC BY 4.0',
      }),
    ]);
    expect(filtered.inventedTaxa).toBe(false);
    expect(filtered.records).toHaveLength(1);
    expect(filtered.records[0].scientificName).toBe('Danaus plexippus');
    expect(filtered.errors.some((e) => /invalid taxon|unnamed/i.test(e))).toBe(true);

    expect(getColAttribution().organization).toMatch(/Catalogue of Life/);
    expect(getGbifAttribution().license).toMatch(/CC BY/);
  });

  it('COL + GBIF provider attributions expose license and citation URLs', () => {
    const col = colProvider.getAttribution();
    expect(col.organization).toMatch(/Catalogue of Life|COL/i);
    expect(col.license?.trim().length).toBeGreaterThan(0);
    expect(col.sourceUrl).toMatch(/^https?:\/\//);

    const gbif = gbifProvider.getAttribution();
    expect(gbif.organization).toMatch(/GBIF/i);
    expect(gbif.license?.trim().length).toBeGreaterThan(0);
    expect(gbif.sourceUrl).toMatch(/^https?:\/\//);
  });

  it('Paleobiology (PBDB) attribution is CC BY and fixture path returns licensed rows', async () => {
    const attr = pbdbProvider.getAttribution();
    expect(attr.organization).toMatch(/Paleobiology/i);
    expect(attr.license).toMatch(/CC BY/i);
    expect(attr.sourceUrl).toContain('paleobiodb.org');

    // Force fixture path: live fetch fails, asset fetch returns curated fossil bundle.
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('paleobiodb.org')) {
        return new Response('unavailable', { status: 503 });
      }
      if (url.includes('fossil-pbdb.json')) {
        return Response.json({
          records: [
            {
              paleobiodbTaxonNo: 'PBDB-1',
              scientificName: 'Tyrannosaurus rex',
              latitude: 45,
              longitude: -105,
            },
          ],
        });
      }
      return new Response('not found', { status: 404 });
    });

    const health = await pbdbProvider.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.message).toMatch(/fixture/i);

    const rows = await pbdbProvider.getFossilOccurrences!({
      scientificName: 'Tyrannosaurus rex',
      limit: 2,
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].license).toMatch(/CC BY/i);
    expect(rows[0].cacheStatus).toBe('fixture');
    expect(rows[0].qualityFlag).toBe('pbdb_fixture');
    expect(assertRealTaxonName(rows[0].scientificName)).toBe(true);
    fetchMock.mockRestore();
  });

  it('Smithsonian reports unavailable/blocked fixture with attribution URL (not live)', async () => {
    const attr = smithsonianProvider.getAttribution();
    expect(attr.organization).toMatch(/Smithsonian/i);
    expect(attr.license?.trim().length).toBeGreaterThan(0);
    expect(attr.sourceUrl).toContain('si.edu');

    const health = await smithsonianProvider.healthCheck();
    expect(health.ok).toBe(false);
    expect(health.message).toMatch(/not finalized|unavailable|si\.edu/i);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('blocked-providers.json')) {
        return Response.json({
          providers: [
            {
              id: 'smithsonian',
              message: 'endpoint scope not finalized',
              license: 'Verify per collection',
            },
          ],
        });
      }
      return new Response('not found', { status: 404 });
    });

    const rows = await smithsonianProvider.searchTaxa({ scientificName: 'Panthera leo' });
    expect(rows).toHaveLength(1);
    expect(rows[0].cacheStatus).toBe('fixture');
    expect(rows[0].qualityFlag).toBe('smithsonian_fixture_unavailable');
    expect(rows[0].attribution).toMatch(/unavailable|Smithsonian/i);
    expect(rows[0].license?.trim().length).toBeGreaterThan(0);
    expect(String(rows[0].sourceUrl)).toContain('si.edu');
    fetchMock.mockRestore();
  });
});
