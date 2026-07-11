import type { SaveState } from '@/schema';
import type { GeologicTimeRank } from '@/time/schema';
import { REPRESENTATION_TIER_LABELS } from '@/time/schema';
import { TimeAtlasService } from '@/time/TimeAtlasService';
import type { DataCatalogService } from '@/services/DataCatalogService';
import { TemporalMapService } from '@/services/TemporalMapService';
import type { TemporalEarthMapRecord } from '@/schema/temporalMap';

const RANK_LABELS: Record<GeologicTimeRank, string> = {
  eon: 'Eons',
  era: 'Eras',
  period: 'Periods',
  epoch: 'Epochs',
  age: 'Ages',
};

export class TimeAtlasUI {
  private tree: HTMLElement;
  private detail: HTMLElement;
  private gates: HTMLElement;
  private mockBanner: HTMLElement;
  private rankSelect: HTMLSelectElement;
  private searchInput: HTMLInputElement;
  private timeService: TimeAtlasService;
  private temporalMapService: TemporalMapService;
  private state: SaveState | null = null;
  private selectedUnitId: string | null = null;
  private activeRank: GeologicTimeRank = 'eon';

  constructor(
    panel: HTMLElement,
    timeService: TimeAtlasService,
    temporalMapService: TemporalMapService,
    _catalog: DataCatalogService
  ) {
    this.timeService = timeService;
    this.temporalMapService = temporalMapService;
    this.tree = panel.querySelector('#time-atlas-tree')!;
    this.detail = panel.querySelector('#time-atlas-detail')!;
    this.gates = panel.querySelector('#time-atlas-gates')!;
    this.mockBanner = panel.querySelector('#time-mock-banner')!;
    this.rankSelect = panel.querySelector('#time-rank-select') as HTMLSelectElement;
    this.searchInput = panel.querySelector('#time-search') as HTMLInputElement;

    this.rankSelect?.addEventListener('change', () => {
      this.activeRank = this.rankSelect.value as GeologicTimeRank;
      this.render();
    });
    this.searchInput?.addEventListener('input', () => this.render());
  }

  setData(state: SaveState) {
    this.state = state;
    this.render();
  }

  open() {
    if (this.state) this.render();
  }

  private recordView(unitId: string) {
    if (!this.state) return;
    if (!this.state.timeAtlas.viewedTimeUnits.includes(unitId)) {
      this.state.timeAtlas.viewedTimeUnits.push(unitId);
    }
  }

  private recordGateView(gateId: string) {
    if (!this.state) return;
    if (!this.state.timeAtlas.viewedGates.includes(gateId)) {
      this.state.timeAtlas.viewedGates.push(gateId);
    }
  }

  render() {
    if (!this.state) return;

    const manifest = this.timeService.getManifest();
    this.mockBanner.innerHTML = manifest.isMockData
      ? '<span class="mock-badge">MOCK TIME SAMPLE</span> Geologic boundaries are illustrative until live ICS ingestion is connected.'
      : '';

    const query = this.searchInput?.value ?? '';
    const units = query
      ? this.timeService.searchUnits(query)
      : this.timeService.getUnitsByRank(this.activeRank);

    this.tree.innerHTML = units
      .map((u) => {
        const locked = u.rank !== 'eon' && u.startMa > 100;
        return `
          <button class="time-unit-btn ${this.selectedUnitId === u.id ? 'active' : ''}" data-unit="${u.id}">
            <span class="time-unit-name">${u.name}</span>
            <span class="time-unit-rank">${u.rank}</span>
            <span class="time-unit-ma">${u.endMa}–${u.startMa} Ma</span>
            ${locked ? '<span class="time-lock">🔒</span>' : ''}
          </button>
        `;
      })
      .join('');

    this.tree.querySelectorAll('.time-unit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedUnitId = (btn as HTMLElement).dataset.unit!;
        this.recordView(this.selectedUnitId);
        this.renderDetail();
        this.render();
      });
    });

    this.renderGates();
    if (this.selectedUnitId) this.renderDetail();
    else this.detail.innerHTML = '<p class="time-hint">Select a time unit to inspect taxa, climate, and uncertainty notes.</p>';
  }

  private renderDetail() {
    if (!this.selectedUnitId) return;
    const unit = this.timeService.getUnit(this.selectedUnitId);
    if (!unit) return;

    const manifest = this.timeService.getManifest();
    const taxa = this.timeService.getTaxaOverlappingUnit(unit.id);
    const ancestors = this.timeService.getAncestors(unit.id);
    const dataQuality = manifest.isMockData ? 'mock_sample' : 'source_verified';
    const provHtml = unit.sourceProvenance
      .map(
        (p) => `
        <div class="provenance-item ${p.isMockData ? 'mock' : ''}">
          <strong>${p.source.replace(/_/g, ' ')}</strong>
          ${p.isMockData ? '<span class="mock-badge">MOCK</span>' : ''}
          <div>${p.citation}</div>
        </div>
      `
      )
      .join('');
    const mapHtml = this.renderTemporalMapStatus(
      this.temporalMapService.getMapsForTimeUnit(unit.id)
    );

    this.detail.innerHTML = `
      <h3>${unit.name} <span class="time-rank-badge">${unit.rank}</span></h3>
      <p class="time-ma-range">${unit.endMa} – ${unit.startMa} million years ago</p>
      ${ancestors.length ? `<p><strong>Within:</strong> ${ancestors.map((a) => a.name).join(' → ')}</p>` : ''}
      <p>${unit.description}</p>
      <div class="detail-grid">
        <div><span class="detail-label">Climate:</span> ${unit.climateSummary}</div>
      </div>
      ${unit.majorEvents.length ? `<p><strong>Major events:</strong> ${unit.majorEvents.join('; ')}</p>` : ''}
      ${unit.dominantLife.length ? `<p><strong>Dominant life:</strong> ${unit.dominantLife.join(', ')}</p>` : ''}
      ${unit.uncertaintyNotes ? `<p class="uncertainty-note">⚠️ ${unit.uncertaintyNotes}</p>` : ''}
      ${mapHtml}
      <div class="time-data-quality">
        <h4>Data quality</h4>
        <p>Represented taxa: <strong>${taxa.length}</strong> · Artifact availability: see ArchiveDex T4+ entries · Status: <code>${dataQuality.replace(/_/g, ' ')}</code>${manifest.isMockData ? ' <span class="mock-badge">MOCK TIME SAMPLE</span>' : ''}</p>
      </div>
      <h4>Represented taxa (${taxa.length})</h4>
      <ul class="time-taxon-list">
        ${taxa
          .slice(0, 12)
          .map(
            (t) =>
              `<li><strong>${t.acceptedName}</strong> (${t.lifeStatus}) — ${t.firstAppearanceMa}–${t.lastAppearanceMa} Ma</li>`
          )
          .join('')}
        ${taxa.length > 12 ? `<li>…and ${taxa.length - 12} more in full catalogue</li>` : ''}
      </ul>
      <div class="provenance-section"><h4>Source Provenance</h4>${provHtml}</div>
    `;
  }

  private renderGates() {
    if (!this.state) return;
    const gates = this.timeService.getPlayableGates();
    const progress = {
      artifactsCollected: this.state.stats.artifactsCollected,
      regionsExplored: this.state.stats.regionsExplored,
      completedQuests: this.state.quests.completed,
    };

    this.gates.innerHTML = `
      <h4>Playable Time Gates</h4>
      <div class="time-gates-grid">
        ${gates
          .map((g) => {
            const unlocked = this.timeService.isGateUnlocked(g, progress);
            const temporalMap = this.temporalMapService.getMapForGate(g.id);
            const mapStatus = temporalMap
              ? this.temporalMapStatusLabel(temporalMap)
              : '<span class="mock-badge">MAP REQUIREMENT MISSING</span>';
            this.recordGateView(g.id);
            const preLife = ['hadean_gate', 'archean_gate', 'proterozoic_gate'].includes(g.id);
            const preLifeNote = preLife
              ? '<p class="uncertainty-note">Pre-animal or microbial-world gate — macroscopic animal encounters are not represented in this era.</p>'
              : '';
            return `
              <div class="time-gate-card ${unlocked ? 'unlocked' : 'locked'}">
                <div class="time-gate-name">${g.name}</div>
                <div class="time-gate-status">${unlocked ? '✓ Available' : `🔒 Requires ${g.requiredProgress.artifactsCollected} artifacts`}</div>
                <p class="time-gate-desc">${g.description}</p>
                <p><strong>Full-Earth map:</strong> ${mapStatus}</p>
                ${g.uncertaintyNotes ? `<p class="uncertainty-note">⚠️ ${g.uncertaintyNotes}</p>` : ''}
                ${preLifeNote}
                ${g.sourceProvenance?.length ? `<p class="time-gate-prov"><em>Sources: ${g.sourceProvenance.map((p) => p.source).join(', ')}</em></p>` : ''}
                ${unlocked && g.isPlayable ? '<button class="btn-secondary time-expedition-btn" disabled title="Time expeditions are a future feature — gate browsing is fully supported">Preview Expedition (future)</button>' : ''}
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  private temporalMapStatusLabel(map: TemporalEarthMapRecord): string {
    if (map.status === 'source_verified') {
      return `<span class="earth-mode-badge">SOURCE VERIFIED</span> ${map.coveredGridCellCount}/${map.expectedGridCellCount} cells`;
    }
    if (map.status === 'partial') {
      return `<span class="mock-badge">PARTIAL</span> ${map.coveredGridCellCount}/${map.expectedGridCellCount} cells`;
    }
    return `<span class="mock-badge">BLOCKED — NO SCIENTIFIC ASSET</span> 0/${map.expectedGridCellCount} cells`;
  }

  private renderTemporalMapStatus(maps: TemporalEarthMapRecord[]): string {
    if (maps.length === 0) {
      return `
        <div class="time-data-quality">
          <h4>Full-Earth reconstruction</h4>
          <p>No Time Gate directly targets this unit. The catalog is keyed to the 17 supported expedition gates.</p>
        </div>
      `;
    }

    return `
      <div class="time-data-quality">
        <h4>Full-Earth reconstruction</h4>
        ${maps
          .map(
            (map) => `
              <p>${this.temporalMapStatusLabel(map)}</p>
              <p>${map.blockedReason ?? map.uncertaintyNotes}</p>
              ${
                map.status === 'source_verified' && map.asset
                  ? `<p>Packaged asset: <code>${map.asset.path}</code> · SHA-256 verified</p>`
                  : '<p><em>No speculative coastlines are rendered while source data is missing.</em></p>'
              }
            `
          )
          .join('')}
      </div>
    `;
  }
}

export { REPRESENTATION_TIER_LABELS, RANK_LABELS };
