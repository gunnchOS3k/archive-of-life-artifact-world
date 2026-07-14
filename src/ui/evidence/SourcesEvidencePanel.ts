import { federationService } from '@/services/providers/FederationService';
import type { FederatedRecord, ProviderConflict } from '@/services/providers/types';

export async function renderSourcesEvidencePanel(
  container: HTMLElement,
  speciesId: string,
  scientificName?: string,
): Promise<void> {
  container.innerHTML = '<p class="evidence-loading">Loading sources and evidence…</p>';
  const records = await federationService.getSpeciesEvidence(speciesId, scientificName);
  const conflicts = federationService.detectNameConflicts(records);
  if (!records.length) {
    container.innerHTML =
      '<p class="evidence-empty">No federated records yet. Pipeline snapshots or live adapters may be blocked.</p>';
    return;
  }
  const conflictHtml = conflicts.length
    ? `<aside class="evidence-conflicts"><strong>Conflicting evidence</strong><p>Providers disagree on names. Both values are kept — the game does not force a single “truth.”</p>${conflicts
        .map(
          (c) =>
            `<div class="conflict-item"><em>${c.field}</em>: ${c.assertions
              .map((a) => `${a.providerId}=${String(a.value)}`)
              .join(' · ')}</div>`,
        )
        .join('')}</aside>`
    : '';
  container.innerHTML =
    conflictHtml +
    records.map((r) => evidenceCard(r)).join('') +
    '<p class="evidence-learner-note">Live cards come from public scientific services today. Fixture or blocked cards are sample or unavailable data — not current live records.</p>';
}

function evidenceCard(record: FederatedRecord): string {
  const statusLabel =
    record.cacheStatus === 'live'
      ? 'Live service'
      : record.cacheStatus === 'fixture'
        ? 'Fixture sample (not live)'
        : record.cacheStatus === 'cached'
          ? 'Cached'
          : 'Unavailable';
  const interpretation =
    record.interpretation === 'reconstructed'
      ? '<p class="evidence-reconstruction">Reconstruction — not a verified exact modern distribution.</p>'
      : record.interpretation === 'inferred'
        ? '<p class="evidence-reconstruction">Inferred context — not a direct species observation.</p>'
        : record.interpretation === 'artistic'
          ? '<p class="evidence-reconstruction">Artistic presentation — labeled separately from evidence.</p>'
          : '';
  const link = record.sourceUrl
    ? `<p><a href="${record.sourceUrl}" target="_blank" rel="noopener noreferrer">Open source record</a></p>`
    : '';
  const coords =
    record.latitude != null && record.longitude != null
      ? `${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}`
      : 'Not available';
  return `<article class="evidence-card" data-provider="${record.providerId}" data-cache="${record.cacheStatus}">
    <header><strong>${record.providerId.toUpperCase()}</strong> · ${statusLabel}</header>
    <p>${record.attribution}</p>
    <dl>
      <dt>Record ID</dt><dd>${record.sourceRecordId}</dd>
      <dt>Scientific name</dt><dd>${record.scientificName ?? '—'}</dd>
      <dt>Accepted name</dt><dd>${record.acceptedName ?? '—'}</dd>
      <dt>Rank</dt><dd>${record.taxonomicRank ?? '—'}</dd>
      <dt>Date</dt><dd>${record.eventDate ?? '—'}</dd>
      <dt>Coordinates</dt><dd>${coords}</dd>
      <dt>Geo precision</dt><dd>${record.geographicPrecision ?? '—'}</dd>
      <dt>Time precision</dt><dd>${record.temporalPrecision ?? '—'}</dd>
      <dt>Retrieved</dt><dd>${record.retrievedAt}</dd>
      <dt>License</dt><dd>${record.license}</dd>
      <dt>Quality</dt><dd>${record.qualityFlag ?? record.confidence}</dd>
      <dt>Classification</dt><dd>${record.interpretation}</dd>
    </dl>
    ${link}
    ${interpretation}
  </article>`;
}

export type { ProviderConflict };
