import { federationService } from '@/services/providers/FederationService';
import type { FederatedRecord } from '@/services/providers/types';

export async function renderSourcesEvidencePanel(
  container: HTMLElement,
  speciesId: string,
  scientificName?: string,
): Promise<void> {
  container.innerHTML = '<p class="evidence-loading">Loading sources and evidence…</p>';
  const records = await federationService.getSpeciesEvidence(speciesId, scientificName);
  if (!records.length) {
    container.innerHTML =
      '<p class="evidence-empty">No federated records yet. Pipeline snapshots or live adapters may be blocked.</p>';
    return;
  }
  container.innerHTML = records.map((r) => evidenceCard(r)).join('');
}

function evidenceCard(record: FederatedRecord): string {
  const attr = record.attribution;
  const interpretation =
    record.interpretation === 'reconstructed'
      ? '<p class="evidence-reconstruction">Reconstruction — not an exact modern distribution.</p>'
      : '';
  return `<article class="evidence-card" data-provider="${record.providerId}">
    <header><strong>${record.providerId.toUpperCase()}</strong> · ${record.cacheStatus}</header>
    <p>${attr}</p>
    <dl>
      <dt>Record</dt><dd>${record.sourceRecordId}</dd>
      <dt>Retrieved</dt><dd>${record.retrievedAt}</dd>
      <dt>License</dt><dd>${record.license}</dd>
      <dt>Confidence</dt><dd>${record.confidence}</dd>
    </dl>
    ${interpretation}
  </article>`;
}
