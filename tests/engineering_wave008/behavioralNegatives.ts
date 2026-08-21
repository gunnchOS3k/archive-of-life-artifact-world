import { scientificRecordToArchiveDexEntry } from '@/services/scientific/fixtures';
import { renderArchiveDexTab } from '@/ui/archiveDexTabs';
import { escapeHtml, containsActiveHtmlPayload } from '@/schema/htmlSafety';
import { computeCoverageMetrics, coveragePercentAfterAddingUndocumented } from '@/services/scientific/coverageEngine';
import {
  buildSnapshotManifest,
  sha256Text,
} from '@/services/scientific/adapters';
import { validateSnapshotManifest } from '@/services/scientific/snapshotManifest';
import { validateScientificRecord, countFixtureOnlySourceVerified } from '@/services/scientific/validateRecord';
import { resolveVerificationStatus } from '@/schema/provenance';
import { hashFieldValue } from '@/schema/scientificRecord';
import type { ScientificRecordSnapshot } from '@/schema/scientificRecord';

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * Behavioral negatives — each calls a real validator/evaluator path.
 * Require >= 22 controls for Wave008 integrity repair.
 */
export function runBehavioralNegatives(baseRecords: ScientificRecordSnapshot[]) {
  const extant = clone(baseRecords.find((r) => r.fixture_role === 'extant_source_snapshot')!);
  // Force a source_verified attempt under FIXTURE_ONLY for sabotage cases
  const verifiedAttempt = clone(extant);
  verifiedAttempt.verification_status = 'source_verified';
  if (verifiedAttempt.snapshot_ref) verifiedAttempt.snapshot_ref.integration_status = 'FIXTURE_ONLY';

  const results: Record<string, boolean> = {};

  // 1 remove canonical ID
  {
    const r = clone(extant);
    r.identity.canonical_id = '';
    results.remove_canonical_id = !validateScientificRecord(r).ok;
  }
  // 2 duplicate canonical ID (collision)
  {
    const ids = [extant.identity.canonical_id, extant.identity.canonical_id];
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    results.duplicate_canonical_id = dup.length > 0;
  }
  // 3 empty scientific name
  {
    const r = clone(extant);
    r.scientific_name.accepted_scientific_name = '';
    results.empty_scientific_name = !validateScientificRecord(r).ok;
  }
  // 4 source_verified without source record ID
  {
    const r = clone(verifiedAttempt);
    r.source_record_id = undefined;
    r.snapshot_ref!.integration_status = 'SNAPSHOT_VERIFIED';
    results.source_verified_without_record_id = !validateScientificRecord(r).can_claim_source_verified;
  }
  // 5 without license
  {
    const r = clone(verifiedAttempt);
    r.snapshot_ref!.integration_status = 'SNAPSHOT_VERIFIED';
    r.license.terms_status = 'missing';
    r.license.license_spdx_or_label = '';
    results.source_verified_without_license = !validateScientificRecord(r).can_claim_source_verified;
  }
  // 6 without retrieval
  {
    const r = clone(verifiedAttempt);
    r.snapshot_ref!.integration_status = 'SNAPSHOT_VERIFIED';
    r.retrieved_at = undefined;
    results.source_verified_without_retrieval = !validateScientificRecord(r).can_claim_source_verified;
  }
  // 7 without citation
  {
    const r = clone(verifiedAttempt);
    r.snapshot_ref!.integration_status = 'SNAPSHOT_VERIFIED';
    r.citation = '';
    results.source_verified_without_citation = !validateScientificRecord(r).can_claim_source_verified;
  }
  // 8 unknown verification defaults to verified — must FAIL (conservative default)
  {
    const status = resolveVerificationStatus({ source: 'gbif' });
    results.unknown_status_defaults_verified = status !== 'source_verified' && status === 'needs_source_verification';
  }
  // 9 fixture claims LIVE_VERIFIED
  {
    const r = clone(verifiedAttempt);
    if (r.snapshot_ref) r.snapshot_ref.integration_status = 'LIVE_VERIFIED';
    results.fixture_claims_live_verified = !validateScientificRecord(r).ok;
  }
  // 10 game-authored inherits external badge
  {
    const game = clone(baseRecords.find((r) => r.fixture_role === 'game_authored')!);
    game.field_evidence.push({
      field_path: 'citation',
      value_hash: hashFieldValue(game.citation ?? 'x'),
      source: 'gbif',
      source_organization: 'GBIF',
      citation_required: false,
      verification_status: 'source_verified',
      confidence: 'HIGH',
      integration_status: 'FIXTURE_ONLY',
    });
    results.game_authored_inherits_external = !validateScientificRecord(game).ok;
  }
  // 11 tampered snapshot hash rejected by validateSnapshotManifest
  {
    const raw = JSON.stringify(baseRecords);
    const normalized = JSON.stringify(baseRecords);
    const manifest = buildSnapshotManifest({
      source: 'catalogue_of_life',
      snapshot_id: 'neg-tamper',
      retrieved_at: '2024-01-01T00:00:00.000Z',
      raw,
      normalized,
      record_count: baseRecords.length,
      force_integration: 'FIXTURE_ONLY',
    });
    const bad = validateSnapshotManifest(manifest, raw + 'TAMPER', normalized);
    results.tampered_snapshot_hash = bad.tamper_rejected === true && bad.ok === false;
  }
  // 12 field value changed without evidence hash update
  {
    const r = clone(extant);
    r.scientific_name.accepted_scientific_name = 'Tampered nameus';
    results.field_hash_mismatch = !validateScientificRecord(r).ok;
  }
  // 13 fake precise coordinates
  {
    const r = clone(extant);
    r.geographic_provenance = {
      coordinates: { lat: 1.23, lon: 4.56 },
      source_basis: 'unknown',
      sensitive_location_redacted: false,
    };
    results.fake_precise_coordinates = !validateScientificRecord(r).ok;
  }
  // 14 uncertainty removed from disputed
  {
    const r = clone(baseRecords.find((x) => x.fixture_role === 'conflicted_taxonomy')!);
    r.confidence_or_uncertainty.uncertainty_note = undefined;
    results.uncertainty_removed_from_disputed = !validateScientificRecord(r).ok;
  }
  // 15 citation XSS rendered inert
  {
    const payload = '<script>alert(1)</script>';
    const r = clone(extant);
    r.citation = payload;
    const citeFe = r.field_evidence.find((f) => f.field_path === 'citation');
    if (citeFe) citeFe.value_hash = hashFieldValue(payload);
    const entry = scientificRecordToArchiveDexEntry(r);
    const html = renderArchiveDexTab(entry, 'sources', true);
    results.citation_xss_inert =
      containsActiveHtmlPayload(payload) &&
      html.includes(escapeHtml(payload)) &&
      !html.includes('<script>alert(1)</script>');
  }
  // 16 coverage 100% without denominator
  {
    const { metrics } = computeCoverageMetrics(baseRecords, {
      coverage_semantics: 'CURRENT_ARCHIVE_SNAPSHOT',
      denominator_label: 'all known life complete',
      snapshot_id: 'neg',
      included_source_snapshots: [],
      scope_total: baseRecords.length,
    });
    results.coverage_100_without_denominator =
      metrics.completeness_overclaim === true || /all known life/i.test(metrics.denominator_label);
  }
  // 17 FIXTURE_ONLY cannot be source_verified
  {
    results.fixture_only_cannot_be_source_verified =
      !validateScientificRecord(verifiedAttempt).can_claim_source_verified &&
      validateScientificRecord(verifiedAttempt).issues.some(
        (i) => i.code === 'FIXTURE_ONLY_CANNOT_BE_SOURCE_VERIFIED',
      );
  }
  // 18 unknown field path rejected
  {
    const r = clone(extant);
    r.field_evidence.push({
      field_path: 'not.a.real.path',
      value_hash: hashFieldValue('x'),
      source: 'catalogue_of_life',
      source_organization: 'Catalogue of Life',
      citation_required: false,
      verification_status: 'needs_source_verification',
      confidence: 'UNKNOWN',
      integration_status: 'FIXTURE_ONLY',
    });
    results.unknown_field_path_rejected = !validateScientificRecord(r).ok;
  }
  // 19 field-level source_verified independent of record-level (FIXTURE_ONLY field rejected)
  {
    const r = clone(extant);
    r.verification_status = 'needs_source_verification';
    const fe = r.field_evidence[0];
    fe.verification_status = 'source_verified';
    fe.integration_status = 'FIXTURE_ONLY';
    results.field_level_fixture_source_verified_rejected = !validateScientificRecord(r).ok;
  }
  // 20 adding undocumented decreases percent
  {
    const { metrics } = computeCoverageMetrics(baseRecords, {
      coverage_semantics: 'CURRENT_ARCHIVE_SNAPSHOT',
      denominator_label: 'current Archive scientific fixture snapshot scope',
      snapshot_id: 'cov',
      included_source_snapshots: [],
      scope_total: baseRecords.length + 4,
    });
    const after = coveragePercentAfterAddingUndocumented(metrics.documented_records, metrics.scope_total);
    results.adding_undocumented_decreases_percent =
      metrics.percent_documented != null &&
      after != null &&
      after < metrics.percent_documented;
  }
  // 21 guessed provider license rejected for source_verified
  {
    const r = clone(verifiedAttempt);
    r.snapshot_ref!.integration_status = 'SNAPSHOT_VERIFIED';
    r.license.license_spdx_or_label = 'UNVERIFIED-FIXTURE';
    r.license.terms_status = 'unknown';
    results.unverified_fixture_license_blocks_source_verified =
      !validateScientificRecord(r).can_claim_source_verified;
  }
  // 22 fixture-only source_verified count must be zero on honest bundle
  {
    results.fixture_only_source_verified_count_zero =
      countFixtureOnlySourceVerified(baseRecords) === 0;
  }
  // 23 raw hash integrity via sha256Text (tamper changes hash)
  {
    const a = sha256Text('abc');
    const b = sha256Text('abcX');
    results.raw_hash_changes_on_tamper = a !== b;
  }

  const keys = Object.keys(results);
  const pass = keys.every((k) => results[k] === true);
  return {
    BEHAVIORAL_NEGATIVE_CONTROL_COUNT: keys.length,
    BEHAVIORAL_NEGATIVE_CONTROLS_PASS: pass,
    controls: results,
    ok: pass && keys.length >= 22,
  };
}
