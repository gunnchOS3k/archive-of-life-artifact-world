import { Player, type Bounds } from './player';
import { Lifeling } from './companion';
import { World } from './world';
import { collectArtifact, hasArtifact, formatArtifactType } from '@/systems/artifactSystem';
import { visitRegion, checkQuestProgress } from '@/systems/questSystem';
import { saveGame } from '@/systems/saveSystem';
import { FossilExcavation } from '@/minigames/fossilExcavation';
import { WildlifeObservation } from '@/minigames/wildlifeObservation';
import { ArchiveDexUI } from '@/ui/archiveDexUI';
import { ArchiveDexService } from '@/services/ArchiveDexService';
import { NotebookUI } from '@/ui/notebookUI';
import { MapUI } from '@/ui/mapUI';
import { CompanionUI } from '@/ui/companionUI';
import { QuestUI } from '@/ui/questUI';
import { EarthLayerUI } from '@/ui/earthLayerUI';
import { TimeAtlasUI } from '@/ui/timeAtlasUI';
import { CoverageDashboardUI } from '@/ui/coverageDashboardUI';
import { ImplementationStatusUI } from '@/ui/implementationStatusUI';
import {
  DataCatalogService,
  toPlayableSpecies,
  type PlayableSpecies,
} from '@/services/DataCatalogService';
import { EarthLayerService } from '@/services/EarthLayerService';
import { TimeAtlasService } from '@/time/TimeAtlasService';
import type { SaveState } from '@/schema';

type Minigame = FossilExcavation | WildlifeObservation;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private catalog: DataCatalogService;
  state: SaveState;
  private player: Player;
  private lifeling = new Lifeling();
  private world: World;
  private keys: Record<string, boolean> = {};
  private running = false;
  private paused = false;
  private lastTime = 0;
  private nearestInteractable: ReturnType<World['getNearestInteractable']> = null;
  private activeMinigame: Minigame | null = null;
  private bounds: Bounds = { width: 800, height: 600 };
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private speciesById = new Map<string, PlayableSpecies>();

  private archiveDexUI: ArchiveDexUI;
  private notebookUI: NotebookUI;
  private mapUI: MapUI;
  private companionUI: CompanionUI;
  private questUI: QuestUI;
  private earthLayerUI: EarthLayerUI;
  private timeAtlasUI: TimeAtlasUI;
  private coverageDashboardUI: CoverageDashboardUI;
  private implementationStatusUI: ImplementationStatusUI;
  private devMode: boolean;

  private dexService: ArchiveDexService;

  constructor(
    canvas: HTMLCanvasElement,
    catalog: DataCatalogService,
    earthService: EarthLayerService,
    timeService: TimeAtlasService,
    dexService: ArchiveDexService,
    state: SaveState
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.catalog = catalog;
    this.dexService = dexService;
    this.state = state;

    const config = catalog.getConfig();
    this.player = new Player(state.player.x, state.player.y);
    this.world = new World(config.regions, this.speciesById);

    this.archiveDexUI = new ArchiveDexUI(document.getElementById('panel-archive')!, dexService, catalog);
    this.notebookUI = new NotebookUI(document.getElementById('panel-notebook')!);
    this.mapUI = new MapUI(document.getElementById('panel-map')!);
    this.companionUI = new CompanionUI(document.getElementById('panel-companion')!);
    this.questUI = new QuestUI(document.getElementById('panel-quests')!);
    this.earthLayerUI = new EarthLayerUI(
      document.getElementById('panel-earth')!,
      earthService,
      catalog
    );
    this.timeAtlasUI = new TimeAtlasUI(
      document.getElementById('panel-time')!,
      timeService,
      catalog
    );
    this.coverageDashboardUI = new CoverageDashboardUI(
      document.getElementById('panel-coverage')!,
      catalog
    );
    this.implementationStatusUI = new ImplementationStatusUI(
      document.getElementById('panel-implementation')!
    );
    this.devMode = new URLSearchParams(window.location.search).has('dev');

    this.earthLayerUI.onTabViewed = () => {
      this.onEarthLayerProgress();
    };

    this.companionUI.setEmoteCallback((emote) => this.lifeling.triggerReaction(emote));
    this.companionUI.onChange = () => this.save();
    this.mapUI.onTravel = (regionId) => void this.travelToRegion(regionId);

    this.setupInput();
    void this.loadRegion(state.player.currentRegion);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize() {
    const parent = this.canvas.parentElement!;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
    this.bounds = { width: this.canvas.width, height: this.canvas.height };
  }

  private setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      if (this.activeMinigame) return;
      if (this.isPanelOpen()) return;
      if (e.key === 'e' || e.key === 'E') void this.interact();
      if (e.key === 'a' || e.key === 'A') this.togglePanel('archive');
      if (e.key === 'n' || e.key === 'N') this.togglePanel('notebook');
      if (e.key === 'm' || e.key === 'M') this.togglePanel('map');
      if (e.key === 'c' || e.key === 'C') this.togglePanel('companion');
      if (e.key === 'q' || e.key === 'Q') this.togglePanel('quests');
      if (e.key === 't' || e.key === 'T') this.togglePanel('earth');
      if (e.key === 'y' || e.key === 'Y') this.togglePanel('time');
      if (this.devMode && (e.key === 'g' || e.key === 'G')) this.togglePanel('coverage');
      if (this.devMode && (e.key === 'i' || e.key === 'I')) this.togglePanel('implementation');
      if (e.key === 'Escape') this.closeAllPanels();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });

    document.querySelectorAll('.panel-close').forEach((btn) => {
      btn.addEventListener('click', () => this.closeAllPanels());
    });

    document.getElementById('btn-archive')!.addEventListener('click', () => this.togglePanel('archive'));
    document.getElementById('btn-notebook')!.addEventListener('click', () => this.togglePanel('notebook'));
    document.getElementById('btn-map')!.addEventListener('click', () => this.togglePanel('map'));
    document.getElementById('btn-companion')!.addEventListener('click', () => this.togglePanel('companion'));
    document.getElementById('btn-quests')!.addEventListener('click', () => this.togglePanel('quests'));
    document.getElementById('btn-earth')!.addEventListener('click', () => this.togglePanel('earth'));
    document.getElementById('btn-time')!.addEventListener('click', () => this.togglePanel('time'));

    document.getElementById('fossil-cancel')!.addEventListener('click', () => this.endMinigame());
    document.getElementById('observe-cancel')!.addEventListener('click', () => this.endMinigame());
    document.getElementById('observe-hold')!.addEventListener('mousedown', () => {
      if (this.activeMinigame instanceof WildlifeObservation) this.activeMinigame.holding = true;
    });
    document.getElementById('observe-hold')!.addEventListener('mouseup', () => {
      if (this.activeMinigame instanceof WildlifeObservation) this.activeMinigame.holding = false;
    });
  }

  private isPanelOpen() {
    return document.querySelector('.panel:not(.hidden)') !== null;
  }

  private togglePanel(name: string) {
    const panel = document.getElementById(`panel-${name}`)!;
    const isOpen = !panel.classList.contains('hidden');
    this.closeAllPanels();
    if (!isOpen) {
      panel.classList.remove('hidden');
      if (name === 'earth') {
        this.earthLayerUI.open(this.state.player.currentRegion);
      }
      if (name === 'time') {
        this.timeAtlasUI.open();
      }
      if (name === 'coverage') {
        void this.coverageDashboardUI.open();
      }
      if (name === 'implementation') {
        void this.implementationStatusUI.open();
      }
      this.refreshUI();
      this.paused = true;
    } else {
      this.paused = false;
    }
  }

  closeAllPanels() {
    document.querySelectorAll('.panel').forEach((p) => p.classList.add('hidden'));
    this.paused = false;
  }

  refreshUI() {
    const config = this.catalog.getConfig();
    const index = this.catalog.getSearchIndex().entries;
    this.archiveDexUI.setData(this.state);
    this.notebookUI.setData(this.state);
    this.mapUI.setData(config.regions, this.state);
    this.companionUI.setData(this.state, config.traits);
    this.questUI.setData(this.state, config.quests, index);
    this.earthLayerUI.setData(this.state, this.state.player.currentRegion);
    this.timeAtlasUI.setData(this.state);
  }

  private onEarthLayerProgress() {
    const index = this.catalog.getSearchIndex().entries;
    const questUpdates = checkQuestProgress(this.state, this.catalog.getConfig().quests, index);
    for (const update of questUpdates) {
      if (update.completed) this.showToast(`Quest complete: ${update.quest.title}!`);
    }
    this.save();
    this.questUI.setData(this.state, this.catalog.getConfig().quests, index);
  }

  private async loadRegion(regionId: string) {
    visitRegion(this.state, regionId);
    const species = await this.catalog.loadActiveRegion(regionId);
    this.speciesById.clear();
    for (const sp of species) {
      this.speciesById.set(sp.id, toPlayableSpecies(sp));
    }
    this.world.updateSpeciesMap(this.speciesById);
    this.world.loadRegion(regionId);
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.state.player.x = this.player.x;
    this.state.player.y = this.player.y;

    const region = this.catalog.getConfig().regions.find((r) => r.id === regionId);
    document.getElementById('region-name')!.textContent = region?.name ?? regionId;
    this.save();
  }

  private async travelToRegion(regionId: string) {
    const config = this.catalog.getConfig();
    const current = config.regions.find((r) => r.id === this.state.player.currentRegion);
    const target = config.regions.find((r) => r.id === regionId);
    if (!target) return;

    const canTravel =
      current?.type === 'hub' ||
      current?.connections?.includes(regionId) ||
      target.type === 'hub' ||
      regionId === 'museum';
    if (!canTravel && this.state.player.currentRegion !== 'museum') {
      this.showToast('Return to the museum hub to travel to distant regions.');
      return;
    }

    this.closeAllPanels();
    await this.loadRegion(regionId);
    this.showToast(`Traveled to ${target.name}`);
  }

  private async interact() {
    if (!this.nearestInteractable) return;
    const item = this.nearestInteractable;

    if (item.type === 'portal') {
      await this.travelToRegion(item.target);
      return;
    }

    if (item.type === 'earth_console') {
      if (item.id === 'coverage_dashboard') {
        this.togglePanel('coverage');
      } else if (item.id === 'implementation_status') {
        this.togglePanel('implementation');
      } else {
        this.togglePanel('earth');
      }
      return;
    }

    if (item.type === 'time_atlas') {
      this.togglePanel('time');
      return;
    }

    if (item.type === 'fossil' || item.type === 'species') {
      if (hasArtifact(this.state, item.speciesId)) {
        this.showToast(`Already documented ${item.species.commonName}.`);
        return;
      }
      if (item.type === 'fossil') this.startFossilMinigame(item.species);
      else this.startObservationMinigame(item.species);
    }
  }

  private startFossilMinigame(species: PlayableSpecies) {
    this.paused = true;
    document.getElementById('minigame-fossil')!.classList.remove('hidden');
    const canvas = document.getElementById('fossil-canvas') as HTMLCanvasElement;
    this.activeMinigame = new FossilExcavation(canvas, () => this.onMinigameComplete(species), () => this.endMinigame());
  }

  private startObservationMinigame(species: PlayableSpecies) {
    this.paused = true;
    document.getElementById('minigame-observe')!.classList.remove('hidden');
    document.getElementById('observe-species-name')!.textContent =
      `Observe: ${species.commonName} (${species.scientificName})`;
    const canvas = document.getElementById('observe-canvas') as HTMLCanvasElement;
    this.activeMinigame = new WildlifeObservation(canvas, species, () => this.onMinigameComplete(species), () => this.endMinigame());
  }

  private async onMinigameComplete(species: PlayableSpecies) {
    const traits = this.catalog.getConfig().traits;
    const result = collectArtifact(this.state, species, traits);
    if (result.success) {
      this.lifeling.triggerReaction('celebrate');
      this.state.companion.bond = Math.min(100, this.state.companion.bond + 5);
      const entry = await this.dexService.getEntryById(species.id, this.state);
      if (entry) {
        await this.archiveDexUI.showUnlockModal(entry, result.artifact);
      } else {
        this.showToast(`Artifact collected: ${formatArtifactType(result.artifact.artifactType)} from ${species.commonName}!`);
      }

      const index = this.catalog.getSearchIndex().entries;
      const questUpdates = checkQuestProgress(this.state, this.catalog.getConfig().quests, index);
      for (const update of questUpdates) {
        if (update.completed) this.showToast(`Quest complete: ${update.quest.title}!`);
      }
      this.save();
      this.refreshUI();
    }
    setTimeout(() => this.endMinigame(), 500);
  }

  private endMinigame() {
    this.activeMinigame?.destroy();
    this.activeMinigame = null;
    document.getElementById('minigame-fossil')!.classList.add('hidden');
    document.getElementById('minigame-observe')!.classList.add('hidden');
    this.paused = false;
  }

  showToast(message: string) {
    const toast = document.getElementById('toast')!;
    toast.textContent = message;
    toast.classList.remove('hidden');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
  }

  save() {
    this.state.player.x = this.player.x;
    this.state.player.y = this.player.y;
    saveGame(this.state);
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(timestamp: number) {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (!this.paused) this.update(dt);
    this.render();

    if (this.activeMinigame) {
      if ('update' in this.activeMinigame && this.activeMinigame.update) this.activeMinigame.update(dt);
      this.activeMinigame.draw();

      if (this.activeMinigame instanceof FossilExcavation) {
        const { progress } = this.activeMinigame.getProgress();
        (document.getElementById('fossil-progress-fill') as HTMLElement).style.width = `${progress}%`;
        document.getElementById('fossil-progress-text')!.textContent = `${Math.round(progress)}%`;
      }
      if (this.activeMinigame instanceof WildlifeObservation) {
        const p = this.activeMinigame.getPatience();
        (document.getElementById('observe-patience-fill') as HTMLElement).style.width = `${p}%`;
        document.getElementById('observe-patience-text')!.textContent = `Patience: ${Math.round(p)}%`;
      }
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number) {
    this.player.update(dt, this.keys, this.bounds);
    this.lifeling.update(dt, this.player.x, this.player.y, this.state.companion);

    this.nearestInteractable = this.world.getNearestInteractable(this.player.x, this.player.y);
    const prompt = document.getElementById('interaction-prompt')!;
    const promptText = document.getElementById('prompt-text')!;

    if (this.nearestInteractable) {
      prompt.classList.remove('hidden');
      const item = this.nearestInteractable;
      if (item.type === 'portal') promptText.textContent = `Press E — Travel to ${item.label}`;
      else if (item.type === 'earth_console') promptText.textContent = `Press E — Open ${item.label}`;
      else if (item.type === 'time_atlas') promptText.textContent = `Press E — Open ${item.label}`;
      else if (item.type === 'fossil') promptText.textContent = `Press E — Excavate ${item.species.commonName} fossil`;
      else promptText.textContent = `Press E — Observe ${item.species.commonName}`;
    } else {
      prompt.classList.add('hidden');
    }
  }

  private render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.world.draw(this.ctx, w, h);
    this.lifeling.draw(this.ctx, this.state.companion);
    this.player.draw(this.ctx);
    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.font = '11px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('WASD/Arrows: Move | E: Interact | A/N/M/C/Q/T/Y: Menus', 10, h - 10);
  }
}
