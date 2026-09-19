import type { SaveState, RegionBundle } from '@/schema';
import { hydrateLivingArchiveIcons, iconSpan, setEmotionalMode } from '@/ui/livingArchive';

export class MapUI {
  private container: HTMLElement;
  onTravel: ((regionId: string) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container.querySelector('#map-container')!;
  }

  setData(regions: RegionBundle[], state: SaveState) {
    setEmotionalMode('choose');
    const current = state.player.currentRegion;
    const eraId = state.timeAtlas?.activeTimeUnitId ?? null;
    const eraBanner = eraId
      ? `<div class="map-era-banner" role="status" data-era="${eraId}">${iconSpan('time')} Where you explore keeps Time Atlas context: <strong>${eraId}</strong></div>`
      : `<div class="map-era-banner map-era-none" role="status">${iconSpan('time')} Era filter unset — open Time Atlas when you want a period lens. Evidence rules stay unchanged.</div>`;

    this.container.innerHTML =
      eraBanner +
      `<p class="map-where-first">Choose an ecosystem plate. Science layers stay available after you arrive.</p>` +
      regions
        .map((region) => {
          const visited = state.player.visitedRegions.includes(region.id);
          const isCurrent = region.id === current;
          const isHub = region.type === 'hub';
          return `
        <div class="map-region ${isCurrent ? 'current' : ''} ${isHub ? 'hub' : ''}"
             data-region="${region.id}" style="opacity:${visited ? 1 : 0.6}">
          <div class="region-dot" style="background:${region.color}"></div>
          <strong>${iconSpan(isHub ? 'archive' : 'region')} ${region.name}</strong>
          <p style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.25rem">${region.description}</p>
          ${region.biome ? `<p class="map-biome-tag">${iconSpan('biome')} ${region.biome}</p>` : ''}
          ${isCurrent ? '<span class="map-here-chip">You are here</span>' : ''}
        </div>
      `;
        })
        .join('');

    void hydrateLivingArchiveIcons(this.container);

    this.container.querySelectorAll('.map-region').forEach((el) => {
      el.addEventListener('click', () => {
        const regionId = (el as HTMLElement).dataset.region!;
        this.onTravel?.(regionId);
      });
    });
  }
}
