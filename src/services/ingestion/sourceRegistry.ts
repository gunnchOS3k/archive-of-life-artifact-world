/**
 * Source availability states for production-grade ingestion.
 * FIXTURE_TEST_ONLY must never trigger live HTTP.
 */

export type SourceAvailabilityState =
  | 'LIVE_PUBLIC'
  | 'AUTHORIZED_BULK'
  | 'SNAPSHOT'
  | 'FIXTURE_TEST_ONLY'
  | 'UNAVAILABLE';

export type RegistrySourceId =
  | 'col'
  | 'gbif'
  | 'pbdb'
  | 'iucn'
  | 'neotoma'
  | 'nasa'
  | 'inaturalist'
  | 'obis'
  | 'worms';

export interface SourceRegistryEntry {
  id: RegistrySourceId;
  label: string;
  organization: string;
  /** Declared operational state for this build / environment */
  state: SourceAvailabilityState;
  /** Public API base when LIVE_PUBLIC */
  liveApiBase?: string;
  licenseNotes: string;
  /** True when license/API permits automated ingest in this product path */
  ingestPermitted: boolean;
  /** If true, live HTTP is forbidden even when state looks public */
  fixtureOnly: boolean;
  supportsSynonyms: boolean;
  supportsPagination: boolean;
  notes: string;
}

/**
 * Default registry — honest product defaults.
 * Fixtures never flip to liveClaim; LIVE_PUBLIC sources may be probed bounded.
 */
export const DEFAULT_SOURCE_REGISTRY: SourceRegistryEntry[] = [
  {
    id: 'col',
    label: 'Catalogue of Life / ChecklistBank',
    organization: 'Catalogue of Life',
    state: 'LIVE_PUBLIC',
    liveApiBase: 'https://api.checklistbank.org',
    licenseNotes: 'Respect COL / ChecklistBank terms of use',
    ingestPermitted: true,
    fixtureOnly: false,
    supportsSynonyms: true,
    supportsPagination: true,
    notes: 'Public nameusage search; bulk dumps prefer SNAPSHOT/AUTHORIZED_BULK',
  },
  {
    id: 'gbif',
    label: 'GBIF',
    organization: 'GBIF',
    state: 'LIVE_PUBLIC',
    liveApiBase: 'https://api.gbif.org/v1',
    licenseNotes: 'Occurrence licenses vary; prefer download DOI for bulk',
    ingestPermitted: true,
    fixtureOnly: false,
    supportsSynonyms: true,
    supportsPagination: true,
    notes: 'Bounded live search OK; millions of records require AUTHORIZED_BULK download',
  },
  {
    id: 'pbdb',
    label: 'Paleobiology Database',
    organization: 'Paleobiology Database',
    state: 'LIVE_PUBLIC',
    liveApiBase: 'https://paleobiodb.org/data1.2',
    licenseNotes: 'CC BY 4.0',
    ingestPermitted: true,
    fixtureOnly: false,
    supportsSynonyms: true,
    supportsPagination: true,
    notes: 'Public occurrence/taxon API',
  },
  {
    id: 'iucn',
    label: 'IUCN Red List',
    organization: 'IUCN',
    state: 'AUTHORIZED_BULK',
    licenseNotes: 'API token required',
    ingestPermitted: false,
    fixtureOnly: true,
    supportsSynonyms: false,
    supportsPagination: true,
    notes: 'Token / authorized bulk required — not auto-live in Beta path',
  },
  {
    id: 'neotoma',
    label: 'Neotoma Paleoecology',
    organization: 'Neotoma',
    state: 'SNAPSHOT',
    licenseNotes: 'Respect Neotoma terms; prefer approved snapshot',
    ingestPermitted: true,
    fixtureOnly: false,
    supportsSynonyms: false,
    supportsPagination: true,
    notes: 'Snapshot preferred; API sample optional',
  },
  {
    id: 'nasa',
    label: 'NASA Earth metadata',
    organization: 'NASA',
    state: 'LIVE_PUBLIC',
    liveApiBase: 'https://cmr.earthdata.nasa.gov',
    licenseNotes: 'Public NASA metadata APIs',
    ingestPermitted: true,
    fixtureOnly: false,
    supportsSynonyms: false,
    supportsPagination: true,
    notes: 'Metadata only — not taxonomy',
  },
  {
    id: 'inaturalist',
    label: 'iNaturalist',
    organization: 'iNaturalist',
    state: 'UNAVAILABLE',
    licenseNotes: 'API rate limits; licensing review pending',
    ingestPermitted: false,
    fixtureOnly: true,
    supportsSynonyms: false,
    supportsPagination: true,
    notes: 'Adapter not production-enabled',
  },
  {
    id: 'obis',
    label: 'OBIS',
    organization: 'OBIS',
    state: 'UNAVAILABLE',
    licenseNotes: 'Open API — adapter stub',
    ingestPermitted: false,
    fixtureOnly: true,
    supportsSynonyms: false,
    supportsPagination: true,
    notes: 'Marine occurrences — not started',
  },
  {
    id: 'worms',
    label: 'WoRMS',
    organization: 'WoRMS',
    state: 'UNAVAILABLE',
    licenseNotes: 'Open API — not started',
    ingestPermitted: false,
    fixtureOnly: true,
    supportsSynonyms: true,
    supportsPagination: true,
    notes: 'Marine taxonomy — not started',
  },
];

export function getSourceEntry(
  id: string,
  registry: SourceRegistryEntry[] = DEFAULT_SOURCE_REGISTRY,
): SourceRegistryEntry | undefined {
  return registry.find((e) => e.id === id);
}

/** Live HTTP allowed only when state is LIVE_PUBLIC, ingest permitted, not fixtureOnly. */
export function mayCallLiveHttp(entry: SourceRegistryEntry): boolean {
  return (
    entry.state === 'LIVE_PUBLIC' &&
    entry.ingestPermitted === true &&
    entry.fixtureOnly === false
  );
}

/**
 * Resolve effective ingest mode for a source in a run.
 * FIXTURE_TEST_ONLY / UNAVAILABLE / forced fixture → fixture path (never live).
 */
export function resolveIngestMode(
  entry: SourceRegistryEntry,
  opts: { forceFixture?: boolean; snapshotPathPresent?: boolean; authorizedBulkReady?: boolean },
): 'live' | 'fixture' | 'snapshot' | 'blocked' {
  if (opts.forceFixture || entry.state === 'FIXTURE_TEST_ONLY' || entry.fixtureOnly) {
    return 'fixture';
  }
  if (entry.state === 'UNAVAILABLE' || !entry.ingestPermitted) {
    return 'blocked';
  }
  if (entry.state === 'SNAPSHOT' || opts.snapshotPathPresent) {
    return opts.snapshotPathPresent || entry.state === 'SNAPSHOT' ? 'snapshot' : 'blocked';
  }
  if (entry.state === 'AUTHORIZED_BULK') {
    return opts.authorizedBulkReady ? 'snapshot' : 'blocked';
  }
  if (mayCallLiveHttp(entry)) return 'live';
  return 'blocked';
}

/** Assert fixtures are never dialed as live. */
export function assertNeverCallFixtureLive(
  entry: SourceRegistryEntry,
  attemptedLive: boolean,
): void {
  if (attemptedLive && (entry.state === 'FIXTURE_TEST_ONLY' || entry.fixtureOnly)) {
    throw new Error(
      `Honesty violation: attempted live HTTP for FIXTURE_TEST_ONLY source ${entry.id}`,
    );
  }
}
