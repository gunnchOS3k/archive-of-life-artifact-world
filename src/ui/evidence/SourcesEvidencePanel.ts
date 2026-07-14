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
    '<p class="evidence-loading" data-evidence-state="loading">Loading sources and evidence…</p>';
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
    result.records.map((r) => evidenceCard(r)).join('') +
    '<p class="evidence-learner-note">Live cards come from public scientific services today. Cached cards were retrieved earlier. Fixture cards are sample data — never described as live. Conflicts and uncertainty are retained.</p>';

  if (!result.failures.length && (status === 'fixture' || status === 'cached' || status === 'partial')) {
    const actions = document.createElement('p');
    actions.innerHTML =
      '<button type="button" class="btn-secondary evidence-retry-btn">Retry source lookup</button>';
    container.appendChild(actions);
  }
  bindRetry(container, retry);
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

function evidenceCard(record: FederatedRecord): string {
  const statusLabel =
    record.cacheStatus === 'live'
      ? 'Live service'
      : record.cacheStatus === 'fixture'
        ? 'Fixture sample (not live)'
        : record.cacheStatus === 'cached'
          ? 'Cached (previously verified)'
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
    ? `<p><a href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source record</a></p>`
    : '';
  const coords =
    record.latitude != null && record.longitude != null
      ? `${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}`
      : 'Not available';
  return `<article class="evidence-card" data-provider="${escapeHtml(record.providerId)}" data-cache="${escapeHtml(record.cacheStatus)}">
    <header><strong>${escapeHtml(record.providerId.toUpperCase())}</strong> · ${statusLabel}</header>
    <p>${escapeHtml(record.attribution)}</p>
    <dl>
      <dt>Record ID</dt><dd>${escapeHtml(record.sourceRecordId)}</dd>
      <dt>Scientific name</dt><dd>${escapeHtml(record.scientificName ?? '—')}</dd>
      <dt>Accepted name</dt><dd>${escapeHtml(record.acceptedName ?? '—')}</dd>
      <dt>Rank</dt><dd>${escapeHtml(record.taxonomicRank ?? '—')}</dd>
      <dt>Date</dt><dd>${escapeHtml(record.eventDate ?? '—')}</dd>
      <dt>Coordinates</dt><dd>${escapeHtml(coords)}</dd>
      <dt>Geo precision</dt><dd>${escapeHtml(record.geographicPrecision ?? '—')}</dd>
      <dt>Time precision</dt><dd>${escapeHtml(record.temporalPrecision ?? '—')}</dd>
      <dt>Retrieved</dt><dd>${escapeHtml(record.retrievedAt)}</dd>
      <dt>License</dt><dd>${escapeHtml(record.license)}</dd>
      <dt>Quality</dt><dd>${escapeHtml(String(record.qualityFlag ?? record.confidence))}</dd>
      <dt>Classification</dt><dd>${escapeHtml(record.interpretation)}</dd>
    </dl>
    ${link}
    ${interpretation}
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
