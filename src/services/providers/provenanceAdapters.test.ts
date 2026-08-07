import { describe, expect, it } from 'vitest';
import {
  adaptColGbifRecords,
  assertRealTaxonName,
  federatedToProvenanced,
  formatProvenanceCitations,
  getColAttribution,
  getGbifAttribution,
} from '@/services/providers/provenanceAdapters';
import type { FederatedRecord } from '@/services/providers/types';

function rec(partial: Partial<FederatedRecord> & { providerId: string }): FederatedRecord {
  return {
    sourceRecordId: partial.sourceRecordId ?? '1',
    retrievedAt: '2026-08-07T00:00:00.000Z',
    license: partial.license ?? 'CC BY 4.0',
    attribution: partial.attribution ?? 'test',
    confidence: 'observed',
    interpretation: 'observed',
    cacheStatus: partial.cacheStatus ?? 'live',
    payload: partial.payload ?? {},
    scientificName: partial.scientificName,
    acceptedName: partial.acceptedName,
    ...partial,
  };
}

describe('provenanceAdapters', () => {
  it('rejects invented / placeholder taxon names', () => {
    expect(assertRealTaxonName('Panthera leo')).toBe(true);
    expect(assertRealTaxonName('unknown')).toBe(false);
    expect(assertRealTaxonName('placeholder')).toBe(false);
    expect(assertRealTaxonName('')).toBe(false);
  });

  it('adapts COL/GBIF federated records with explicit license + provenance', () => {
    const adapted = federatedToProvenanced(
      rec({
        providerId: 'col',
        scientificName: 'Panthera leo',
        sourceRecordId: 'COL-123',
        license: 'COL terms',
        attribution: 'Catalogue of Life',
      }),
      'col',
    );
    expect(adapted).not.toBeNull();
    expect(adapted!.license).toBe('COL terms');
    expect(adapted!.providerId).toBe('col');
    expect(adapted!.citation).toContain('Panthera leo');
    expect(adapted!.isFixture).toBe(false);
  });

  it('marks fixture path and never sets inventedTaxa', () => {
    const result = adaptColGbifRecords([
      rec({
        providerId: 'gbif',
        scientificName: 'Danaus plexippus',
        cacheStatus: 'fixture',
        license: 'CC BY 4.0',
        sourceRecordId: 'FX-1',
      }),
      rec({
        providerId: 'gbif',
        scientificName: 'unknown',
        cacheStatus: 'fixture',
      }),
    ]);
    expect(result.inventedTaxa).toBe(false);
    expect(result.usedFixture).toBe(true);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].scientificName).toBe('Danaus plexippus');
    expect(formatProvenanceCitations(result.records)).toMatch(/GBIF/);
  });

  it('exposes COL and GBIF attributions', () => {
    expect(getColAttribution().organization).toMatch(/Catalogue of Life/);
    expect(getGbifAttribution().license).toMatch(/CC BY/);
  });
});
