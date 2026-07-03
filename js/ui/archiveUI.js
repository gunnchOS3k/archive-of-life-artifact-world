import { getSpeciesIcon, getConservationClass } from '../systems/dataLoader.js';
import { hasArtifact } from '../systems/artifactSystem.js';

export class ArchiveUI {
  constructor(container) {
    this.grid = container.querySelector('#archive-grid');
    this.detail = container.querySelector('#species-detail');
    this.stats = container.querySelector('#archive-stats');
    this.tabs = container.querySelectorAll('.tab');
    this.currentTab = 'all';
    this.onSpeciesClick = null;

    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.render();
      });
    });
  }

  setData(gameData, state) {
    this.gameData = gameData;
    this.state = state;
    this.render();
  }

  render() {
    if (!this.gameData || !this.state) return;

    const { allSpecies } = this.gameData;
    const collected = this.state.artifacts.length;
    const total = allSpecies.length;

    this.stats.textContent = `${collected} / ${total} species documented — Archive of Life`;

    let filtered = allSpecies;
    if (this.currentTab === 'extinct') {
      filtered = allSpecies.filter(s => s.conservationStatus === 'Extinct');
    } else if (this.currentTab !== 'all') {
      filtered = allSpecies.filter(s => s.group === this.currentTab);
    }

    this.grid.innerHTML = filtered.map(species => {
      const unlocked = hasArtifact(this.state, species.id);
      const icon = getSpeciesIcon(species);
      const statusClass = getConservationClass(species.conservationStatus);
      return `
        <div class="archive-card ${unlocked ? '' : 'locked'}" data-id="${species.id}">
          <div class="species-icon">${unlocked ? icon : '❓'}</div>
          <div class="species-name">${unlocked ? species.commonName : '???'}</div>
          ${unlocked ? `<span class="species-status status-${statusClass}">${species.conservationStatus}</span>` : ''}
        </div>
      `;
    }).join('');

    this.grid.querySelectorAll('.archive-card:not(.locked)').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        this.showDetail(this.gameData.speciesById[id]);
      });
    });
  }

  showDetail(species) {
    const unlocked = hasArtifact(this.state, species.id);
    if (!unlocked) return;

    this.detail.classList.remove('hidden');
    this.detail.innerHTML = `
      <h3>${species.commonName}</h3>
      <p class="sci-name">${species.scientificName}</p>
      <div class="detail-grid">
        <div><span class="detail-label">Group:</span> ${species.group}</div>
        <div><span class="detail-label">Family:</span> ${species.family}</div>
        <div><span class="detail-label">Diet:</span> ${species.diet}</div>
        <div><span class="detail-label">Activity:</span> ${species.activity}</div>
        <div><span class="detail-label">Size:</span> ${species.size}</div>
        <div><span class="detail-label">Time:</span> ${species.timeRange}</div>
        <div><span class="detail-label">Habitats:</span> ${species.habitats.join(', ')}</div>
        <div><span class="detail-label">Status:</span> ${species.conservationStatus}</div>
      </div>
      <p><strong>Behavior:</strong> ${species.behavior}</p>
      <p><strong>Fun Facts:</strong> ${species.funFacts.join(' ')}</p>
      ${species.fossilLocations ? `<p><strong>Fossil Locations:</strong> ${species.fossilLocations.join(', ')}</p>` : ''}
      ${species.livingRelatives ? `<p><strong>Living Relatives:</strong> ${species.livingRelatives.join(', ')}</p>` : ''}
      <div class="why-matters"><strong>Why this species matters:</strong> ${species.whyItMatters}</div>
      <p style="margin-top:0.75rem;font-size:0.8rem;color:var(--text-secondary)">
        Learning topics: ${species.learningTopics.join(', ')}
      </p>
    `;
  }
}
