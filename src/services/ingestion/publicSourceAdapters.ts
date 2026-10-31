/**
 * Permitted public / gated scientific source adapters.
 *
 * Public (no credentials): COL ChecklistBank, GBIF, PBDB, Neotoma, NASA metadata, ICS labels.
 * Gated: IUCN — full adapter + blocked until IUCN_API_TOKEN authorized.
 *
 * Live fetch success ≠ source_verified release. Snapshots stay needs_source_verification /
 * sample_fallback until human license approval. Never promote mock_sample.
 */

import type { VerificationStatus } from '@/schema/provenance';
import { sha256Text } from './browserSha256';

export type PublicAdapterSource =
  | 'col'
  | 'gbif'
  | 'pbdb'
  | 'neotoma'
  | 'nasa'
  | 'ics'
  | 'iucn';

export type AdapterAccess =
  | 'public_live'
  | 'public_snapshot'
  | 'gated_token'
  | 'blocked_until_authorized';

export interface AdapterSnapshotMeta {
  source: PublicAdapterSource;
  snapshotId: string;
  retrievedAt: string;
  recordCount: number;
  sha256: string;
  access: AdapterAccess;
  verificationStatus: VerificationStatus;
  licenseLabel: string;
  citation: string;
  approvedForUse: false;
  liveClaim: false;
  notes: string;
}

export interface AdapterFetchResult {
  ok: boolean;
  blocked: boolean;
  source: PublicAdapterSource;
  records: unknown[];
  rawText: string;
  meta: AdapterSnapshotMeta;
  errors: string[];
  ownerSetupSteps?: string[];
}

const COL_SEARCH = 'https://api.checklistbank.org/dataset/3LR/nameusage/search';
const GBIF_SPECIES = 'https://api.gbif.org/v1/species/match';
const PBDB_TAXA = 'https://paleobiodb.org/data1.2/taxa/list.json?vocab=pbdb';
const NEOTOMA_SITES = 'https://api.neotomadb.org/v2.0/data/sites';
const NASA_EONET = 'https://eonet.gsfc.nasa.gov/api/v3/events';
const NASA_CMR =
  'https://cmr.earthdata.nasa.gov/search/collections.json?keyword=HLS&page_size=5';
const IUCN_PAGE = 'https://apiv3.iucnredlist.org/api/v3/species/page/0';

export const IUCN_OWNER_SETUP_STEPS = [
  'Request IUCN Red List API access under IUCN terms of use (not assumed CC-BY).',
  'Store the token only in data-pipeline/.env as IUCN_API_TOKEN — never commit it.',
  'Confirm redistribution / game-display rights with a human rights reviewer.',
  'Run: npm run source:import:iucn',
  'Run: npm run source:audit && npm run audit:production',
  'Keep production ready=false until verified_record_count>0 AND data_mode=source_verified after review.',
] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function metaBase(
  source: PublicAdapterSource,
  snapshotId: string,
  rawText: string,
  recordCount: number,
  access: AdapterAccess,
  verificationStatus: VerificationStatus,
  licenseLabel: string,
  citation: string,
  notes: string,
): AdapterSnapshotMeta {
  return {
    source,
    snapshotId,
    retrievedAt: nowIso(),
    recordCount,
    sha256: sha256Text(rawText),
    access,
    verificationStatus,
    licenseLabel,
    citation,
    approvedForUse: false,
    liveClaim: false,
    notes,
  };
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** COL ChecklistBank — public nameusage search (bounded). */
export async function fetchColBounded(scientificNames: string[]): Promise<AdapterFetchResult> {
  const errors: string[] = [];
  const records: unknown[] = [];
  for (const name of scientificNames.slice(0, 40)) {
    try {
      const text = await fetchText(
        `${COL_SEARCH}?q=${encodeURIComponent(name)}&limit=5&offset=0`,
      );
      const body = JSON.parse(text) as { result?: unknown[] };
      for (const hit of body.result ?? []) records.push({ query: name, hit });
    } catch (err) {
      errors.push(`COL ${name}: ${String(err)}`);
    }
  }
  const rawText = JSON.stringify({ source: 'col', records });
  return {
    ok: records.length > 0,
    blocked: false,
    source: 'col',
    records,
    rawText,
    meta: metaBase(
      'col',
      'col-public-bounded-flagship',
      rawText,
      records.length,
      'public_live',
      'needs_source_verification',
      'COL terms of use',
      'Catalogue of Life / ChecklistBank public API',
      'Bounded live fetch — not approvedForUse; never promotes mock heroes to source_verified',
    ),
    errors,
  };
}

/** GBIF species match — public, no key for match API. */
export async function fetchGbifBounded(scientificNames: string[]): Promise<AdapterFetchResult> {
  const errors: string[] = [];
  const records: unknown[] = [];
  for (const name of scientificNames.slice(0, 40)) {
    try {
      const text = await fetchText(`${GBIF_SPECIES}?name=${encodeURIComponent(name)}`);
      const body = JSON.parse(text) as Record<string, unknown>;
      if (body.usageKey || body.scientificName) records.push({ query: name, match: body });
    } catch (err) {
      errors.push(`GBIF ${name}: ${String(err)}`);
    }
  }
  const rawText = JSON.stringify({ source: 'gbif', records });
  return {
    ok: records.length > 0,
    blocked: false,
    source: 'gbif',
    records,
    rawText,
    meta: metaBase(
      'gbif',
      'gbif-public-bounded-flagship',
      rawText,
      records.length,
      'public_live',
      'needs_source_verification',
      'Per-dataset licenses vary',
      'GBIF.org species match API',
      'Species match only — occurrence bulk downloads still require GBIF_DOWNLOAD_PATH',
    ),
    errors,
  };
}

/** Paleobiology Database — public CC-BY taxa list. */
export async function fetchPbdbBounded(scientificNames: string[]): Promise<AdapterFetchResult> {
  const errors: string[] = [];
  const records: unknown[] = [];
  for (const name of scientificNames.slice(0, 40)) {
    try {
      const text = await fetchText(
        `${PBDB_TAXA}&name=${encodeURIComponent(name)}&limit=5&offset=0`,
      );
      const body = JSON.parse(text) as { records?: unknown[] };
      for (const row of body.records ?? []) records.push({ query: name, row });
    } catch (err) {
      errors.push(`PBDB ${name}: ${String(err)}`);
    }
  }
  const rawText = JSON.stringify({ source: 'pbdb', records });
  return {
    ok: records.length > 0,
    blocked: false,
    source: 'pbdb',
    records,
    rawText,
    meta: metaBase(
      'pbdb',
      'pbdb-public-bounded-flagship',
      rawText,
      records.length,
      'public_live',
      'needs_source_verification',
      'CC BY 4.0',
      'Paleobiology Database data1.2 API',
      'Bounded taxa fetch — release approval still required before source_verified',
    ),
    errors,
  };
}

/** Neotoma sites sample — public API. */
export async function fetchNeotomaBounded(limit = 25): Promise<AdapterFetchResult> {
  const errors: string[] = [];
  try {
    const text = await fetchText(`${NEOTOMA_SITES}?limit=${limit}`);
    const body = JSON.parse(text) as { data?: unknown[] };
    const records = body.data ?? [];
    return {
      ok: records.length > 0,
      blocked: false,
      source: 'neotoma',
      records,
      rawText: text,
      meta: metaBase(
        'neotoma',
        'neotoma-public-sites-bounded',
        text,
        records.length,
        'public_live',
        'needs_source_verification',
        'Neotoma terms',
        'Neotoma Paleoecology Database API v2',
        'Site sample only — not paleoecology completeness',
      ),
      errors,
    };
  } catch (err) {
    errors.push(String(err));
    const rawText = JSON.stringify({ source: 'neotoma', records: [], error: String(err) });
    return {
      ok: false,
      blocked: false,
      source: 'neotoma',
      records: [],
      rawText,
      meta: metaBase(
        'neotoma',
        'neotoma-public-sites-bounded',
        rawText,
        0,
        'public_live',
        'blocked_external',
        'Neotoma terms',
        'Neotoma Paleoecology Database API v2',
        'Fetch failed — keep blocked_external until retry succeeds',
      ),
      errors,
    };
  }
}

/** NASA public metadata (EONET + CMR) — never upgrades regional measurement mocks. */
export async function fetchNasaMetadataBounded(): Promise<AdapterFetchResult> {
  const errors: string[] = [];
  const records: unknown[] = [];
  let rawParts: Record<string, unknown> = {};
  try {
    const eonetText = await fetchText(`${NASA_EONET}?limit=5`);
    rawParts = { ...rawParts, eonet: JSON.parse(eonetText) };
    records.push({ layer: 'eonet', mode: 'REAL NASA METADATA' });
  } catch (err) {
    errors.push(`EONET: ${String(err)}`);
  }
  try {
    const cmrText = await fetchText(NASA_CMR);
    rawParts = { ...rawParts, cmr: JSON.parse(cmrText) };
    records.push({ layer: 'cmr_hls', mode: 'REAL NASA METADATA' });
  } catch (err) {
    errors.push(`CMR: ${String(err)}`);
  }
  const rawText = JSON.stringify({
    source: 'nasa',
    scope: 'metadata_only',
    measurementDataMode: 'not_ingested',
    ...rawParts,
  });
  return {
    ok: records.length > 0,
    blocked: false,
    source: 'nasa',
    records,
    rawText,
    meta: metaBase(
      'nasa',
      'nasa-public-metadata-bounded',
      rawText,
      records.length,
      'public_live',
      'needs_source_verification',
      'NASA open metadata',
      'NASA Earthdata CMR / EONET',
      'Metadata only — sample_region_layers remain mock until authorized measurements',
    ),
    errors,
  };
}

/**
 * ICS chronostratigraphic labels — curated citation stub.
 * Does not invent ages; does not unlock maps; stays needs_source_verification
 * until an approved chart snapshot replaces the labeled sample.
 */
export function buildIcsLabelSnapshot(): AdapterFetchResult {
  const units = [
    { id: 'hadean', name: 'Hadean', rank: 'eon' },
    { id: 'archean', name: 'Archean', rank: 'eon' },
    { id: 'proterozoic', name: 'Proterozoic', rank: 'eon' },
    { id: 'phanerozoic', name: 'Phanerozoic', rank: 'eon' },
    { id: 'paleozoic', name: 'Paleozoic', rank: 'era' },
    { id: 'mesozoic', name: 'Mesozoic', rank: 'era' },
    { id: 'cenozoic', name: 'Cenozoic', rank: 'era' },
    { id: 'cambrian', name: 'Cambrian', rank: 'period' },
    { id: 'ordovician', name: 'Ordovician', rank: 'period' },
    { id: 'silurian', name: 'Silurian', rank: 'period' },
    { id: 'devonian', name: 'Devonian', rank: 'period' },
    { id: 'carboniferous', name: 'Carboniferous', rank: 'period' },
    { id: 'permian', name: 'Permian', rank: 'period' },
    { id: 'triassic', name: 'Triassic', rank: 'period' },
    { id: 'jurassic', name: 'Jurassic', rank: 'period' },
    { id: 'cretaceous', name: 'Cretaceous', rank: 'period' },
    { id: 'paleogene', name: 'Paleogene', rank: 'period' },
    { id: 'neogene', name: 'Neogene', rank: 'period' },
    { id: 'quaternary', name: 'Quaternary', rank: 'period' },
    { id: 'pleistocene', name: 'Pleistocene', rank: 'epoch' },
    { id: 'holocene', name: 'Holocene', rank: 'epoch' },
  ];
  const rawText = JSON.stringify({
    source: 'ics',
    citation: 'International Chronostratigraphic Chart — https://stratigraphy.org/',
    note: 'Label inventory for adapter contract tests; ages/maps remain sample until approved ICS asset import',
    units,
  });
  return {
    ok: true,
    blocked: false,
    source: 'ics',
    records: units,
    rawText,
    meta: metaBase(
      'ics',
      'ics-label-inventory-unapproved',
      rawText,
      units.length,
      'public_snapshot',
      'needs_source_verification',
      'ICS guidance — reuse review required',
      'International Commission on Stratigraphy',
      'Does not set time_manifest.isMockData=false; does not unlock 17 temporal maps',
    ),
    errors: [],
  };
}

/**
 * IUCN Red List — gated. Without token: blocked_external with owner setup steps.
 * With token: fetch page 0 but still approvedForUse=false until rights review.
 */
export async function fetchIucnGated(token?: string | null): Promise<AdapterFetchResult> {
  if (!token || !token.trim()) {
    const rawText = JSON.stringify({ source: 'iucn', blocked: true, reason: 'missing IUCN_API_TOKEN' });
    return {
      ok: false,
      blocked: true,
      source: 'iucn',
      records: [],
      rawText,
      meta: metaBase(
        'iucn',
        'iucn-blocked-no-token',
        rawText,
        0,
        'blocked_until_authorized',
        'blocked_external',
        'IUCN-TOS',
        'IUCN Red List of Threatened Species',
        'Adapter present; import blocked until authorized token + terms review',
      ),
      errors: ['IUCN_API_TOKEN missing'],
      ownerSetupSteps: [...IUCN_OWNER_SETUP_STEPS],
    };
  }
  try {
    const text = await fetchText(`${IUCN_PAGE}?token=${encodeURIComponent(token.trim())}`);
    const body = JSON.parse(text) as { result?: unknown[] };
    const records = body.result ?? [];
    return {
      ok: records.length > 0,
      blocked: false,
      source: 'iucn',
      records,
      rawText: text,
      meta: metaBase(
        'iucn',
        'iucn-api-page0-unreviewed',
        text,
        records.length,
        'gated_token',
        'needs_source_verification',
        'IUCN-TOS',
        'IUCN Red List API v3',
        'Token used; still not source_verified until human rights + redistribution review',
      ),
      errors: [],
      ownerSetupSteps: [...IUCN_OWNER_SETUP_STEPS],
    };
  } catch (err) {
    const rawText = JSON.stringify({ source: 'iucn', error: String(err) });
    return {
      ok: false,
      blocked: true,
      source: 'iucn',
      records: [],
      rawText,
      meta: metaBase(
        'iucn',
        'iucn-fetch-failed',
        rawText,
        0,
        'gated_token',
        'blocked_external',
        'IUCN-TOS',
        'IUCN Red List API v3',
        'Fetch failed — keep blocked; do not invent assessments',
      ),
      errors: [String(err)],
      ownerSetupSteps: [...IUCN_OWNER_SETUP_STEPS],
    };
  }
}

/** Honesty: never treat mock or blocked as source_verified. */
export function assertNeverPromoteMock(status: VerificationStatus, isMock: boolean): void {
  if (isMock && status === 'source_verified') {
    throw new Error('Honesty violation: mock_sample must never be labeled source_verified');
  }
  if (status === 'unsupported_claim' && isMock) {
    // unsupported_claim is allowed as an honest rejection of a claim — not a mock promotion
    return;
  }
}

/**
 * Bounded public acquires register as sample_fallback / needs_source_verification.
 * Never promote those modes to source_verified without human license + redistribution review.
 */
export function assertNeverPromoteSampleFallback(
  dataMode: string | null | undefined,
  verificationStatus: VerificationStatus | string | null | undefined,
  verifiedRecordCount = 0,
): void {
  const mode = (dataMode ?? '').toLowerCase();
  const status = (verificationStatus ?? '').toLowerCase();
  const fallbackish =
    mode === 'sample_fallback' ||
    mode === 'not_source_verified' ||
    status === 'needs_source_verification' ||
    status === 'mock_sample' ||
    status === 'blocked_external';
  if (fallbackish && status === 'source_verified') {
    throw new Error(
      'Honesty violation: sample_fallback / unverified modes must never be labeled source_verified',
    );
  }
  if (fallbackish && verifiedRecordCount > 0 && status === 'source_verified') {
    throw new Error(
      'Honesty violation: verified_record_count cannot invent source_verified for sample_fallback',
    );
  }
  if (mode === 'sample_fallback' && verifiedRecordCount !== 0) {
    throw new Error(
      'Honesty violation: sample_fallback must keep verified_record_count=0 until human approval',
    );
  }
}

export type ScienceHonestyRow = {
  source: PublicAdapterSource;
  dataMode: string;
  verificationStatus: VerificationStatus | 'blocked_external';
  verifiedRecordCount: number;
  recordCount: number;
  approvedForUse: false;
  sourceVerifiedRelease: false;
  notes: string;
};

/** Canonical Priority-2 science honesty matrix for COL/GBIF/PBDB/Neotoma/NASA/ICS (+ IUCN gate). */
export function buildScienceHonestyMatrix(input: {
  col: { recordCount: number; verifiedRecordCount: number; dataMode: string };
  gbif: { recordCount: number; verifiedRecordCount: number; dataMode: string };
  pbdb: { recordCount: number; verifiedRecordCount: number; dataMode: string };
  neotoma: { recordCount: number; verifiedRecordCount: number; dataMode: string };
  nasa: { recordCount: number; verifiedRecordCount: number; dataMode: string };
  ics: { recordCount: number; verifiedRecordCount: number; dataMode: string };
  iucn: { blocked: boolean; recordCount: number; verifiedRecordCount: number; dataMode: string | null };
}): { anySourceVerified: false; productionReady: false; rows: ScienceHonestyRow[] } {
  const rows: ScienceHonestyRow[] = (
    [
      ['col', input.col, 'Bounded COL ChecklistBank fetch — sample_fallback only'],
      ['gbif', input.gbif, 'Bounded GBIF species match — sample_fallback only'],
      ['pbdb', input.pbdb, 'Bounded PBDB taxa — sample_fallback only'],
      ['neotoma', input.neotoma, 'Bounded Neotoma sites — sample_fallback only'],
      [
        'nasa',
        input.nasa,
        'NASA historical bytes preserved separately; bounded acquires stay not source_verified',
      ],
      [
        'ics',
        input.ics,
        'ICS label inventory does not unlock 17 temporal maps or clear isMockData',
      ],
    ] as const
  ).map(([source, row, notes]) => {
    assertNeverPromoteSampleFallback(row.dataMode, 'needs_source_verification', row.verifiedRecordCount);
    return {
      source,
      dataMode: row.dataMode,
      verificationStatus: 'needs_source_verification' as const,
      verifiedRecordCount: row.verifiedRecordCount,
      recordCount: row.recordCount,
      approvedForUse: false as const,
      sourceVerifiedRelease: false as const,
      notes,
    };
  });

  rows.push({
    source: 'iucn',
    dataMode: input.iucn.dataMode ?? 'blocked_external',
    verificationStatus: 'blocked_external',
    verifiedRecordCount: input.iucn.verifiedRecordCount,
    recordCount: input.iucn.recordCount,
    approvedForUse: false,
    sourceVerifiedRelease: false,
    notes: input.iucn.blocked
      ? 'IUCN blocked without IUCN_API_TOKEN + rights review (docs/OWNER_IUCN_SETUP.md)'
      : 'IUCN token present but still not source_verified until human rights review',
  });

  return { anySourceVerified: false, productionReady: false, rows };
}

export function classifyUnsupportedClaim(claim: string): VerificationStatus {
  const c = claim.toLowerCase();
  // Honest "0/17 verified" / blocked-map copy is allowed — only fake unlocks are unsupported.
  if (/\b0\s*\/\s*17\b/.test(c) && (c.includes('verified') || c.includes('blocked'))) {
    return 'needs_source_verification';
  }
  if (
    c.includes('earth-complete') ||
    c.includes('all species') ||
    c.includes('global catalog complete') ||
    c.includes('17 maps unlocked') ||
    (c.includes('17/17') && c.includes('unlocked'))
  ) {
    return 'unsupported_claim';
  }
  return 'needs_source_verification';
}
