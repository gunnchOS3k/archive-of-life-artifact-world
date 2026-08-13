import type { SaveState, RegionBundle } from '@/schema';

export class MapUI {
  private container: HTMLElement;
  onTravel: ((regionId: string) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container.querySelector('#map-container')!;
  }

  setData(regions: RegionBundle[], state: SaveState) {
    const current = state.player.currentRegion;
    const eraId = state.timeAtlas?.activeTimeUnitId ?? null;
    const eraBanner = eraId
      ? `<div class="map-era-banner" role="status" data-era="${eraId}">Active era filter: <strong>${eraId}</strong> — region travel keeps Time Atlas provenance context.</div>`
      : `<div class="map-era-banner map-era-none" role="status">Active era filter: <em>present / unset</em> — open Time Atlas to set a period.</div>`;

    this.container.innerHTML =
      eraBanner +
      regions
        .map((region) => {
          const visited = state.player.visitedRegions.includes(region.id);
          const isCurrent = region.id === current;
          const isHub = region.type === 'hub';
          return `
        <div class="map-region ${isCurrent ? 'current' : ''} ${isHub ? 'hub' : ''}"
             data-region="${region.id}" style="opacity:${visited ? 1 : 0.6}">
          <div class="region-dot" style="background:${region.color}"></div>
          <strong>${region.name}</strong>
          <p style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.25rem">${region.description}</p>
          ${region.biome ? `<p style="font-size:0.75rem;color:var(--text-secondary)">Biome: ${region.biome}</p>` : ''}
          ${isCurrent ? '<span style="color:var(--accent-gold);font-size:0.8rem">📍 You are here</span>' : ''}
        </div>
      `;
        })
        .join('');

    this.container.querySelectorAll('.map-region').forEach((el) => {
      el.addEventListener('click', () => {
        const regionId = (el as HTMLElement).dataset.region!;
        this.onTravel?.(regionId);
      });
    });
  }
}
