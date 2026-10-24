/**
 * SYNTHETIC fixture only. Not an observation, not a coverage claim.
 * Placeholder source ids must not pass a source_verified claim.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPlaceholderSourceId,
  validateScientificRecord,
} from '../../src/services/scientific/validateRecord.ts';

function syntheticSourceVerifiedRecord(sourceRecordId) {
  return {
    identity: { canonical_id: 'aol:taxon:synthetic-placeholder-probe' },
    scientific_name: { accepted_scientific_name: 'Syntheticus probei' },
    taxonomic_authority: {},
    source_organization: 'Synthetic fixture organization',
    source_organization_id: 'gbif',
    source_record_id: sourceRecordId,
    license: {
      license_spdx_or_label: 'CC-BY-4.0',
      attribution_required: true,
      redistribution_allowed: true,
      terms_status: 'open_license',
      derivative_use_note: 'SYNTHETIC fixture license label for the regression only',
    },
    retrieved_at: '2020-01-15T00:00:00.000Z',
    snapshot_ref: {
      source: 'gbif',
      snapshot_id: 'synthetic-snapshot-placeholder-probe',
      retrieved_at: '2020-01-15T00:00:00.000Z',
      raw_manifest_hash: 'synthetic-not-a-provider-hash',
      transform_version: 'synthetic-test',
      integration_status: 'SNAPSHOT_VERIFIED',
    },
    confidence_or_uncertainty: {
      confidence: 'LOW',
      uncertainty_note: 'SYNTHETIC fixture; not an observation',
    },
    editorial: {
      editorial_status: 'VALIDATED',
      notes: 'SYNTHETIC fixture for identifier validation only. Not an observation.',
    },
    citation: 'SYNTHETIC fixture citation. Not a real specimen or observation.',
    verification_status: 'source_verified',
    field_evidence: [],
  };
}

test('placeholder source ids are case-insensitive, including TODO', () => {
  assert.equal(isPlaceholderSourceId('TODO'), true);
  assert.equal(isPlaceholderSourceId('todo'), true);
  assert.equal(isPlaceholderSourceId(' Todo '), true);
  assert.equal(isPlaceholderSourceId('n/a'), true);
  assert.equal(isPlaceholderSourceId('XXXX'), true);
  assert.equal(isPlaceholderSourceId('gbif:occurrence:synthetic-1'), false);
});

test('SYNTHETIC source_verified record rejects TODO and accepts a non-placeholder id', () => {
  const rejected = validateScientificRecord(syntheticSourceVerifiedRecord('TODO'));
  assert.equal(rejected.can_claim_source_verified, false);
  assert.equal(rejected.ok, false);
  assert.ok(rejected.issues.some((issue) => issue.code === 'SOURCE_VERIFIED_WITHOUT_RECORD_ID'));

  const kept = validateScientificRecord(
    syntheticSourceVerifiedRecord('gbif:occurrence:synthetic-1'),
  );
  assert.equal(kept.can_claim_source_verified, true);
  assert.equal(kept.ok, true);
});
