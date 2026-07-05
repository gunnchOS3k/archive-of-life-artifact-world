import type { DataCatalogService } from '@/services/DataCatalogService';
import type { CoverageDashboardStats, GapReport, BiasReport } from '@/coverage/CoverageTypes';
import { coverageMatrixService } from '@/coverage/CoverageMatrixService';
import { coverageDashboardService } from '@/coverage/CoverageDashboardService';

interface SourceReadinessReport {
  sources?: Array<{
    source: string;
    name: string;
    configured: boolean;
    imported: boolean;
    record_count: number;
    status: string;
    blocked_reason?: string;
    next_action?: string;
  }>;
  summary?: { imported: number; blocked: number; verifiedRecordCount: number };
}

export class CoverageDashboardUI {
  private panel: HTMLElement;
  private body: HTMLElement;
  private catalog: DataCatalogService;
  private visible = false;

  constructor(panel: HTMLElement, catalog: DataCatalogService) {
    this.panel = panel;
    this.catalog = catalog;
    this.body = panel.querySelector('.panel-body')!;
    panel.querySelector('.panel-close')?.addEventListener('click', () => this.close());
  }

  async open(): Promise<void> {
    this.visible = true;
    this.panel.classList.remove('hidden');
    await this.render();
  }

  close(): void {
    this.visible = false;
    this.panel.classList.add('hidden');
  }

  isOpen(): boolean {
    return this.visible;
  }

  private async render(): Promise<void> {
    const manifest = this.catalog.getManifest();
    const { entries, total } = this.catalog.searchSpecies({ pageSize: 500 });
    const heroRes = await fetch(`/data/${manifest.bundles.heroSpecies.path}`);
    const heroBundle = (await heroRes.json()) as { species: import('@/schema').ArchiveSpecies[] };
    const heroById = new Map(heroBundle.species.map((s) => [s.id, s]));

    const matrix = coverageMatrixService.buildMatrix(entries, heroById);

    let gapReport: GapReport = {
      snapshotId: manifest.snapshotId,
      generatedAt: new Date().toISOString(),
      gaps: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0, blocking: 0 },
    };
    let biasReport: BiasReport = {
      snapshotId: manifest.snapshotId,
      generatedAt: new Date().toISOString(),
      byGroup: {},
      byBiome: {},
      byTier: {},
      bySource: {},
      warnings: [],
    };
    let sourceReadiness: SourceReadinessReport | null = null;

    try {
      const [gapRes, biasRes, srcRes] = await Promise.all([
        fetch('/data/coverage/gap_report.json'),
        fetch('/data/coverage/bias_report.json'),
        fetch('/data/status/source_readiness_report.json'),
      ]);
      if (gapRes.ok) gapReport = await gapRes.json();
      if (biasRes.ok) biasReport = await biasRes.json();
      if (srcRes.ok) sourceReadiness = await srcRes.json();
    } catch {
      /* offline or missing reports */
    }

    const stats: CoverageDashboardStats = coverageDashboardService.buildStats(
      matrix,
      gapReport,
      biasReport
    );

    const verifiedCount = stats.representedTaxa - stats.mockSampleCount;

    this.body.innerHTML = `
      <div class="coverage-dashboard">
        <p class="coverage-note">Global Coverage Matrix — sample snapshot <code>${manifest.snapshotId}</code>. <strong>Mock/sample metrics labeled — not scientific coverage.</strong></p>
        <div class="coverage-grid">
          ${this.statCard('Represented taxa', stats.representedTaxa)}
          ${this.statCard('Searchable (T1+)', stats.searchableTaxa)}
          ${this.statCard('Time-mapped', stats.timeMappedTaxa)}
          ${this.statCard('Place-mapped', stats.placeMappedTaxa)}
          ${this.statCard('Biome-mapped', stats.biomeMappedTaxa)}
          ${this.statCard('Artifact-ready (T4+)', stats.artifactReadyTaxa)}
          ${this.statCard('Questable (T5+)', stats.questableTaxa)}
          ${this.statCard('Hero (T6)', stats.heroTaxa)}
          ${this.statCard('Source-verified taxa', verifiedCount)}
          ${this.statCard('Mock/sample (labeled)', stats.mockSampleCount)}
          ${this.statCard('Release-eligible', verifiedCount)}
          ${this.statCard('Blocked external sources', sourceReadiness?.summary?.blocked ?? '—')}
        </div>
        <section class="coverage-section">
          <h3>Reports &amp; status links</h3>
          <ul class="coverage-links">
            <li><a href="/data/coverage/gap_report.json" target="_blank">Gap report</a></li>
            <li><a href="/data/coverage/bias_report.json" target="_blank">Bias report</a></li>
            <li><a href="/data/coverage/source_snapshots.json" target="_blank">Source snapshot registry</a></li>
            <li><a href="/data/status/implementation_status.json" target="_blank">Implementation status</a></li>
            <li><a href="/data/status/source_readiness_report.json" target="_blank">Source readiness</a></li>
          </ul>
        </section>
        <section class="coverage-section">
          <h3>Gap summary</h3>
          <p>Critical: ${stats.gapSummary.critical} · High: ${stats.gapSummary.high} · Blocking: ${stats.gapSummary.blocking}</p>
        </section>
        <section class="coverage-section">
          <h3>Taxonomic balance warnings</h3>
          <ul>${biasReport.warnings.map((w) => `<li>${w}</li>`).join('') || '<li>No warnings in bias report.</li>'}</ul>
        </section>
        ${
          sourceReadiness?.sources?.length
            ? `<section class="coverage-section"><h3>External source readiness</h3><ul>${sourceReadiness.sources
                .map(
                  (s) =>
                    `<li><strong>${s.name}</strong>: ${s.imported ? 'IMPORTED' : s.configured ? 'CONFIGURED' : 'BLOCKED'}${s.blocked_reason ? ` — ${s.blocked_reason}` : ''}${s.next_action ? `<br><em>Next: ${s.next_action}</em>` : ''}</li>`
                )
                .join('')}</ul></section>`
            : '<section class="coverage-section"><h3>External source readiness</h3><p>Run <code>npm run source:audit</code> to generate source readiness report.</p></section>'
        }
        <section class="coverage-section">
          <h3>Hero species in snapshot</h3>
          <p>${heroBundle.species.length} hero records loaded (paginated index: ${total} total — never full global catalogue).</p>
        </section>
      </div>
    `;
  }

  private statCard(label: string, value: number | string): string {
    return `<div class="coverage-stat"><span class="coverage-stat-value">${value}</span><span class="coverage-stat-label">${label}</span></div>`;
  }
}
