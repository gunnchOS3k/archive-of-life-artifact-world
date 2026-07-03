export class MapUI {
  constructor(container) {
    this.container = container.querySelector('#map-container');
    this.onTravel = null;
  }

  setData(gameData, state) {
    this.gameData = gameData;
    this.state = state;
    this.render();
  }

  render() {
    if (!this.gameData || !this.state) return;

    const current = this.state.player.currentRegion;

    this.container.innerHTML = this.gameData.regions.map(region => {
      const visited = this.state.player.visitedRegions.includes(region.id);
      const isCurrent = region.id === current;
      const isHub = region.type === 'hub';
      return `
        <div class="map-region ${isCurrent ? 'current' : ''} ${isHub ? 'hub' : ''}"
             data-region="${region.id}" style="opacity:${visited ? 1 : 0.6}">
          <div class="region-dot" style="background:${region.color}"></div>
          <strong>${region.name}</strong>
          <p style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.25rem">${region.description}</p>
          ${isCurrent ? '<span style="color:var(--accent-gold);font-size:0.8rem">📍 You are here</span>' : ''}
        </div>
      `;
    }).join('');

    this.container.querySelectorAll('.map-region').forEach(el => {
      el.addEventListener('click', () => {
        const regionId = el.dataset.region;
        if (this.onTravel) this.onTravel(regionId);
      });
    });
  }
}
