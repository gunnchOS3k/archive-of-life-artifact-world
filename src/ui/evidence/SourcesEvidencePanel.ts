import { federationService } from '@/services/providers/FederationService';
import type {
  FederatedRecord,
  ProviderConflict,
  SpeciesEvidenceResult,
} from '@/services/providers/types';

export type SourcesEvidencePanelHandle = {
  abort: () => void;
  retry: () => void;
  /** Resolves when the current generation leaves the loading state (success, error, or abort). */
  done: Promise<void>;
};

type RenderOptions = {
  signal?: AbortSignal;
};

const activeControllers = new WeakMap<HTMLElement, AbortController>();

const PROVIDER_LABELS: Record<string, string> = {
  col: 'Catalogue of Life',
  gbif: 'GBIF',
  inat: 'iNaturalist',
  inaturalist: 'iNaturalist',
  pbdb: 'Paleobiology Database',
  paleobiodb: 'Paleobiology Database',
  neotoma: 'Neotoma',
  nasa: 'NASA Earthdata',
  nasa_earthdata: 'NASA Earthdata',
  worms: 'WoRMS',
  iucn: 'IUCN',
};

/**
 * Infinite-loading regression guard: loading markup must always be cleared in finally,
 * even when federation throws or the panel is closed mid-request.
 */
export function renderSourcesEvidencePanel(
  container: HTMLElement,
  speciesId: string,
  scientificName?: string,
  options: RenderOptions = {},
): SourcesEvidencePanelHandle {
  const prior = activeControllers.get(container);
  prior?.abort();
  const controller = new AbortController();
  activeControllers.set(container, controller);

  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  const retry = () => {
    renderSourcesEvidencePanel(container, speciesId, scientificName, options);
  };

  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const handle: SourcesEvidencePanelHandle = {
    abort: () => controller.abort(),
    retry,
    done,
  };

  container.innerHTML =
    '<p class="evidence-loading" data-evidence-state="loading">Looking up sources quietly…</p>';
  container.dataset.evidenceState = 'loading';

  void (async () => {
    let result: SpeciesEvidenceResult | null = null;
    let fatal: string | null = null;
    let aborted = false;

    try {
      const lookup = federationService.getSpeciesEvidenceResult(speciesId, scientificName, {
        signal: controller.signal,
      });
      const raced = await raceAbort(lookup, controller.signal);
      if (raced === 'aborted') {
        aborted = true;
      } else {
        result = raced;
      }
    } catch (err) {
      if (controller.signal.aborted) {
        aborted = true;
      } else {
        fatal = err instanceof Error ? err.message : String(err);
        console.error('[sources-evidence] lookup failed', err);
      }
    } finally {
      try {
        if (aborted || controller.signal.aborted) {
          if (activeControllers.get(container) === controller) {
            container.dataset.evidenceState = 'aborted';
            if (container.querySelector('.evidence-loading')) {
              container.innerHTML = '';
            }
          }
          return;
        }
        if (result) {
          paintResult(container, result, retry);
        } else {
          paintFatal(container, fatal ?? 'Unknown evidence lookup error', retry);
        }
      } finally {
        resolveDone();
      }
    }
  })();

  return handle;
}

function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T | 'aborted'> {
  if (signal.aborted) return Promise.resolve('aborted');
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      resolve('aborted');
    };
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (err) => {
        cleanup();
        reject(err);
      },
    );
  });
}

function paintFatal(container: HTMLElement, message: string, retry: () => void): void {
  container.dataset.evidenceState = 'error';
  container.innerHTML = `
    <div class="evidence-status evidence-status-error" data-evidence-state="error">
      <p><strong>Source lookup failed</strong></p>
      <p>${escapeHtml(message)}</p>
      <p>Retry source lookup to try again with bounded provider timeouts.</p>
      <button type="button" class="btn-secondary evidence-retry-btn">Retry source lookup</button>
    </div>`;
  bindRetry(container, retry);
}

function paintResult(
  container: HTMLElement,
  result: SpeciesEvidenceResult,
  retry: () => void,
): void {
  const status = result.status;
  container.dataset.evidenceState = status;

  const banner = statusBanner(result);
  const conflictHtml = result.conflicts.length
    ? `<aside class="evidence-conflicts"><strong>Conflicting evidence</strong><p>Providers disagree on names. Both values are kept — the game does not force a single “truth.”</p>${result.conflicts
        .map(
          (c) =>
            `<div class="conflict-item"><em>${escapeHtml(c.field)}</em>: ${c.assertions
              .map((a) => `${escapeHtml(a.providerId)}=${escapeHtml(String(a.value))}`)
              .join(' · ')}</div>`,
        )
        .join('')}</aside>`
    : '';

  const failureHtml = result.failures.length
    ? `<aside class="evidence-failures" data-failed-providers="${result.failures
        .map((f) => f.providerId)
        .join(',')}">
        <strong>Some providers did not respond</strong>
        <ul>${result.failures
          .map(
            (f) =>
              `<li><code>${escapeHtml(f.providerId)}</code> — ${escapeHtml(
                f.timedOut ? `timed out (${f.reason})` : f.reason,
              )}</li>`,
          )
          .join('')}</ul>
        <button type="button" class="btn-secondary evidence-retry-btn">Retry source lookup</button>
      </aside>`
    : '';

  if (!result.records.length) {
    container.innerHTML =
      banner +
      failureHtml +
      emptyMessage(result) +
      (result.failures.length
        ? ''
        : `<p><button type="button" class="btn-secondary evidence-retry-btn">Retry source lookup</button></p>`);
    bindRetry(container, retry);
    return;
  }

  container.innerHTML =
    banner +
    conflictHtml +
    failureHtml +
    `<div class="evidence-card-list">${result.records.map((r) => evidenceCard(r)).join('')}</div>` +
    '<p class="evidence-learner-note">Live cards come from public scientific services today. Cached cards were retrieved earlier. Fixture cards are sample data — never described as live. Conflicts and uncertainty are retained.</p>';

  if (!result.failures.length && (status === 'fixture' || status === 'cached' || status === 'partial')) {
    const actions = document.createElement('p');
    actions.innerHTML =
      '<button type="button" class="btn-secondary evidence-retry-btn">Retry source lookup</button>';
    container.appendChild(actions);
  }
  bindRetry(container, retry);
  bindExpand(container);
}

function emptyMessage(result: SpeciesEvidenceResult): string {
  if (result.offline) {
    return '<p class="evidence-empty" data-evidence-state="offline">Device appears offline. No evidence is linked while the network is unavailable.</p>';
  }
  if (result.status === 'timed_out') {
    return '<p class="evidence-empty" data-evidence-state="timed_out">Live sources timed out. Retry source lookup, or reopen this panel when connectivity is stable.</p>';
  }
  if (result.failures.length) {
    return '<p class="evidence-empty" data-evidence-state="error">No evidence could be loaded from the providers that responded.</p>';
  }
  return '<p class="evidence-empty" data-evidence-state="empty">No evidence is linked to this entry.</p>';
}

function statusBanner(result: SpeciesEvidenceResult): string {
  const msgs: Record<string, string> = {
    live: 'Live sources loaded.',
    partial: 'Some providers did not respond. Successful records are shown below.',
    cached: 'Live sources unavailable; showing previously verified (cached) evidence.',
    fixture: 'Live sources unavailable; showing fixture-backed sample evidence (not live).',
    empty: 'No evidence is linked to this entry.',
    offline: 'Offline — live source lookup was not attempted.',
    timed_out: 'Live sources timed out before any records arrived.',
    error: 'Source lookup failed for the eligible providers.',
  };
  const cls =
    result.status === 'live'
      ? 'evidence-status-ok'
      : result.status === 'partial' || result.status === 'cached' || result.status === 'fixture'
        ? 'evidence-status-warn'
        : 'evidence-status-error';
  return `<div class="evidence-status ${cls}" data-evidence-status="${result.status}" data-evidence-state="${result.status}">
    <p>${msgs[result.status] ?? msgs.error}</p>
  </div>`;
}

function bindRetry(container: HTMLElement, retry: () => void): void {
  container.querySelectorAll('.evidence-retry-btn').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      retry();
    });
  });
}

function bindExpand(container: HTMLElement): void {
  container.querySelectorAll('.evidence-expand-btn').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const card = (btn as HTMLElement).closest('.evidence-card');
      if (!card) return;
      const details = card.querySelector('.evidence-card-details') as HTMLElement | null;
      const open = !card.classList.contains('is-expanded');
      card.classList.toggle('is-expanded', open);
      card.setAttribute('data-expanded', open ? 'true' : 'false');
      if (details) details.hidden = !open;
      (btn as HTMLElement).textContent = open ? 'Hide details' : 'Expand details';
      (btn as HTMLElement).setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
}

function providerLabel(providerId: string): string {
  return PROVIDER_LABELS[providerId] ?? providerId.toUpperCase();
}

function playerCacheLabel(cacheStatus: FederatedRecord['cacheStatus']): string {
  switch (cacheStatus) {
    case 'live':
      return 'Live service';
    case 'fixture':
      return 'Fixture sample';
    case 'cached':
      return 'Cached record';
    default:
      return 'Unavailable';
  }
}

function playerClassLabel(interpretation: FederatedRecord['interpretation']): string {
  switch (interpretation) {
    case 'observed':
      return 'Observed';
    case 'reconstructed':
      return 'Reconstructed evidence';
    case 'inferred':
      return 'Inferred context';
    case 'artistic':
      return 'Artistic presentation';
    default:
      return 'Unknown classification';
  }
}

function relevanceLine(record: FederatedRecord): string {
  if (record.scientificName) {
    return `Linked as ${record.scientificName}${record.acceptedName && record.acceptedName !== record.scientificName ? ` (accepted: ${record.acceptedName})` : ''}.`;
  }
  if (record.eventDate) {
    return `Dated record from ${record.eventDate}.`;
  }
  if (record.attribution) {
    return record.attribution;
  }
  return `Provider record ${record.sourceRecordId}.`;
}

function reconstructionNotes(record: FederatedRecord): string {
  switch (record.interpretation) {
    case 'reconstructed':
      return 'Reconstruction — not a verified exact modern distribution.';
    case 'inferred':
      return 'Inferred context — not a direct species observation.';
    case 'artistic':
      return 'Artistic presentation — labeled separately from evidence.';
    case 'observed':
      return 'Observed evidence from the linked source record.';
    default:
      return 'Classification uncertain; treat as unlabeled context.';
  }
}

function evidenceCard(record: FederatedRecord): string {
  const statusLabel = playerCacheLabel(record.cacheStatus);
  const classLabel = playerClassLabel(record.interpretation);
  const notes = reconstructionNotes(record);
  const link = record.sourceUrl
    ? `<a class="evidence-source-link" href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source record</a>`
    : '<span class="evidence-source-missing">No source URL on this record</span>';
  const coords =
    record.latitude != null && record.longitude != null
      ? `${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}`
      : 'Not available';
  const qualityExact = String(record.qualityFlag ?? record.confidence);
  const colGbifCite =
    record.providerId === 'col' || record.providerId === 'gbif'
      ? `<p class="evidence-provenance-cite" data-provenance="col-gbif">${escapeHtml(
          `${record.providerId.toUpperCase()} [${record.license}] ${record.attribution} — ${
            record.scientificName ?? record.sourceRecordId
          } (${record.cacheStatus})`,
        )}</p>`
      : '';

  return `<article class="evidence-card" data-provider="${escapeHtml(record.providerId)}" data-cache="${escapeHtml(record.cacheStatus)}" data-expanded="false">
    <header class="evidence-card-summary">
      <div class="evidence-card-title-row">
        <strong class="evidence-provider">${escapeHtml(providerLabel(record.providerId))}</strong>
        <span class="evidence-chip" data-cache="${escapeHtml(record.cacheStatus)}">${escapeHtml(statusLabel)}</span>
        <span class="evidence-chip" data-class="${escapeHtml(record.interpretation)}">${escapeHtml(classLabel)}</span>
      </div>
      <p class="evidence-relevance">${escapeHtml(relevanceLine(record))}</p>
      <p class="evidence-license-line"><span class="evidence-meta-label">License</span> ${escapeHtml(record.license)}</p>
      <p class="evidence-link-row">${link}</p>
      <button type="button" class="btn-secondary evidence-expand-btn" aria-expanded="false">Expand details</button>
    </header>
    <div class="evidence-card-details" hidden>
      ${colGbifCite}
      <dl class="evidence-tech-dl">
        <dt>Record ID</dt><dd data-field="record-id">${escapeHtml(record.sourceRecordId)}</dd>
        <dt>Scientific name</dt><dd data-field="scientific-name">${escapeHtml(record.scientificName ?? '—')}</dd>
        <dt>Accepted name</dt><dd data-field="accepted-name">${escapeHtml(record.acceptedName ?? '—')}</dd>
        <dt>Rank</dt><dd data-field="rank">${escapeHtml(record.taxonomicRank ?? '—')}</dd>
        <dt>Date</dt><dd data-field="date">${escapeHtml(record.eventDate ?? '—')}</dd>
        <dt>Coordinates</dt><dd data-field="coordinates">${escapeHtml(coords)}</dd>
        <dt>Geo precision</dt><dd data-field="geo-precision">${escapeHtml(record.geographicPrecision ?? '—')}</dd>
        <dt>Time precision</dt><dd data-field="time-precision">${escapeHtml(record.temporalPrecision ?? '—')}</dd>
        <dt>Retrieved</dt><dd data-field="retrieved">${escapeHtml(record.retrievedAt)}</dd>
        <dt>License</dt><dd data-field="license">${escapeHtml(record.license)}</dd>
        <dt>Quality</dt><dd data-field="quality">${escapeHtml(qualityExact)}</dd>
        <dt>Classification</dt><dd data-field="classification">${escapeHtml(record.interpretation)}</dd>
        <dt>Reconstruction/inference notes</dt><dd data-field="notes">${escapeHtml(notes)}</dd>
        <dt>Exact source URL</dt><dd data-field="source-url">${
          record.sourceUrl
            ? `<a class="evidence-source-link" href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(record.sourceUrl)}</a>`
            : '—'
        }</dd>
      </dl>
      ${
        record.interpretation === 'reconstructed' || record.interpretation === 'inferred' || record.interpretation === 'artistic'
          ? `<p class="evidence-reconstruction">${escapeHtml(notes)}</p>`
          : ''
      }
    </div>
  </article>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type { ProviderConflict };
