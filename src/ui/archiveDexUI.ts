import type { SaveState, CollectedArtifact } from '@/schema';
import type { ArchiveDexEntry, ArchiveDexTabId } from '@/schema/archivedex';
import { ARCHIVEDEX_TAB_LABELS } from '@/schema/archivedex';
import { ArchiveDexService } from '@/services/ArchiveDexService';
import { DataCatalogService, getSpeciesIcon, getConservationClass } from '@/services/DataCatalogService';
import { getCollectedIds } from '@/systems/artifactSystem';
import { getEntryRevealLevel, getVisibleTabs } from '@/services/archivedexMapper';
import { renderArchiveDexTab } from '@/ui/archiveDexTabs';
import { formatArtifactType } from '@/systems/artifactSystem';
import { renderSourcesEvidencePanel } from '@/ui/evidence/SourcesEvidencePanel';

export class ArchiveDexUI {
  private container: HTMLElement;
  private grid: HTMLElement;
  private entryPanel: HTMLElement;
  private entryHeader: HTMLElement;
  private entryTabs: HTMLElement;
  private entryContent: HTMLElement;
  private stats: HTMLElement;
  private coverage: HTMLElement;
  private completion: HTMLElement;
  private pagination: HTMLElement;
  private searchInput: HTMLInputElement;
  private unlockModal: HTMLElement;
  private dexService: ArchiveDexService;
  private catalog: DataCatalogService;
  private state: SaveState | null = null;
  private page = 1;
  private pageSize = 12;
  private activeTab: ArchiveDexTabId = 'overview';
  private filters = {
    query: '',
    group: 'all',
    region: 'all',
    conservationStatus: 'all',
    threatenedOnly: false,
    extinctOnly: false,
    extantOnly: false,
    heroOnly: false,
    questableOnly: false,
    collectedFilter: 'all' as 'all' | 'collected' | 'uncollected',
    tier: 'all',
    representationTier: 'all',
    timePeriod: 'all',
    lifeStatus: 'all',
    source: 'all',
  };

  constructor(container: HTMLElement, dexService: ArchiveDexService, catalog: DataCatalogService) {
    this.container = container;
    this.dexService = dexService;
    this.catalog = catalog;
    this.grid = container.querySelector('#archive-grid')!;
    this.entryPanel = container.querySelector('#archivedex-entry')!;
    this.entryHeader = container.querySelector('#archivedex-entry-header')!;
    this.entryTabs = container.querySelector('#archivedex-tabs')!;
    this.entryContent = container.querySelector('#archivedex-tab-content')!;
    this.stats = container.querySelector('#archive-stats')!;
    this.coverage = container.querySelector('#archive-coverage')!;
    this.completion = container.querySelector('#archivedex-completion')!;
    this.pagination = container.querySelector('#archive-pagination')!;
    this.searchInput = container.querySelector('#archive-search') as HTMLInputElement;
    this.unlockModal = document.getElementById('archivedex-unlock-modal')!;

    this.bindFilters();
    this.unlockModal?.querySelector('#archivedex-unlock-close')?.addEventListener('click', () => this.hideUnlockModal());
    this.unlockModal?.querySelector('#archivedex-unlock-open')?.addEventListener('click', () => {
      const id = this.unlockModal.dataset.entryId;
      this.hideUnlockModal();
      if (id) void this.openEntry(id);
    });
  }

  private bindFilters() {
    const bind = (sel: string, fn: (el: HTMLElement) => void) => {
      this.container.querySelector(sel)?.addEventListener('change', (e) => {
        fn(e.target as HTMLElement);
        this.page = 1;
        this.render();
      });
    };
    this.searchInput?.addEventListener('input', () => {
      this.filters.query = this.searchInput.value;
      this.page = 1;
      this.render();
    });
    bind('#filter-group', (el) => { this.filters.group = (el as HTMLSelectElement).value; });
    bind('#filter-region', (el) => { this.filters.region = (el as HTMLSelectElement).value; });
    bind('#filter-status', (el) => { this.filters.conservationStatus = (el as HTMLSelectElement).value; });
    bind('#filter-tier', (el) => { this.filters.tier = (el as HTMLSelectElement).value; });
    bind('#filter-collected', (el) => { this.filters.collectedFilter = (el as HTMLSelectElement).value as typeof this.filters.collectedFilter; });
    bind('#filter-representation-tier', (el) => { this.filters.representationTier = (el as HTMLSelectElement).value; });
    bind('#filter-time-period', (el) => { this.filters.timePeriod = (el as HTMLSelectElement).value; });
    bind('#filter-life-status', (el) => { this.filters.lifeStatus = (el as HTMLSelectElement).value; });
    bind('#filter-source', (el) => { this.filters.source = (el as HTMLSelectElement).value; });
    bind('#filter-hero-only', (el) => { this.filters.heroOnly = (el as HTMLInputElement).checked; });
    bind('#filter-questable-only', (el) => { this.filters.questableOnly = (el as HTMLInputElement).checked; });
    this.container.querySelector('#filter-threatened')?.addEventListener('change', (e) => {
      this.filters.threatenedOnly = (e.target as HTMLInputElement).checked;
      this.page = 1;
      this.render();
    });
    this.container.querySelector('#filter-extinct')?.addEventListener('change', (e) => {
      this.filters.extinctOnly = (e.target as HTMLInputElement).checked;
      if (this.filters.extinctOnly) this.filters.extantOnly = false;
      this.page = 1;
      this.render();
    });
    this.container.querySelector('#filter-extant')?.addEventListener('change', (e) => {
      this.filters.extantOnly = (e.target as HTMLInputElement).checked;
      if (this.filters.extantOnly) this.filters.extinctOnly = false;
      this.page = 1;
      this.render();
    });
    this.pagination?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-page]') as HTMLElement | null;
      if (!btn) return;
      if (btn.dataset.page === 'prev' && this.page > 1) this.page--;
      if (btn.dataset.page === 'next') this.page++;
      this.render();
    });
    this.entryPanel?.querySelector('#archivedex-entry-back')?.addEventListener('click', () => {
      this.entryPanel.classList.add('hidden');
    });
  }

  setData(state: SaveState) {
    this.state = state;
    this.render();
  }

  async showUnlockModal(entry: ArchiveDexEntry, artifact: CollectedArtifact) {
    this.unlockModal.dataset.entryId = entry.id;
    const body = this.unlockModal.querySelector('#archivedex-unlock-body')!;
    body.innerHTML = `
      <div class="unlock-animation">✨ New ArchiveDex Entry!</div>
      <h3>${entry.commonName}</h3>
      <p class="sci-name">${entry.scientificName}</p>
      <p><strong>Artifact:</strong> ${formatArtifactType(artifact.artifactType)}</p>
      <p><strong>Time:</strong> ${entry.time?.timeRangeLabel ?? entry.time?.timeUnitIds?.join(' – ') ?? 'Unknown'}</p>
      <p><strong>Status:</strong> ${entry.conservation?.iucnCategory ?? entry.lifeStatus}</p>
      <p class="dex-description">${entry.overview?.shortDescription ?? ''}</p>
      ${entry.lifeling?.unlocks?.length ? `<p><strong>Your Lifeling learned:</strong> ${entry.lifeling.unlocks.map((u) => u.traitName).join(', ')}</p>` : ''}
      <section class="unlock-evidence">
        <h4>Sources and Evidence</h4>
        <div id="unlock-evidence-mount" class="evidence-panel"></div>
      </section>
    `;
    this.unlockModal.classList.remove('hidden');
    const mount = body.querySelector('#unlock-evidence-mount') as HTMLElement | null;
    if (mount) {
      await renderSourcesEvidencePanel(mount, entry.id, entry.scientificName).done;
    }
  }

  hideUnlockModal() {
    this.unlockModal.classList.add('hidden');
  }

  async openEntry(id: string) {
    if (!this.state) return;
    this.activeTab = 'overview';
    await this.renderEntry(id);
    this.entryPanel.classList.remove('hidden');
  }

  private async renderEntry(id: string) {
    if (!this.state) return;
    const collected = getCollectedIds(this.state).has(id);
    const entry = await this.dexService.getEntryById(id, this.state);
    if (!entry) return;

    const reveal = getEntryRevealLevel(entry, collected || entry.representationTier <= 3);
    const tabs = getVisibleTabs(entry, reveal);
    const icon = reveal === 'hidden' ? '❓' : getSpeciesIcon({ group: entry.group, conservationStatus: entry.conservation?.iucnCategory });
    const statusClass = getConservationClass(entry.conservation?.iucnCategory ?? 'Not Evaluated');

    this.entryHeader.innerHTML = `
      <div class="archivedex-entry-hero">
        <div class="archivedex-icon ${reveal === 'hidden' ? 'silhouette' : ''}">${icon}</div>
        <div>
          <h3>${entry.commonName}</h3>
          <p class="sci-name">${reveal === 'hidden' ? '???' : entry.scientificName}</p>
          ${entry.archiveNumber ? `<span class="dex-badge">${entry.archiveNumber}</span>` : ''}
          <span class="dex-badge">T${entry.representationTier}</span>
          <span class="species-status status-${statusClass}">${entry.conservation?.iucnCategory ?? entry.lifeStatus}</span>
        </div>
      </div>
    `;

    this.entryTabs.innerHTML = tabs
      .map(
        (t) =>
          `<button class="archivedex-tab ${t === this.activeTab ? 'active' : ''}" data-tab="${t}" type="button">${ARCHIVEDEX_TAB_LABELS[t]}</button>`
      )
      .join('');

    this.entryTabs.querySelectorAll('.archivedex-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = (btn as HTMLElement).dataset.tab as ArchiveDexTabId;
        void this.renderEntry(id);
      });
    });

    this.entryContent.innerHTML = renderArchiveDexTab(entry, this.activeTab, collected || entry.representationTier <= 3);

    const related = this.dexService.getRelatedEntries(id);
    if (related.length) {
      this.entryContent.innerHTML += `
        <div class="archivedex-related"><h4>Related entries</h4>
        <div class="related-carousel">${related.map((r) => `<button class="related-card" data-id="${r.id}">${r.commonName}</button>`).join('')}</div></div>`;
      this.entryContent.querySelectorAll('.related-card').forEach((btn) => {
        btn.addEventListener('click', () => void this.openEntry((btn as HTMLElement).dataset.id!));
      });
    }

    if (this.activeTab === 'sources') {
      const mount = this.entryContent.querySelector('#federated-evidence-mount') as HTMLElement | null;
      if (mount) {
        await renderSourcesEvidencePanel(mount, entry.id, entry.scientificName).done;
      }
    }
  }

  render() {
    if (!this.state) return;

    const collected = this.state.artifacts.length;
    const coverage = this.catalog.getCoverage();
    const collectedIds = getCollectedIds(this.state);
    const region = this.state.player.currentRegion;

    this.stats.textContent = `${collected} artifacts documented — browsing ${coverage.representedSpecies} Known Life entries`;

    this.coverage.innerHTML = `
      <div class="coverage-grid">
        <div class="coverage-item"><span class="coverage-value">${coverage.representedSpecies}</span><span class="coverage-label">Represented</span></div>
        <div class="coverage-item"><span class="coverage-value">${coverage.heroSpecies}</span><span class="coverage-label">Hero</span></div>
        <div class="coverage-item"><span class="coverage-value">${coverage.threatened}</span><span class="coverage-label">Threatened</span></div>
        <div class="coverage-item"><span class="coverage-value">${coverage.extinctFossil}</span><span class="coverage-label">Extinct/Fossil</span></div>
      </div>`;

    const heroStats = this.dexService.getCompletionStats({ heroOnly: true }, this.state);
    const regionStats = this.dexService.getCompletionStats({ region }, this.state);
    this.completion.innerHTML = `
      <div class="completion-row">
        <span>${heroStats.label}: ${heroStats.documented}/${heroStats.total} (${heroStats.percent}%)</span>
        <span>${regionStats.label}: ${regionStats.documented}/${regionStats.total} (${regionStats.percent}%)</span>
      </div>`;

    const result = this.dexService.searchEntries({ ...this.filters, page: this.page, pageSize: this.pageSize }, this.state);

    this.grid.innerHTML = result.entries.map((entry) => {
      const discovered = collectedIds.has(entry.id) || entry.representationTier <= 3;
      const icon = discovered ? getSpeciesIcon({ group: entry.group, conservationStatus: entry.iucnCategory }) : '🦴';
      const statusClass = getConservationClass(entry.iucnCategory ?? 'Not Evaluated');
      return `
        <div class="archive-card ${discovered ? '' : 'locked'}" data-id="${entry.id}" data-discovered="${discovered}" role="button" tabindex="0" aria-label="${discovered ? entry.commonName : 'Undocumented species'}">
          <div class="species-icon ${discovered ? '' : 'silhouette'}">${discovered ? icon : '❓'}</div>
          <div class="species-name">${discovered ? entry.commonName : 'Undocumented'}</div>
          <div class="species-tier">T${entry.representationTier}</div>
          ${discovered ? `<span class="species-status status-${statusClass}">${entry.iucnCategory ?? entry.lifeStatus ?? 'Archive'}</span>` : '<span class="species-clue">Field documentation required</span>'}
        </div>`;
    }).join('');

    const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
    if (this.page > totalPages) this.page = totalPages;

    this.pagination.innerHTML = `
      <button class="btn-secondary" data-page="prev" ${this.page <= 1 ? 'disabled' : ''}>← Prev</button>
      <span>Page ${this.page} of ${totalPages} (${result.total} matches)</span>
      <button class="btn-secondary" data-page="next" ${this.page >= totalPages ? 'disabled' : ''}>Next →</button>`;

    this.grid.querySelectorAll('.archive-card').forEach((card) => {
      const open = () => {
        const id = (card as HTMLElement).dataset.id!;
        const discovered = (card as HTMLElement).dataset.discovered === 'true';
        if (!discovered && result.entries.find((e) => e.id === id)?.representationTier! >= 4) return;
        void this.openEntry(id);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') open();
      });
    });
  }
}

/** @deprecated Use ArchiveDexUI — kept for import compatibility */
export { ArchiveDexUI as ArchiveUI };
