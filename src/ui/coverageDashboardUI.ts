import type { DataCatalogService } from '@/services/DataCatalogService';
import type { CoverageDashboardStats, GapReport, BiasReport } from '@/coverage/CoverageTypes';
import { coverageMatrixService } from '@/coverage/CoverageMatrixService';
import { coverageDashboardService } from '@/coverage/CoverageDashboardService';

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

    try {
      const [gapRes, biasRes] = await Promise.all([
        fetch('/data/coverage/gap_report.json'),
        fetch('/data/coverage/bias_report.json'),
      ]);
      if (gapRes.ok) gapReport = await gapRes.json();
      if (biasRes.ok) biasReport = await biasRes.json();
    } catch {
      /* offline or missing reports */
    }

    const stats: CoverageDashboardStats = coverageDashboardService.buildStats(
      matrix,
      gapReport,
      biasReport
    );

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
          ${this.statCard('Source-verified taxa', stats.representedTaxa - stats.mockSampleCount)}
          ${this.statCard('Mock/sample (labeled)', stats.mockSampleCount)}
        </div>
        <section class="coverage-section">
          <h3>Gap summary</h3>
          <p>Critical: ${stats.gapSummary.critical} · High: ${stats.gapSummary.high} · Blocking: ${stats.gapSummary.blocking}</p>
        </section>
        <section class="coverage-section">
          <h3>Taxonomic balance warnings</h3>
          <ul>${biasReport.warnings.map((w) => `<li>${w}</li>`).join('') || '<li>No warnings in bias report.</li>'}</ul>
        </section>
        <section class="coverage-section">
          <h3>Hero species in snapshot</h3>
          <p>${heroBundle.species.length} hero records loaded (paginated index: ${total} total — never full global catalogue).</p>
        </section>
      </div>
    `;
  }

  private statCard(label: string, value: number): string {
    return `<div class="coverage-stat"><span class="coverage-stat-value">${value}</span><span class="coverage-stat-label">${label}</span></div>`;
  }
}
