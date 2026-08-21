import type { ArchiveDexEntry } from '@/schema/archivedex';
import type { ScientificRecordSnapshot } from '@/schema/scientificRecord';
import { escapeHtml } from '@/schema/htmlSafety';
import { resolveVerificationStatus } from '@/schema/provenance';
import { getSourceOrganization } from '@/schema/sourceRegistry';

function badgeForStatus(status: string, integration?: string): string {
  if (status === 'mock_sample') return '<span class="mock-badge">MOCK SAMPLE</span>';
  if (status === 'game_authored_verified') return '<span class="verified-badge">GAME AUTHORED</span>';
  if (status === 'blocked_external') return '<span class="blocked-badge">BLOCKED / NEEDS VERIFICATION</span>';
  if (status === 'needs_source_verification') return '<span class="blocked-badge">NEEDS SOURCE VERIFICATION</span>';
  if (status === 'derived_inferred') return '<span class="uncertainty-badge">DERIVED / INFERRED</span>';
  if (status === 'source_verified') {
    if (integration === 'LIVE_VERIFIED') return '<span class="verified-badge">LIVE VERIFIED</span>';
    if (integration === 'FIXTURE_ONLY' || integration === 'SNAPSHOT_VERIFIED') {
      return '<span class="verified-badge">SOURCE SNAPSHOT</span>';
    }
    return '<span class="verified-badge">SOURCE SNAPSHOT</span>';
  }
  return `<span class="field-state">${escapeHtml(status)}</span>`;
}

export function renderScientificIdentityBlock(rec: ScientificRecordSnapshot): string {
  const auth = rec.taxonomic_authority.authority_text
    ? `${escapeHtml(rec.taxonomic_authority.authority_text)}${
        rec.taxonomic_authority.authority_year ? `, ${rec.taxonomic_authority.authority_year}` : ''
      }`
    : 'Unknown';
  return `
    <div class="scientific-identity" data-canonical-id="${escapeHtml(rec.identity.canonical_id)}">
      <div class="dex-field"><span class="detail-label">Canonical ID:</span> <code>${escapeHtml(rec.identity.canonical_id)}</code></div>
      <div class="dex-field"><span class="detail-label">Scientific name:</span> <em class="field-verified">${escapeHtml(rec.scientific_name.accepted_scientific_name)}</em></div>
      <div class="dex-field"><span class="detail-label">Taxonomic authority:</span> ${auth}</div>
      <div class="dex-field"><span class="detail-label">Confidence:</span> ${escapeHtml(rec.confidence_or_uncertainty.confidence)}</div>
      <div class="dex-field"><span class="detail-label">Editorial status:</span> ${escapeHtml(rec.editorial.editorial_status)}</div>
    </div>`;
}

export function renderScientificSourcesPanel(entry: ArchiveDexEntry): string {
  const rec = entry.scientificRecord;
  if (rec) {
    const org = getSourceOrganization(rec.source_organization_id);
    const status = rec.verification_status;
    const showExternalBadge =
      status === 'source_verified' &&
      rec.source_organization_id !== 'game_authored' &&
      rec.source_organization_id !== 'mock_sample';
    let citeBlock: string;
    if (rec.fixture_role === 'game_authored') {
      citeBlock = `<div class="citation game-authored">Game-authored — no external source citation badge.</div>`;
    } else if (rec.fixture_role === 'mock_sample') {
      citeBlock = `<div class="citation mock-warning"><span class="mock-badge">MOCK/SAMPLE</span> Not an externally verified source.</div>`;
    } else if (rec.citation?.trim()) {
      const badgeNote = showExternalBadge
        ? ''
        : ' <em>(fixture / needs verification — not source_verified)</em>';
      citeBlock = `<div class="citation" data-citation="1"><button type="button" class="citation-copy" data-copy-citation="1">Copy citation</button> ${escapeHtml(rec.citation)}${badgeNote}</div>`;
    } else {
      citeBlock = `<div class="citation">Citation unavailable / needs verification.</div>`;
    }

    return `
      <div class="scientific-sources" data-fixture-role="${escapeHtml(rec.fixture_role ?? '')}">
        ${badgeForStatus(status, rec.snapshot_ref?.integration_status ?? org.integration_status)}
        <div class="dex-field"><span class="detail-label">Source organization:</span> ${escapeHtml(org.organization_name)}</div>
        <div class="dex-field"><span class="detail-label">Integration status:</span> ${escapeHtml(org.integration_status)}</div>
        <div class="dex-field"><span class="detail-label">Source record ID:</span> ${escapeHtml(rec.source_record_id ?? 'unavailable')}</div>
        <div class="dex-field"><span class="detail-label">License / terms:</span> ${escapeHtml(rec.license.license_spdx_or_label)} (${escapeHtml(rec.license.terms_status)})</div>
        <div class="dex-field"><span class="detail-label">Retrieved at:</span> ${escapeHtml(rec.retrieved_at ?? 'unavailable')}</div>
        <div class="dex-field"><span class="detail-label">Version / snapshot:</span> ${escapeHtml(rec.source_version ?? '')} / ${escapeHtml(rec.snapshot_ref?.snapshot_id ?? 'none')}</div>
        <div class="dex-field"><span class="detail-label">Geography:</span> ${escapeHtml(rec.geographic_provenance?.locality_text ?? rec.geographic_provenance?.region ?? 'unknown')} (${escapeHtml(rec.geographic_provenance?.source_basis ?? 'unknown')})</div>
        <div class="dex-field"><span class="detail-label">Time range:</span> ${escapeHtml(
          rec.time_range?.kind === 'fossil_geologic_interval'
            ? `${rec.time_range.start}–${rec.time_range.end} ${rec.time_range.units ?? ''} (${rec.time_range.uncertainty ?? 'approx'})`
            : rec.time_range?.kind ?? 'unknown',
        )}</div>
        ${citeBlock}
        ${rec.confidence_or_uncertainty.uncertainty_note ? `<p class="uncertainty-note">${escapeHtml(rec.confidence_or_uncertainty.uncertainty_note)}</p>` : ''}
        ${rec.editorial.editorial_status === 'CONFLICTED' ? `<p class="uncertainty-note">Editorial: CONFLICTED — ${escapeHtml(rec.editorial.conflicting_sources?.join(', ') ?? '')}</p>` : ''}
      </div>`;
  }

  const prov = entry.sources
    .map((p) => {
      const status = resolveVerificationStatus(p);
      return `
      <div class="provenance-item ${status === 'mock_sample' ? 'mock' : ''}">
        <strong>${escapeHtml(p.source.replace(/_/g, ' '))}</strong> ${badgeForStatus(status)}
        <div>Version: ${escapeHtml(p.sourceVersion)} | License: ${escapeHtml(p.license)} | Status: ${escapeHtml(status.replace(/_/g, ' '))}</div>
        <div class="citation">${p.citationRequired ? 'Citation required: ' : ''}${escapeHtml(p.citation)}</div>
        <div class="provenance-dates">Retrieved: ${escapeHtml(p.retrievedAt)} | Updated: ${escapeHtml(p.lastUpdated)}</div>
      </div>`;
    })
    .join('');
  return prov || '<p><em>No provenance records — blocked by external source.</em></p>';
}

export function renderCoverageSummary(text: string): string {
  return `<div class="coverage-summary" data-no-completeness-claim="1">${escapeHtml(text)}</div>`;
}
