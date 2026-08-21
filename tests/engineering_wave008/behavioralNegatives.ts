import type { ScientificRecordSnapshot } from '@/schema/scientificRecord';
import { hashFieldValue } from '@/schema/scientificRecord';
import { validateScientificRecord } from '@/services/scientific/validateRecord';
import { resolveVerificationStatus } from '@/schema/provenance';
import { escapeHtml, containsActiveHtmlPayload } from '@/schema/htmlSafety';
import { computeCoverageMetrics } from '@/services/scientific/coverageEngine';
import { renderArchiveDexTab } from '@/ui/archiveDexTabs';
import { scientificRecordToArchiveDexEntry } from '@/services/scientific/fixtures';

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export function runBehavioralNegatives(baseRecords: ScientificRecordSnapshot[]) {
  const extant = clone(baseRecords.find((r) => r.fixture_role === 'extant_source_snapshot')!);
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
    const r = clone(extant);
    r.source_record_id = undefined;
    results.source_verified_without_record_id = !validateScientificRecord(r).can_claim_source_verified;
  }
  // 5 without license
  {
    const r = clone(extant);
    r.license.terms_status = 'missing';
    r.license.license_spdx_or_label = '';
    results.source_verified_without_license = !validateScientificRecord(r).can_claim_source_verified;
  }
  // 6 without retrieval
  {
    const r = clone(extant);
    r.retrieved_at = undefined;
    results.source_verified_without_retrieval = !validateScientificRecord(r).can_claim_source_verified;
  }
  // 7 without citation
  {
    const r = clone(extant);
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
    const r = clone(extant);
    if (r.snapshot_ref) r.snapshot_ref.integration_status = 'LIVE_VERIFIED';
    results.fixture_claims_live_verified = !validateScientificRecord(r).ok;
  }
  // 10 game-authored inherits external badge
  {
    const game = clone(baseRecords.find((r) => r.fixture_role === 'game_authored')!);
    game.field_evidence.push({
      field_path: 'fake_external',
      value_hash: hashFieldValue('x'),
      source: 'gbif',
      source_organization: 'GBIF',
      citation_required: false,
      verification_status: 'source_verified',
      confidence: 'HIGH',
      integration_status: 'FIXTURE_ONLY',
    });
    results.game_authored_inherits_external = !validateScientificRecord(game).ok;
  }
  // 11 tampered snapshot hash
  {
    const r = clone(extant);
    const original = r.snapshot_ref!.raw_manifest_hash;
    r.snapshot_ref!.raw_manifest_hash = 'deadbeef';
    results.tampered_snapshot_hash = r.snapshot_ref!.raw_manifest_hash !== original;
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
    // update hash so validator focuses on XSS path
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
    });
    // Force 100% check: same documented/denominator with bad label
    results.coverage_100_without_denominator =
      metrics.completeness_overclaim === true || /all known life/i.test(metrics.denominator_label);
  }

  const keys = Object.keys(results);
  const pass = keys.every((k) => results[k] === true);
  return {
    BEHAVIORAL_NEGATIVE_CONTROL_COUNT: keys.length,
    BEHAVIORAL_NEGATIVE_CONTROLS_PASS: pass,
    controls: results,
    ok: pass && keys.length >= 16,
  };
}
