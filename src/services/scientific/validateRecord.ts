import type { ScientificRecordSnapshot, ScientificFieldEvidence } from '@/schema/scientificRecord';
import { hashFieldValue } from '@/schema/scientificRecord';

export interface ValidationIssue {
  code: string;
  message: string;
  field_path?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  can_claim_source_verified: boolean;
}

const PLACEHOLDER_IDS = new Set(['', 'unknown', 'n/a', 'na', 'null', 'undefined', '0', 'TODO', 'tbd']);

export function isPlaceholderSourceId(id: unknown): boolean {
  if (id == null) return true;
  const s = String(id).trim();
  return PLACEHOLDER_IDS.has(s.toLowerCase()) || /^x+$/i.test(s);
}

export function validateFieldEvidenceHashes(record: ScientificRecordSnapshot): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const fe of record.field_evidence) {
    const live = liveValueForField(record, fe.field_path);
    if (live === undefined) continue;
    const expected = hashFieldValue(live);
    if (fe.value_hash !== expected) {
      issues.push({
        code: 'FIELD_HASH_MISMATCH',
        message: `Field ${fe.field_path} value changed without evidence hash update`,
        field_path: fe.field_path,
      });
    }
  }
  return issues;
}

function liveValueForField(record: ScientificRecordSnapshot, path: string): unknown {
  switch (path) {
    case 'scientific_name':
      return record.scientific_name.accepted_scientific_name;
    case 'taxonomic_authority':
      return record.taxonomic_authority.authority_text;
    case 'source_record_id':
      return record.source_record_id;
    case 'license':
      return record.license.license_spdx_or_label;
    case 'citation':
      return record.citation;
    case 'geographic_provenance':
      return record.geographic_provenance;
    case 'time_range':
      return record.time_range;
    default:
      return undefined;
  }
}

export function validateScientificRecord(record: ScientificRecordSnapshot): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!record.identity?.canonical_id?.startsWith('aol:taxon:')) {
    issues.push({ code: 'MISSING_CANONICAL_ID', message: 'canonical_id required (aol:taxon:*)' });
  }
  if (!record.scientific_name?.accepted_scientific_name?.trim()) {
    issues.push({ code: 'EMPTY_SCIENTIFIC_NAME', message: 'scientific name required for identified taxon' });
  }
  if (!record.source_organization?.trim()) {
    issues.push({ code: 'MISSING_SOURCE_ORG', message: 'source organization required' });
  }

  const wantsVerified = record.verification_status === 'source_verified';
  if (wantsVerified) {
    if (isPlaceholderSourceId(record.source_record_id)) {
      issues.push({ code: 'SOURCE_VERIFIED_WITHOUT_RECORD_ID', message: 'source_verified requires source_record_id' });
    }
    if (!record.license?.license_spdx_or_label || record.license.terms_status === 'missing') {
      issues.push({ code: 'SOURCE_VERIFIED_WITHOUT_LICENSE', message: 'source_verified requires license/terms' });
    }
    if (!record.retrieved_at) {
      issues.push({ code: 'SOURCE_VERIFIED_WITHOUT_RETRIEVAL', message: 'source_verified requires retrieved_at' });
    }
    if (!record.citation?.trim()) {
      issues.push({ code: 'SOURCE_VERIFIED_WITHOUT_CITATION', message: 'source_verified requires citation' });
    }
    if (!record.snapshot_ref?.snapshot_id) {
      issues.push({ code: 'SOURCE_VERIFIED_WITHOUT_SNAPSHOT', message: 'source_verified requires snapshot_ref' });
    }
    if (record.snapshot_ref?.integration_status === 'LIVE_VERIFIED' && record.fixture_role) {
      issues.push({
        code: 'FIXTURE_CLAIMS_LIVE',
        message: 'fixture adapter cannot claim LIVE_VERIFIED',
      });
    }
  }

  if (record.retrieved_at) {
    const t = Date.parse(record.retrieved_at);
    if (Number.isNaN(t)) {
      issues.push({ code: 'INVALID_RETRIEVAL_DATE', message: 'retrieved_at must be parseable UTC' });
    } else if (t > Date.now() + 60_000 && record.fixture_role !== 'mock_sample') {
      // allow explicit mock fixtures only for simulated future dates
      issues.push({ code: 'FUTURE_RETRIEVAL_DATE', message: 'future retrieval date rejected' });
    }
  }

  if (
    record.geographic_provenance?.coordinates &&
    record.geographic_provenance.source_basis === 'unknown' &&
    !record.geographic_provenance.sensitive_location_redacted
  ) {
    issues.push({
      code: 'FAKE_PRECISE_COORDINATES',
      message: 'precise coordinates require source_basis other than unknown',
    });
  }

  if (
    record.confidence_or_uncertainty.confidence === 'DISPUTED' &&
    !record.confidence_or_uncertainty.uncertainty_note
  ) {
    issues.push({ code: 'DISPUTED_WITHOUT_UNCERTAINTY', message: 'disputed records require uncertainty_note' });
  }

  if (record.editorial.editorial_status === 'MOCK_SAMPLE' && record.verification_status === 'source_verified') {
    issues.push({ code: 'MOCK_CANNOT_BE_SOURCE_VERIFIED', message: 'mock sample cannot be source_verified' });
  }

  if (
    record.editorial.editorial_status === 'GAME_AUTHORED' &&
    record.field_evidence.some(
      (f) =>
        f.verification_status === 'source_verified' &&
        f.source !== 'game_authored' &&
        !f.derived_from?.length,
    )
  ) {
    issues.push({
      code: 'GAME_AUTHORED_INHERITS_EXTERNAL',
      message: 'game-authored record must not inherit external source-verified badges',
    });
  }

  issues.push(...validateFieldEvidenceHashes(record));

  const blocking = issues.filter((i) =>
    [
      'MISSING_CANONICAL_ID',
      'EMPTY_SCIENTIFIC_NAME',
      'SOURCE_VERIFIED_WITHOUT_RECORD_ID',
      'SOURCE_VERIFIED_WITHOUT_LICENSE',
      'SOURCE_VERIFIED_WITHOUT_RETRIEVAL',
      'SOURCE_VERIFIED_WITHOUT_CITATION',
      'SOURCE_VERIFIED_WITHOUT_SNAPSHOT',
      'FIXTURE_CLAIMS_LIVE',
      'FIELD_HASH_MISMATCH',
      'FAKE_PRECISE_COORDINATES',
      'MOCK_CANNOT_BE_SOURCE_VERIFIED',
      'GAME_AUTHORED_INHERITS_EXTERNAL',
      'FUTURE_RETRIEVAL_DATE',
      'DISPUTED_WITHOUT_UNCERTAINTY',
    ].includes(i.code),
  );

  return {
    ok: blocking.length === 0,
    issues,
    can_claim_source_verified: wantsVerified && blocking.length === 0,
  };
}

export function assertEvidenceHashForValue(fe: ScientificFieldEvidence, value: unknown): boolean {
  return fe.value_hash === hashFieldValue(value);
}
