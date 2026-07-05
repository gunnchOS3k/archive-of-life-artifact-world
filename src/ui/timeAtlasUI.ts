import type { SaveState } from '@/schema';
import type { GeologicTimeRank } from '@/time/schema';
import { REPRESENTATION_TIER_LABELS } from '@/time/schema';
import { TimeAtlasService } from '@/time/TimeAtlasService';
import type { DataCatalogService } from '@/services/DataCatalogService';

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
  private state: SaveState | null = null;
  private selectedUnitId: string | null = null;
  private activeRank: GeologicTimeRank = 'eon';

  constructor(panel: HTMLElement, timeService: TimeAtlasService, _catalog: DataCatalogService) {
    this.timeService = timeService;
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

    const taxa = this.timeService.getTaxaOverlappingUnit(unit.id);
    const ancestors = this.timeService.getAncestors(unit.id);
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
            this.recordGateView(g.id);
            return `
              <div class="time-gate-card ${unlocked ? 'unlocked' : 'locked'}">
                <div class="time-gate-name">${g.name}</div>
                <div class="time-gate-status">${unlocked ? '✓ Available' : `🔒 Requires ${g.requiredProgress.artifactsCollected} artifacts`}</div>
                <p class="time-gate-desc">${g.description}</p>
                ${g.uncertaintyNotes ? `<p class="uncertainty-note">⚠️ ${g.uncertaintyNotes}</p>` : ''}
                ${unlocked && g.isPlayable ? '<button class="btn-secondary time-expedition-btn" disabled title="Time expeditions coming in future update">Preview Expedition</button>' : ''}
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }
}

export { REPRESENTATION_TIER_LABELS, RANK_LABELS };
