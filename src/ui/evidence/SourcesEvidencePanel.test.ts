import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpeciesEvidenceResult } from '@/services/providers/types';

const getSpeciesEvidenceResult = vi.fn();

vi.mock('@/services/providers/FederationService', () => ({
  federationService: {
    getSpeciesEvidenceResult: (...args: unknown[]) => getSpeciesEvidenceResult(...args),
    detectNameConflicts: () => [],
  },
}));

import { renderSourcesEvidencePanel } from './SourcesEvidencePanel';

function baseResult(partial: Partial<SpeciesEvidenceResult>): SpeciesEvidenceResult {
  return {
    records: [],
    failures: [],
    offline: false,
    status: 'empty',
    conflicts: [],
    ...partial,
  };
}

describe('SourcesEvidencePanel', () => {
  let mount: HTMLElement;

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    getSpeciesEvidenceResult.mockReset();
  });

  afterEach(() => {
    mount.remove();
  });

  it('clears loading when live data loads', async () => {
    getSpeciesEvidenceResult.mockResolvedValue(
      baseResult({
        status: 'live',
        records: [
          {
            providerId: 'col',
            sourceRecordId: '1',
            retrievedAt: '2026-07-14T00:00:00.000Z',
            license: 'CC0',
            attribution: 'COL',
            scientificName: 'Panthera leo',
            confidence: 'observed',
            interpretation: 'observed',
            cacheStatus: 'live',
            payload: {},
          },
        ],
      }),
    );
    await renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo').done;
    expect(mount.querySelector('.evidence-loading')).toBeNull();
    expect(mount.dataset.evidenceState).toBe('live');
    expect(mount.textContent).toMatch(/Live service/);
  });

  it('shows fixture-backed label and never claims fixture is live', async () => {
    getSpeciesEvidenceResult.mockResolvedValue(
      baseResult({
        status: 'fixture',
        records: [
          {
            providerId: 'gbif',
            sourceRecordId: 'fx',
            retrievedAt: '2026-07-14T00:00:00.000Z',
            license: 'CC BY 4.0',
            attribution: 'GBIF fixture',
            confidence: 'observed',
            interpretation: 'observed',
            cacheStatus: 'fixture',
            payload: {},
          },
        ],
      }),
    );
    await renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo').done;
    expect(mount.textContent).toMatch(/Fixture sample/);
    expect(mount.textContent).toMatch(/fixture-backed sample evidence \(not live\)/i);
    expect(mount.textContent).not.toMatch(/Live sources loaded/);
    expect(mount.querySelector('.evidence-card-details')?.hasAttribute('hidden')).toBe(true);
    expect(mount.querySelector('.evidence-expand-btn')).toBeTruthy();
  });

  it('shows cached banner when live unavailable', async () => {
    getSpeciesEvidenceResult.mockResolvedValue(
      baseResult({
        status: 'cached',
        records: [
          {
            providerId: 'gbif',
            sourceRecordId: 'c',
            retrievedAt: '2026-07-14T00:00:00.000Z',
            license: 'CC BY 4.0',
            attribution: 'cached',
            confidence: 'observed',
            interpretation: 'observed',
            cacheStatus: 'cached',
            payload: {},
          },
        ],
      }),
    );
    await renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo').done;
    expect(mount.textContent).toMatch(/previously verified \(cached\) evidence/i);
  });

  it('lists failed providers for partial responses and keeps successes', async () => {
    getSpeciesEvidenceResult.mockResolvedValue(
      baseResult({
        status: 'partial',
        failures: [{ providerId: 'worms', reason: 'timed out after 10000ms', timedOut: true }],
        records: [
          {
            providerId: 'col',
            sourceRecordId: '1',
            retrievedAt: '2026-07-14T00:00:00.000Z',
            license: 'CC0',
            attribution: 'COL',
            confidence: 'observed',
            interpretation: 'observed',
            cacheStatus: 'live',
            payload: {},
          },
        ],
      }),
    );
    await renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo').done;
    expect(mount.textContent).toMatch(/Some providers did not respond/);
    expect(mount.textContent).toMatch(/worms/);
    expect(mount.querySelector('[data-provider="col"]')).toBeTruthy();
  });

  it('shows no-evidence empty state', async () => {
    getSpeciesEvidenceResult.mockResolvedValue(baseResult({ status: 'empty' }));
    await renderSourcesEvidencePanel(mount, 'none', 'None').done;
    expect(mount.textContent).toMatch(/No evidence is linked to this entry/);
    expect(mount.querySelector('.evidence-loading')).toBeNull();
  });

  it('shows offline state', async () => {
    getSpeciesEvidenceResult.mockResolvedValue(baseResult({ status: 'offline', offline: true }));
    await renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo').done;
    expect(mount.textContent).toMatch(/offline/i);
  });

  it('shows timed out state with retry', async () => {
    getSpeciesEvidenceResult.mockResolvedValue(
      baseResult({
        status: 'timed_out',
        failures: [{ providerId: 'gbif', reason: 'timed out after 10000ms', timedOut: true }],
      }),
    );
    await renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo').done;
    expect(mount.textContent).toMatch(/timed out/i);
    expect(mount.querySelector('.evidence-retry-btn')).toBeTruthy();
  });

  it('retry initiates a new bounded request', async () => {
    getSpeciesEvidenceResult
      .mockResolvedValueOnce(
        baseResult({
          status: 'timed_out',
          failures: [{ providerId: 'gbif', reason: 'timed out', timedOut: true }],
        }),
      )
      .mockResolvedValueOnce(
        baseResult({
          status: 'live',
          records: [
            {
              providerId: 'col',
              sourceRecordId: '1',
              retrievedAt: '2026-07-14T00:00:00.000Z',
              license: 'CC0',
              attribution: 'COL',
              confidence: 'observed',
              interpretation: 'observed',
              cacheStatus: 'live',
              payload: {},
            },
          ],
        }),
      );
    const first = renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo');
    await first.done;
    const btn = mount.querySelector('.evidence-retry-btn') as HTMLButtonElement;
    btn.click();
    await vi.waitFor(() => expect(getSpeciesEvidenceResult).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(mount.dataset.evidenceState).toBe('live'));
  });

  it('panel close before finish leaves loading cleared for aborted generation', async () => {
    getSpeciesEvidenceResult.mockImplementation(
      () =>
        new Promise<SpeciesEvidenceResult>(() => {
          /* never settles — abort must still clear loading */
        }),
    );
    const handle = renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo');
    expect(mount.querySelector('.evidence-loading')).toBeTruthy();
    handle.abort();
    await handle.done;
    expect(mount.dataset.evidenceState).toBe('aborted');
    expect(mount.querySelector('.evidence-loading')).toBeNull();
  });

  it('panel reopen replaces prior request and resolves loading', async () => {
    getSpeciesEvidenceResult
      .mockImplementationOnce(
        () =>
          new Promise(() => {
            /* first open never settles until aborted */
          }),
      )
      .mockResolvedValueOnce(
        baseResult({
          status: 'live',
          records: [
            {
              providerId: 'col',
              sourceRecordId: '2',
              retrievedAt: '2026-07-14T00:00:00.000Z',
              license: 'CC0',
              attribution: 'COL',
              confidence: 'observed',
              interpretation: 'observed',
              cacheStatus: 'live',
              payload: {},
            },
          ],
        }),
      );
    renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo');
    await vi.waitFor(() => expect(mount.querySelector('.evidence-loading')).toBeTruthy());
    await renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo').done;
    expect(mount.querySelector('.evidence-loading')).toBeNull();
    expect(mount.dataset.evidenceState).toBe('live');
  });

  it('loading state always resolves even when federation throws', async () => {
    getSpeciesEvidenceResult.mockRejectedValue(new Error('unexpected'));
    await renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo').done;
    expect(mount.querySelector('.evidence-loading')).toBeNull();
    expect(mount.dataset.evidenceState).toBe('error');
    expect(mount.textContent).toMatch(/Retry source lookup/);
  });

  it('regression: Sources and Evidence infinite-loading defect — UI never stays on Loading', async () => {
    getSpeciesEvidenceResult.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error('provider hung past bound')), 5);
        }),
    );
    await renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo').done;
    expect(mount.querySelector('.evidence-loading')).toBeNull();
    expect(mount.dataset.evidenceState).not.toBe('loading');
  });

  it('survives save/reload style remount with same species id', async () => {
    getSpeciesEvidenceResult.mockResolvedValue(
      baseResult({
        status: 'live',
        records: [
          {
            providerId: 'col',
            sourceRecordId: 'persist-1',
            retrievedAt: '2026-07-14T00:00:00.000Z',
            license: 'CC0',
            attribution: 'COL',
            scientificName: 'Panthera leo',
            confidence: 'observed',
            interpretation: 'observed',
            cacheStatus: 'live',
            payload: {},
          },
        ],
      }),
    );
    await renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo').done;
    const firstId = mount.querySelector('[data-field="record-id"]')?.textContent;
    mount.remove();
    mount = document.createElement('div');
    document.body.appendChild(mount);
    await renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo').done;
    expect(mount.querySelector('[data-field="record-id"]')?.textContent).toBe(firstId);
  });

  it('background-style abort mid-retrieval does not leave a stuck spinner on the next open', async () => {
    const controller = new AbortController();
    getSpeciesEvidenceResult.mockImplementation(
      () =>
        new Promise<SpeciesEvidenceResult>(() => {
          /* hangs until parent abort races */
        }),
    );
    const first = renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo', {
      signal: controller.signal,
    });
    controller.abort();
    await first.done;
    getSpeciesEvidenceResult.mockResolvedValue(
      baseResult({
        status: 'fixture',
        records: [
          {
            providerId: 'gbif',
            sourceRecordId: 'fx',
            retrievedAt: '2026-07-14T00:00:00.000Z',
            license: 'CC BY 4.0',
            attribution: 'fixture',
            confidence: 'observed',
            interpretation: 'observed',
            cacheStatus: 'fixture',
            payload: {},
          },
        ],
      }),
    );
    await renderSourcesEvidencePanel(mount, 'african_lion', 'Panthera leo').done;
    expect(mount.querySelector('.evidence-loading')).toBeNull();
    expect(mount.dataset.evidenceState).toBe('fixture');
  });

  it('keeps technical fields collapsed by default and reveals exact values on expand', async () => {
    getSpeciesEvidenceResult.mockResolvedValue(
      baseResult({
        status: 'live',
        records: [
          {
            providerId: 'pbdb',
            sourceRecordId: 'taxon:123',
            sourceUrl: 'https://paleobiodb.org/data1.2/taxa/single.json?id=123',
            retrievedAt: '2026-07-14T00:00:00.000Z',
            license: 'CC BY 4.0',
            attribution: 'PBDB',
            scientificName: 'Tyrannosaurus rex',
            acceptedName: 'Tyrannosaurus rex',
            taxonomicRank: 'species',
            eventDate: 'Late Cretaceous',
            latitude: 45.1,
            longitude: -104.2,
            geographicPrecision: 'formation',
            temporalPrecision: 'stage',
            qualityFlag: 'research_grade',
            confidence: 'reconstructed',
            interpretation: 'reconstructed',
            cacheStatus: 'live',
            payload: {},
          },
        ],
      }),
    );
    await renderSourcesEvidencePanel(mount, 't_rex', 'Tyrannosaurus rex').done;
    const card = mount.querySelector('.evidence-card') as HTMLElement;
    const details = mount.querySelector('.evidence-card-details') as HTMLElement;
    const expand = mount.querySelector('.evidence-expand-btn') as HTMLButtonElement;
    expect(card.dataset.expanded).toBe('false');
    expect(details.hidden).toBe(true);
    expect(mount.querySelector('.evidence-source-link')?.getAttribute('href')).toBe(
      'https://paleobiodb.org/data1.2/taxa/single.json?id=123',
    );
    expect(mount.textContent).toMatch(/Live service/);
    expect(mount.textContent).toMatch(/Reconstructed evidence/);
    expand.click();
    expect(card.dataset.expanded).toBe('true');
    expect(details.hidden).toBe(false);
    for (const field of [
      'record-id',
      'scientific-name',
      'accepted-name',
      'rank',
      'date',
      'coordinates',
      'geo-precision',
      'time-precision',
      'retrieved',
      'license',
      'quality',
      'classification',
      'notes',
      'source-url',
    ]) {
      expect(details.querySelector(`[data-field="${field}"]`)).toBeTruthy();
    }
    expect(details.querySelector('[data-field="quality"]')?.textContent).toBe('research_grade');
    expect(details.querySelector('[data-field="classification"]')?.textContent).toBe('reconstructed');
    expect(mount.textContent).not.toMatch(/Live sources loaded[\s\S]*Fixture sample/);
  });
});
