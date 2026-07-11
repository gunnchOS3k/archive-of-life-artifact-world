import type { SaveState } from '@/schema';
import type { EarthLayerCategory, RegionEarthLayers } from '@/schema/earth';
import { EarthLayerService, EARTH_TAB_LABELS } from '@/services/EarthLayerService';
import type { DataCatalogService } from '@/services/DataCatalogService';

type TabChangeCallback = (tab: EarthLayerCategory, regionId: string) => void;

export class EarthLayerUI {
  private content: HTMLElement;
  private regionSelect: HTMLSelectElement;
  private tabs: HTMLElement;
  private mockBanner: HTMLElement;
  private earthService: EarthLayerService;
  private catalog: DataCatalogService;
  private state: SaveState | null = null;
  private activeTab: EarthLayerCategory = 'vegetation';
  private selectedRegion = 'museum';
  onTabViewed: TabChangeCallback | null = null;

  constructor(panel: HTMLElement, earthService: EarthLayerService, catalog: DataCatalogService) {
    this.earthService = earthService;
    this.catalog = catalog;
    this.content = panel.querySelector('#earth-layer-content')!;
    this.regionSelect = panel.querySelector('#earth-region-select') as HTMLSelectElement;
    this.tabs = panel.querySelector('#earth-layer-tabs')!;
    this.mockBanner = panel.querySelector('#earth-mock-banner')!;

    this.buildTabs();
    this.regionSelect.addEventListener('change', () => {
      this.selectedRegion = this.regionSelect.value;
      this.recordRegionAnalysis();
      this.renderTab();
    });
  }

  private buildTabs() {
    const manifest = this.earthService.getManifest();
    const metadataMode = this.earthService.getGlobalDataMode();
    const metadataLabel =
      metadataMode === 'real_metadata'
        ? 'REAL NASA METADATA'
        : metadataMode === 'cached_nasa_snapshot' || metadataMode === 'mixed'
          ? 'CACHED NASA SNAPSHOT'
          : 'METADATA FALLBACK';
    const regionalLabel =
      this.earthService.getRegionalDataMode() === 'source_verified'
        ? 'SOURCE-VERIFIED REGIONAL VALUES'
        : 'SAMPLE REGIONAL VALUES';
    this.mockBanner.innerHTML = `<span class="mock-badge earth-mode-badge">${regionalLabel}</span>
      Displayed measurements are ${regionalLabel === 'SAMPLE REGIONAL VALUES' ? 'illustrative and excluded from scientific coverage' : 'from approved source snapshots'}.
      <span class="earth-mode-badge">${metadataLabel}</span> describes discovery metadata only.`;

    this.tabs.innerHTML = manifest.layers
      .map(
        (layer) =>
          `<button class="earth-tab ${layer.id === this.activeTab ? 'active' : ''}" data-tab="${layer.id}">${EARTH_TAB_LABELS[layer.id]}</button>`
      )
      .join('');

    this.tabs.querySelectorAll('.earth-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = (btn as HTMLElement).dataset.tab as EarthLayerCategory;
        this.tabs.querySelectorAll('.earth-tab').forEach((t) => t.classList.remove('active'));
        btn.classList.add('active');
        this.recordTabView();
        this.renderTab();
      });
    });
  }

  setData(state: SaveState, currentRegion?: string) {
    this.state = state;
    if (currentRegion) this.selectedRegion = currentRegion;

    const regions = this.catalog.getConfig().regions;
    this.regionSelect.innerHTML = regions
      .map((r) => `<option value="${r.id}" ${r.id === this.selectedRegion ? 'selected' : ''}>${r.name}</option>`)
      .join('');

    this.renderTab();
  }

  open(currentRegion?: string) {
    if (currentRegion) this.selectedRegion = currentRegion;
    this.recordTabView();
    this.recordRegionAnalysis();
    this.setData(this.state!, currentRegion);
  }

  private recordTabView() {
    if (!this.state) return;
    if (!this.state.earthLayers.viewedTabs.includes(this.activeTab)) {
      this.state.earthLayers.viewedTabs.push(this.activeTab);
    }
    this.onTabViewed?.(this.activeTab, this.selectedRegion);
  }

  private recordRegionAnalysis() {
    if (!this.state) return;
    const key = `${this.selectedRegion}:${this.activeTab}`;
    if (!this.state.earthLayers.analyzedRegions.includes(key)) {
      this.state.earthLayers.analyzedRegions.push(key);
    }
    this.onTabViewed?.(this.activeTab, this.selectedRegion);
  }

  private async renderSpeciesDeps() {
    const region = this.catalog.getConfig().regions.find((r) => r.id === this.selectedRegion);
    if (!region) return '';
    const lines: string[] = [];
    for (const id of region.speciesIds.slice(0, 4)) {
      const sp = await this.catalog.getSpeciesDetail(id);
      if (!sp?.nasaLayerDependencies?.length) continue;
      const deps = sp.nasaLayerDependencies
        .filter((d) => d.layer === this.activeTab)
        .map((d) => `<li><strong>${sp.commonName}</strong>: ${d.reason}</li>`)
        .join('');
      if (deps) lines.push(deps);
    }
    return lines.length ? `<ul class="earth-metrics">${lines.join('')}</ul>` : '';
  }

  private renderTab() {
    const layers = this.earthService.getRegionLayers(this.selectedRegion);
    const def = this.earthService.getLayerDefinition(this.activeTab);

    if (!layers) {
      this.content.innerHTML = '<p>No Earth layer data for this region.</p>';
      return;
    }

    void this.renderSpeciesDeps().then((speciesDeps) => {
      const mode = this.earthService.getLayerDataMode(this.activeTab);
      const metadataMode = this.earthService.getLayerMetadataMode(this.activeTab);
      const cache = this.earthService.getMetadataCache();
      const layerMeta = cache?.layers?.find((l) => l.id === this.activeTab);
      this.content.innerHTML = `
      <div class="earth-layer-header">
        <h3>${def?.name ?? this.activeTab} <span class="earth-mode-badge">${mode}</span></h3>
        <p class="earth-layer-desc">${def?.description ?? ''}</p>
        <p class="earth-layer-source">Intended scientific product: ${def?.nasaProduct?.toUpperCase()} — ${def?.citation ?? 'NASA'}</p>
        <p class="earth-layer-source">Metadata: ${metadataMode}${layerMeta?.sourceUrl ? ` · <a href="${layerMeta.sourceUrl}" target="_blank" rel="noopener">API</a>` : ''}${cache?.generatedAt ? ` · Retrieved: ${cache.generatedAt}` : ''}. Metadata availability does not verify the regional values below.</p>
      </div>
      <div class="earth-layer-data">${this.renderLayerData(layers)}</div>
      ${speciesDeps ? `<div class="earth-species-deps"><h4>Species Environment Links</h4>${speciesDeps}</div>` : ''}
    `;
    });
  }

  private renderLayerData(layers: RegionEarthLayers): string {
    const data = layers[this.activeTab];
    if (!data) return '<p>No data.</p>';

    if (this.activeTab === 'vegetation') {
      const v = layers.vegetation;
      return `<ul class="earth-metrics">
        <li><strong>NDVI:</strong> ${v.ndvi} (${v.ndviLabel})</li>
        <li><strong>Trend:</strong> ${v.trend}</li>
        ${v.hlsSceneDate ? `<li><strong>HLS scene:</strong> ${v.hlsSceneDate}</li>` : ''}
        <li>${v.summary}</li>
      </ul>`;
    }
    if (this.activeTab === 'fire') {
      const f = layers.fire;
      return `<ul class="earth-metrics">
        <li><strong>Active fires:</strong> ${f.activeFires}</li>
        <li><strong>Recent burn scar:</strong> ${f.recentBurnScar ? 'Yes' : 'No'}</li>
        <li><strong>FIRMS source:</strong> ${f.firmsSource}</li>
        <li>${f.summary}</li>
      </ul>`;
    }
    if (this.activeTab === 'water') {
      const w = layers.water;
      return `<ul class="earth-metrics">
        <li><strong>Surface water:</strong> ${w.surfaceWaterPct}%</li>
        <li><strong>Wetland index:</strong> ${w.wetlandIndex}</li>
        ${w.precipitationMm != null ? `<li><strong>Precipitation:</strong> ${w.precipitationMm} mm</li>` : ''}
        <li>${w.summary}</li>
      </ul>`;
    }
    if (this.activeTab === 'forest_structure') {
      const fs = layers.forest_structure;
      return `<ul class="earth-metrics">
        <li><strong>Canopy height:</strong> ${fs.canopyHeightM} m</li>
        <li><strong>Canopy cover:</strong> ${fs.canopyCoverPct}%</li>
        <li>${fs.summary}</li>
      </ul>`;
    }
    if (this.activeTab === 'ocean_biology') {
      const o = layers.ocean_biology;
      return `<ul class="earth-metrics">
        <li><strong>Chlorophyll:</strong> ${o.chlorophyllMgM3} mg/m³</li>
        <li><strong>Productivity index:</strong> ${o.productivityIndex}</li>
        <li><strong>Bloom detected:</strong> ${o.bloomDetected ? 'Yes ✨' : 'No'}</li>
        ${o.seaSurfaceTempC != null ? `<li><strong>Sea surface temp:</strong> ${o.seaSurfaceTempC}°C</li>` : ''}
        <li>${o.summary}</li>
      </ul>`;
    }
    if (this.activeTab === 'heat_drought') {
      const h = layers.heat_drought;
      return `<ul class="earth-metrics">
        <li><strong>Land surface temp:</strong> ${h.landSurfaceTempC}°C</li>
        <li><strong>ET stress:</strong> ${h.evapotranspirationStress}</li>
        <li><strong>Drought index:</strong> ${h.droughtIndex}</li>
        <li><strong>ECOSTRESS alert:</strong> ${h.ecostressAlert ? 'Yes ⚠️' : 'No'}</li>
        <li>${h.summary}</li>
      </ul>`;
    }
    if (this.activeTab === 'natural_events') {
      const n = layers.natural_events;
      const events = n.activeEvents
        .map((e) => `<li><strong>${e.title}</strong> (${e.category}) — ${e.date}<br>${e.summary}</li>`)
        .join('');
      return `<p>${n.summary}</p><ul class="earth-metrics">${events || '<li>No active events</li>'}</ul>`;
    }
    if (this.activeTab === 'climate') {
      const c = layers.climate;
      return `<ul class="earth-metrics">
        <li><strong>Avg temp:</strong> ${c.avgTempC}°C</li>
        <li><strong>Humidity:</strong> ${c.humidityPct}%</li>
        ${c.solarRadiation != null ? `<li><strong>Solar radiation:</strong> ${c.solarRadiation} kWh/m²/day</li>` : ''}
        ${c.windSpeedMs != null ? `<li><strong>Wind:</strong> ${c.windSpeedMs} m/s</li>` : ''}
        <li><strong>POWER source:</strong> ${c.powerSource}</li>
        <li>${c.summary}</li>
      </ul>`;
    }
    return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
}
