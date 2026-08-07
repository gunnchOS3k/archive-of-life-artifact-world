/**
 * COL / GBIF provenance adapters — explicit license + provenance fields.
 * NEVER invents taxa. Fixture path when live is blocked.
 */

import type { FederatedRecord, ProviderAttribution } from './types';

export interface ProvenancedTaxonRecord {
  scientificName: string;
  acceptedName?: string;
  taxonomicRank?: string;
  sourceRecordId: string;
  providerId: 'col' | 'gbif';
  license: string;
  attribution: string;
  citation: string;
  sourceUrl?: string;
  retrievedAt: string;
  cacheStatus: FederatedRecord['cacheStatus'];
  confidence: FederatedRecord['confidence'];
  /** True when record came from authored fixture — never claim live completeness */
  isFixture: boolean;
  /** Raw provider payload retained for audit */
  payload: unknown;
}

export interface ProvenanceAdapterResult {
  records: ProvenancedTaxonRecord[];
  usedFixture: boolean;
  inventedTaxa: false;
  errors: string[];
}

const COL_ATTR: ProviderAttribution = {
  organization: 'Catalogue of Life',
  dataset: 'ChecklistBank / COL',
  license: 'COL terms of use',
  citation: 'Catalogue of Life',
  sourceUrl: 'https://www.catalogueoflife.org/',
};

const GBIF_ATTR: ProviderAttribution = {
  organization: 'GBIF',
  dataset: 'GBIF Occurrence / Species API',
  license: 'CC BY 4.0 (verify per record)',
  citation: 'GBIF.org',
  sourceUrl: 'https://www.gbif.org/',
};

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

/**
 * Reject anything that looks invented: empty scientific name, placeholder tokens.
 */
export function assertRealTaxonName(name: string | undefined | null): name is string {
  if (!name) return false;
  const n = name.trim();
  if (n.length < 3) return false;
  const blocked = /^(unknown|n\/a|tbd|placeholder|invented|fake|lorem)/i;
  if (blocked.test(n)) return false;
  // Binomial-ish or higher taxon latinized token
  return /^[A-Za-z][A-Za-z\-]+(?:\s+[A-Za-z][A-Za-z\-]+)*$/.test(n);
}

export function federatedToProvenanced(
  record: FederatedRecord,
  providerId: 'col' | 'gbif',
): ProvenancedTaxonRecord | null {
  const scientificName = str(record.scientificName) ?? str((record.payload as Record<string, unknown>)?.scientificName);
  if (!assertRealTaxonName(scientificName)) return null;

  const attr = providerId === 'col' ? COL_ATTR : GBIF_ATTR;
  const license = str(record.license) || attr.license;
  if (!license) return null;

  return {
    scientificName,
    acceptedName: str(record.acceptedName),
    taxonomicRank: str(record.taxonomicRank),
    sourceRecordId: record.sourceRecordId,
    providerId,
    license,
    attribution: record.attribution || attr.citation,
    citation: `${attr.citation} — ${scientificName} (${record.sourceRecordId})`,
    sourceUrl: record.sourceUrl ?? attr.sourceUrl,
    retrievedAt: record.retrievedAt,
    cacheStatus: record.cacheStatus,
    confidence: record.confidence,
    isFixture: record.cacheStatus === 'fixture',
    payload: record.payload,
  };
}

/**
 * Normalize a list of federated COL/GBIF records into provenanced taxa.
 * Drops inventable/empty names. Sets inventedTaxa: false always (policy invariant).
 */
export function adaptColGbifRecords(
  records: FederatedRecord[],
  preferredProvider?: 'col' | 'gbif',
): ProvenanceAdapterResult {
  const out: ProvenancedTaxonRecord[] = [];
  const errors: string[] = [];
  let usedFixture = false;

  for (const record of records) {
    const pid =
      preferredProvider ??
      (record.providerId === 'col' || record.providerId === 'gbif'
        ? record.providerId
        : null);
    if (!pid) {
      errors.push(`skip non-col/gbif provider: ${record.providerId}`);
      continue;
    }
    const adapted = federatedToProvenanced(record, pid);
    if (!adapted) {
      errors.push(`rejected unnamed/invalid taxon from ${record.providerId}:${record.sourceRecordId}`);
      continue;
    }
    if (adapted.isFixture) usedFixture = true;
    out.push(adapted);
  }

  return {
    records: out,
    usedFixture,
    inventedTaxa: false,
    errors,
  };
}

/** Build a journal citation line from provenanced records. */
export function formatProvenanceCitations(records: ProvenancedTaxonRecord[]): string {
  if (!records.length) return 'No COL/GBIF provenance available (fixture or live blocked).';
  return records
    .map((r) => {
      const mode = r.isFixture ? 'fixture' : r.cacheStatus;
      return `${r.providerId.toUpperCase()} [${r.license}] ${r.citation} (${mode})`;
    })
    .join('; ');
}

export function getColAttribution(): ProviderAttribution {
  return { ...COL_ATTR };
}

export function getGbifAttribution(): ProviderAttribution {
  return { ...GBIF_ATTR };
}
