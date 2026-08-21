/**
 * Wave008 — canonical ScientificRecord contract (GAME-AOL-001..015).
 * Field-level provenance, coverage scope, and editorial lifecycle.
 */
import type { SourceName, VerificationStatus } from './provenance';

export type IntegrationStatus =
  | 'LIVE_VERIFIED'
  | 'SNAPSHOT_VERIFIED'
  | 'FIXTURE_ONLY'
  | 'CONTRACT_ONLY'
  | 'BLOCKED_EXTERNAL'
  | 'NOT_IMPLEMENTED';

export type EvidenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'DISPUTED' | 'UNKNOWN';

export type EditorialStatus =
  | 'INGESTED'
  | 'VALIDATED'
  | 'CURATED'
  | 'REVIEW_NEEDED'
  | 'CONFLICTED'
  | 'BLOCKED_EXTERNAL'
  | 'GAME_AUTHORED'
  | 'MOCK_SAMPLE'
  | 'RETIRED';

export type CoverageSemantics =
  | 'CURRENT_ARCHIVE_SNAPSHOT'
  | 'CURRENT_SOURCE_SNAPSHOT'
  | 'CURATED_GAME_SCOPE'
  | 'REGION_TIME_GROUP_SCOPE';

export type ScientificTimeKind =
  | 'extant_current'
  | 'historical_observation'
  | 'fossil_geologic_interval'
  | 'first_last_appearance'
  | 'unknown';

export type LicenseTermsStatus =
  | 'documented'
  | 'open_license'
  | 'restricted_terms'
  | 'game_original'
  | 'mock_sample'
  | 'unknown'
  | 'missing';

export interface LicenseTerms {
  license_spdx_or_label: string;
  license_url?: string;
  attribution_required: boolean;
  redistribution_allowed: boolean;
  derivative_use_note?: string;
  terms_status: LicenseTermsStatus;
}

export interface SourceRegistryEntry {
  source_id: SourceName;
  organization_name: string;
  homepage?: string;
  integration_status: IntegrationStatus;
  terms_or_license_notes: string;
  citation_policy: string;
}

export interface SourceSnapshotRef {
  source: SourceName;
  upstream_version?: string;
  snapshot_id: string;
  retrieved_at: string;
  raw_manifest_hash: string;
  transform_version: string;
  normalized_hash?: string;
  organization_name?: string;
  license?: LicenseTerms;
  record_count?: number;
  integration_status: IntegrationStatus;
  generator_commit?: string;
}

export interface ScientificGeography {
  locality_text?: string;
  country_codes?: string[];
  region?: string;
  coordinates?: { lat: number; lon: number };
  coordinate_uncertainty_m?: number;
  geometry_ref?: string;
  source_basis: 'occurrence' | 'range' | 'fossil_locality' | 'unknown' | 'redacted';
  sensitive_location_redacted: boolean;
}

export interface ScientificTimeRange {
  kind: ScientificTimeKind;
  start?: number | string | null;
  end?: number | string | null;
  units?: 'Ma' | 'ka' | 'year' | 'ISO8601' | 'geologic_label';
  geologic_units?: string[];
  approximate: boolean;
  uncertainty?: string;
  source_basis: string;
}

export interface ScientificNameRecord {
  accepted_scientific_name: string;
  normalized_name?: string;
  authorship_free_form?: string;
  synonyms?: string[];
  rank?: string;
  nomenclatural_status?: string;
  open_nomenclature?: 'cf' | 'aff' | 'sp' | 'indet' | null;
}

export interface TaxonomicAuthority {
  authority_text?: string;
  authority_year?: number | null;
  authority_source?: string;
}

export interface ScientificFieldEvidence {
  field_path: string;
  value_hash: string;
  source: SourceName;
  source_organization: string;
  source_record_id?: string;
  source_version?: string;
  license?: LicenseTerms;
  retrieved_at?: string;
  citation?: string;
  citation_required: boolean;
  verification_status: VerificationStatus;
  confidence: EvidenceConfidence;
  uncertainty_note?: string;
  geography?: ScientificGeography;
  time_range?: ScientificTimeRange;
  derived_from?: string[];
  integration_status: IntegrationStatus;
}

export interface ScientificRecordIdentity {
  canonical_id: string;
  aliases?: string[];
  source_native_ids?: Partial<Record<SourceName, string>>;
}

export interface ScientificRecordEditorialState {
  editorial_status: EditorialStatus;
  notes?: string;
  conflicting_sources?: string[];
}

export interface ScientificRecordSnapshot {
  identity: ScientificRecordIdentity;
  scientific_name: ScientificNameRecord;
  taxonomic_authority: TaxonomicAuthority;
  source_organization: string;
  source_organization_id: SourceName;
  source_record_id?: string;
  license: LicenseTerms;
  retrieved_at?: string;
  source_version?: string;
  snapshot_ref?: SourceSnapshotRef;
  geographic_provenance?: ScientificGeography;
  time_range?: ScientificTimeRange;
  confidence_or_uncertainty: {
    confidence: EvidenceConfidence;
    confidence_basis?: string;
    uncertainty_note?: string;
    conflicting_sources?: string[];
  };
  editorial: ScientificRecordEditorialState;
  citation?: string;
  verification_status: VerificationStatus;
  field_evidence: ScientificFieldEvidence[];
  life_status?: 'extant' | 'extinct' | 'fossil' | 'unknown';
  common_name?: string;
  fixture_role?:
    | 'extant_source_snapshot'
    | 'fossil_uncertain'
    | 'conflicted_taxonomy'
    | 'game_authored'
    | 'mock_sample'
    | 'blocked_incomplete';
}

export interface ArchiveCoverageSnapshot {
  snapshot_id: string;
  generated_at: string;
  included_source_snapshots: string[];
  documented_record_count: number;
  source_record_count: number;
  scope_filters: Record<string, string | boolean | number | null>;
  coverage_semantics: CoverageSemantics;
  known_limitations: string[];
  denominator_label: string;
  completeness_claim_forbidden: true;
  user_facing_summary: string;
}

export function hashFieldValue(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv1a:${(h >>> 0).toString(16)}`;
}

export function makeCanonicalId(stableKey: string): string {
  const cleaned = stableKey
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `aol:taxon:${cleaned}`;
}
