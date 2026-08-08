/**
 * Validation for ingested records — license, provenance, scientific name.
 */

import { assertRealTaxonName } from '@/services/providers/provenanceAdapters';
import type { IngestedTaxonRecord } from './types';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateIngestedRecord(record: IngestedTaxonRecord): ValidationResult {
  const errors: string[] = [];
  if (!assertRealTaxonName(record.scientificName)) {
    errors.push(`invalid scientificName: ${record.scientificName}`);
  }
  if (!record.provenance.sourceRecordId?.trim()) {
    errors.push('missing sourceRecordId');
  }
  if (!record.provenance.license?.trim()) {
    errors.push('missing license');
  }
  if (!record.provenance.attribution?.trim()) {
    errors.push('missing attribution');
  }
  if (!record.provenance.citation?.trim()) {
    errors.push('missing citation');
  }
  if (!record.provenance.retrievedAt?.trim()) {
    errors.push('missing retrievedAt');
  }
  if (record.provenance.isFixture && record.provenance.isLive) {
    errors.push('honesty: fixture claimed live');
  }
  if (record.provenance.mode === 'fixture' && record.provenance.isLive) {
    errors.push('honesty: mode=fixture with isLive');
  }
  if (record.provenance.mode === 'live' && !record.provenance.isLive) {
    errors.push('honesty: mode=live without isLive');
  }
  return { ok: errors.length === 0, errors };
}

export function filterValidRecords(records: IngestedTaxonRecord[]): {
  valid: IngestedTaxonRecord[];
  rejected: Array<{ record: IngestedTaxonRecord; errors: string[] }>;
} {
  const valid: IngestedTaxonRecord[] = [];
  const rejected: Array<{ record: IngestedTaxonRecord; errors: string[] }> = [];
  for (const record of records) {
    const v = validateIngestedRecord(record);
    if (v.ok) valid.push(record);
    else rejected.push({ record, errors: v.errors });
  }
  return { valid, rejected };
}
