import type {
  ImplementationStatusReport,
  IncompleteInventoryReport,
  ReleaseReadinessReport,
} from '@/status/ImplementationTypes';

export class ImplementationStatusUI {
  private panel: HTMLElement;
  private body: HTMLElement;

  constructor(panel: HTMLElement) {
    this.panel = panel;
    this.body = panel.querySelector('.panel-body')!;
    panel.querySelector('.panel-close')?.addEventListener('click', () => this.close());
  }

  async open(): Promise<void> {
    this.panel.classList.remove('hidden');
    await this.render();
  }

  close(): void {
    this.panel.classList.add('hidden');
  }

  private async render(): Promise<void> {
    let impl: ImplementationStatusReport | null = null;
    let inventory: IncompleteInventoryReport | null = null;
    let release: ReleaseReadinessReport | null = null;
    let sourceReadiness: { sources?: Array<{ name: string; source: string; imported: boolean; configured: boolean; blocked_reason?: string; next_action?: string; record_count?: number }> } | null = null;

    try {
      const [a, b, c, d] = await Promise.all([
        fetch('/data/status/implementation_status.json'),
        fetch('/data/status/incomplete_inventory.json'),
        fetch('/data/status/release_readiness_report.json'),
        fetch('/data/status/source_readiness_report.json'),
      ]);
      if (a.ok) impl = await a.json();
      if (b.ok) inventory = await b.json();
      if (c.ok) release = await c.json();
      if (d.ok) sourceReadiness = await d.json();
    } catch {
      /* offline */
    }

    if (!impl) {
      this.body.innerHTML =
        '<p class="coverage-note">Run <code>npm run audit:implementation</code> and <code>npm run audit:release</code> to generate status reports.</p>';
      return;
    }

    const s = impl.summary;
    const ready = release?.ready ?? false;
    const blocking = inventory?.blockingItemCount ?? 0;

    this.body.innerHTML = `
      <div class="coverage-dashboard implementation-dashboard">
        <p class="coverage-note dev-only-banner">Implementation Status — dev/admin only. Sample snapshot <code>${impl.snapshotId}</code>.</p>
        <div class="implementation-ready ${ready ? 'ready-yes' : 'ready-no'}">
          Release readiness: <strong>${ready ? 'READY (sample scope)' : 'NOT READY'}</strong>
        </div>
        <div class="coverage-grid">
          ${this.stat('Fully implemented', s.fullyImplemented)}
          ${this.stat('Partial', s.partialImplementation)}
          ${this.stat('Status: SCAFFOLD_ONLY', s.scaffoldOnly)}
          ${this.stat('Mock/sample only', s.mockSampleOnly)}
          ${this.stat('Blocked (external data)', s.blockedExternalData)}
          ${this.stat('Release-blocking markers', blocking)}
        </div>
        ${
          release
            ? `<section class="coverage-section"><h3>Data quality (mock vs verified)</h3>
          <p>Total including mock: ${release.dataQuality.totalIncludingMock} · Mock/sample: ${release.dataQuality.mockSampleCount} · Source verified: ${release.dataQuality.totalSourceVerified} · Release eligible: ${release.dataQuality.releaseEligibleCount}</p></section>`
            : ''
        }
        <section class="coverage-section">
          <h3>Systems</h3>
          <ul class="implementation-system-list">
            ${impl.systems
              .map(
                (sys) =>
                  `<li><code>${sys.status}</code> ${sys.name}${sys.devOnly ? ' (dev)' : ''}${sys.playerFacing ? '' : ''} — ${sys.notes.slice(0, 100)}${sys.notes.length > 100 ? '…' : ''}</li>`
              )
              .join('')}
          </ul>
        </section>
        ${
          release?.blockingReasons.length
            ? `<section class="coverage-section"><h3>Blocking reasons</h3><ul>${release.blockingReasons.map((r) => `<li>${r}</li>`).join('')}</ul></section>`
            : ''
        }
        <section class="coverage-section">
          <h3>Incomplete inventory</h3>
          <p>${inventory?.itemCount ?? 0} markers scanned (${inventory?.releasePathItemCount ?? 0} in release paths). Non-blocking pipeline/docs markers are classified separately.</p>
        </section>
        ${
          sourceReadiness?.sources?.length
            ? `<section class="coverage-section"><h3>Source import readiness</h3><ul>${sourceReadiness.sources
                .map(
                  (s) =>
                    `<li><strong>${s.name}</strong>: ${s.imported ? '✓ imported' : s.configured ? 'configured' : 'BLOCKED'} (${s.record_count ?? 0} records)${!s.imported && s.next_action ? `<br><em>${s.next_action}</em>` : ''}</li>`
                )
                .join('')}</ul></section>`
            : '<section class="coverage-section"><h3>Source import readiness</h3><p>Run <code>npm run source:audit</code> to refresh.</p></section>'
        }
      </div>
    `;
  }

  private stat(label: string, value: number): string {
    return `<div class="coverage-stat"><span class="coverage-stat-value">${value}</span><span class="coverage-stat-label">${label}</span></div>`;
  }
}
