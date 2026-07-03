import type { ArchiveSpecies, SaveState } from '@/schema';
import { DataCatalogService, getSpeciesIcon, getConservationClass } from '@/services/DataCatalogService';
import { getCollectedIds } from '@/systems/artifactSystem';

export class ArchiveUI {
  private container: HTMLElement;
  private grid: HTMLElement;
  private detail: HTMLElement;
  private stats: HTMLElement;
  private coverage: HTMLElement;
  private pagination: HTMLElement;
  private searchInput: HTMLInputElement;
  private catalog: DataCatalogService;
  private state: SaveState | null = null;
  private page = 1;
  private pageSize = 12;
  private filters = {
    query: '',
    group: 'all',
    region: 'all',
    conservationStatus: 'all',
    threatenedOnly: false,
    extinctOnly: false,
    collectedFilter: 'all' as 'all' | 'collected' | 'uncollected',
    tier: 'all',
  };

  constructor(container: HTMLElement, catalog: DataCatalogService) {
    this.container = container;
    this.catalog = catalog;
    this.grid = container.querySelector('#archive-grid')!;
    this.detail = container.querySelector('#species-detail')!;
    this.stats = container.querySelector('#archive-stats')!;
    this.coverage = container.querySelector('#archive-coverage')!;
    this.pagination = container.querySelector('#archive-pagination')!;
    this.searchInput = container.querySelector('#archive-search') as HTMLInputElement;

    this.bindFilters();
  }

  private bindFilters() {
    this.searchInput?.addEventListener('input', () => {
      this.filters.query = this.searchInput.value;
      this.page = 1;
      this.render();
    });

    this.container.querySelector('#filter-group')?.addEventListener('change', (e) => {
      this.filters.group = (e.target as HTMLSelectElement).value;
      this.page = 1;
      this.render();
    });
    this.container.querySelector('#filter-region')?.addEventListener('change', (e) => {
      this.filters.region = (e.target as HTMLSelectElement).value;
      this.page = 1;
      this.render();
    });
    this.container.querySelector('#filter-status')?.addEventListener('change', (e) => {
      this.filters.conservationStatus = (e.target as HTMLSelectElement).value;
      this.page = 1;
      this.render();
    });
    this.container.querySelector('#filter-tier')?.addEventListener('change', (e) => {
      this.filters.tier = (e.target as HTMLSelectElement).value;
      this.page = 1;
      this.render();
    });
    this.container.querySelector('#filter-collected')?.addEventListener('change', (e) => {
      this.filters.collectedFilter = (e.target as HTMLSelectElement).value as typeof this.filters.collectedFilter;
      this.page = 1;
      this.render();
    });
    this.container.querySelector('#filter-threatened')?.addEventListener('change', (e) => {
      this.filters.threatenedOnly = (e.target as HTMLInputElement).checked;
      this.page = 1;
      this.render();
    });
    this.container.querySelector('#filter-extinct')?.addEventListener('change', (e) => {
      this.filters.extinctOnly = (e.target as HTMLInputElement).checked;
      this.page = 1;
      this.render();
    });

    this.pagination?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-page]') as HTMLElement | null;
      if (!btn) return;
      const action = btn.dataset.page;
      if (action === 'prev' && this.page > 1) this.page--;
      if (action === 'next') this.page++;
      this.render();
    });
  }

  setData(state: SaveState) {
    this.state = state;
    this.render();
  }

  render() {
    if (!this.state) return;

    const collected = this.state.artifacts.length;
    const coverage = this.catalog.getCoverage();
    const collectedIds = getCollectedIds(this.state);

    this.stats.textContent = `${collected} artifacts collected — browsing ${coverage.representedSpecies} represented species`;

    this.coverage.innerHTML = `
      <div class="coverage-grid">
        <div class="coverage-item"><span class="coverage-value">${coverage.representedSpecies}</span><span class="coverage-label">Represented</span></div>
        <div class="coverage-item"><span class="coverage-value">${coverage.iucnAssessed}</span><span class="coverage-label">IUCN Assessed</span></div>
        <div class="coverage-item"><span class="coverage-value">${coverage.threatened}</span><span class="coverage-label">Threatened</span></div>
        <div class="coverage-item"><span class="coverage-value">${coverage.extinctFossil}</span><span class="coverage-label">Extinct/Fossil</span></div>
        <div class="coverage-item"><span class="coverage-value">${coverage.playableQuestSpecies}</span><span class="coverage-label">Playable</span></div>
        <div class="coverage-item"><span class="coverage-value">${coverage.heroSpecies}</span><span class="coverage-label">Hero Species</span></div>
      </div>
    `;

    const result = this.catalog.searchSpecies({
      ...this.filters,
      collectedIds,
      page: this.page,
      pageSize: this.pageSize,
    });

    this.grid.innerHTML = result.entries.map((entry) => {
      const unlocked = collectedIds.has(entry.id);
      const icon = getSpeciesIcon({ group: entry.group, conservationStatus: entry.iucnCategory });
      const statusClass = getConservationClass(entry.iucnCategory ?? 'Not Evaluated');
      return `
        <div class="archive-card ${unlocked ? '' : 'locked'}" data-id="${entry.id}">
          <div class="species-icon">${unlocked ? icon : '❓'}</div>
          <div class="species-name">${unlocked ? entry.commonName : '???'}</div>
          <div class="species-tier">${entry.tier}</div>
          ${unlocked ? `<span class="species-status status-${statusClass}">${entry.iucnCategory}</span>` : ''}
        </div>
      `;
    }).join('');

    const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
    if (this.page > totalPages) this.page = totalPages;

    this.pagination.innerHTML = `
      <button class="btn-secondary" data-page="prev" ${this.page <= 1 ? 'disabled' : ''}>← Prev</button>
      <span>Page ${this.page} of ${totalPages} (${result.total} matches)</span>
      <button class="btn-secondary" data-page="next" ${this.page >= totalPages ? 'disabled' : ''}>Next →</button>
    `;

    this.grid.querySelectorAll('.archive-card').forEach((card) => {
      card.addEventListener('click', async () => {
        const id = (card as HTMLElement).dataset.id!;
        if (!collectedIds.has(id)) return;
        const species = await this.catalog.getSpeciesDetail(id);
        if (species) this.showDetail(species);
      });
    });
  }

  private showDetail(species: ArchiveSpecies) {
    this.detail.classList.remove('hidden');
    const gp = species.gameplay;
    const status = species.conservation?.iucnCategory ?? 'Not Evaluated';
    const provenanceHtml = species.provenance
      .map(
        (p) => `
        <div class="provenance-item ${p.isMockData ? 'mock' : ''}">
          <strong>${p.source.replace(/_/g, ' ')}</strong>
          ${p.isMockData ? '<span class="mock-badge">MOCK SAMPLE</span>' : ''}
          <div>Version: ${p.sourceVersion} | License: ${p.license}</div>
          <div class="citation">${p.citationRequired ? 'Citation required: ' : ''}${p.citation}</div>
          <div class="provenance-ids">
            ${p.catalogueOfLifeId ? `COL: ${p.catalogueOfLifeId} ` : ''}
            ${p.gbifTaxonKey ? `GBIF: ${p.gbifTaxonKey} ` : ''}
            ${p.iucnTaxonId ? `IUCN: ${p.iucnTaxonId} ` : ''}
            ${p.paleobiodbTaxonNo ? `PBDB: ${p.paleobiodbTaxonNo}` : ''}
          </div>
          <div class="provenance-dates">Updated: ${p.lastUpdated}</div>
        </div>
      `
      )
      .join('');

    this.detail.innerHTML = `
      <h3>${species.commonName}</h3>
      <p class="sci-name">${species.scientificName}</p>
      <div class="detail-grid">
        <div><span class="detail-label">Group:</span> ${species.group}</div>
        <div><span class="detail-label">Family:</span> ${species.taxonomy.family}</div>
        <div><span class="detail-label">Tier:</span> ${species.tier}</div>
        <div><span class="detail-label">Diet:</span> ${gp?.diet ?? '—'}</div>
        <div><span class="detail-label">Activity:</span> ${gp?.activity ?? '—'}</div>
        <div><span class="detail-label">Size:</span> ${gp?.size ?? '—'}</div>
        <div><span class="detail-label">Time:</span> ${gp?.timeRange ?? species.fossil?.timeRange ?? '—'}</div>
        <div><span class="detail-label">Status:</span> ${status}</div>
        <div><span class="detail-label">Habitats:</span> ${species.distribution?.habitats.join(', ') ?? '—'}</div>
      </div>
      ${gp?.behavior ? `<p><strong>Behavior:</strong> ${gp.behavior}</p>` : ''}
      ${gp?.funFacts?.length ? `<p><strong>Fun Facts:</strong> ${gp.funFacts.join(' ')}</p>` : ''}
      ${species.fossil?.fossilLocations ? `<p><strong>Fossil Locations:</strong> ${species.fossil.fossilLocations.join(', ')}</p>` : ''}
      ${species.fossil?.livingRelatives ? `<p><strong>Living Relatives:</strong> ${species.fossil.livingRelatives.join(', ')}</p>` : ''}
      ${gp?.whyItMatters ? `<div class="why-matters"><strong>Why this species matters:</strong> ${gp.whyItMatters}</div>` : ''}
      <div class="provenance-section">
        <h4>Data Sources & Provenance</h4>
        <p class="provenance-warning">⚠️ Taxonomy and conservation status may change as scientific knowledge advances. Always verify critical decisions with primary sources.</p>
        ${provenanceHtml}
      </div>
      ${this.renderNasaEnvironment(species)}
    `;
  }

  private renderNasaEnvironment(species: ArchiveSpecies): string {
    if (!species.nasaLayerDependencies?.length && !species.requiredHabitatSignals?.length) return '';
    const deps = (species.nasaLayerDependencies ?? [])
      .map((d) => `<li><strong>${d.layer}</strong> (${d.product}): ${d.reason}</li>`)
      .join('');
    const signals = (species.requiredHabitatSignals ?? [])
      .map((s) => `<li>${s.signal}${s.required ? ' *' : ''} — ${s.description}</li>`)
      .join('');
    return `
      <div class="provenance-section">
        <h4>NASA Earth Environment Links</h4>
        <p class="provenance-warning">Environmental context from NASA Earth Systems layers — complements biodiversity records.</p>
        ${deps ? `<ul class="earth-metrics">${deps}</ul>` : ''}
        ${signals ? `<p><strong>Habitat signals:</strong></p><ul class="earth-metrics">${signals}</ul>` : ''}
      </div>
    `;
  }
}
