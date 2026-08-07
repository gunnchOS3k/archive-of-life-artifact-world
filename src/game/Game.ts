import { Player, type Bounds } from './player';
import { Lifeling } from './companion';
import { World } from './world';
import { collectArtifact, hasArtifact, formatArtifactType, getCollectedIds } from '@/systems/artifactSystem';
import { visitRegion, checkQuestProgress } from '@/systems/questSystem';
import { saveGame } from '@/systems/saveSystem';
import {
  buildEncounterTable,
  describeEthicalPrompt,
  rollSoftEncounter,
  type EncounterTable,
} from '@/systems/encounterSystem';
import { ensureCompanionProgressFields } from '@/systems/companionProgression';
import { track } from '@/systems/telemetry';
import {
  applyAccessibilitySettings,
  loadAccessibilitySettings,
} from '@/systems/accessibility';
import {
  applyDeviceRole,
  resolveDeviceRole,
  type DeviceRoleProfile,
} from '@/device/deviceRoles';
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
import { SettingsUI } from '@/ui/settingsUI';
import {
  DataCatalogService,
  toPlayableSpecies,
  type PlayableSpecies,
} from '@/services/DataCatalogService';
import { EarthLayerService } from '@/services/EarthLayerService';
import { TemporalMapService } from '@/services/TemporalMapService';
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
  private encounterTable: EncounterTable | null = null;
  private softEncounterCooldown = 0;
  private deviceRole: DeviceRoleProfile;

  private archiveDexUI: ArchiveDexUI;
  private notebookUI: NotebookUI;
  private mapUI: MapUI;
  private companionUI: CompanionUI;
  private questUI: QuestUI;
  private earthLayerUI: EarthLayerUI;
  private timeAtlasUI: TimeAtlasUI;
  private coverageDashboardUI: CoverageDashboardUI;
  private implementationStatusUI: ImplementationStatusUI;
  private settingsUI: SettingsUI;
  private devMode: boolean;

  private dexService: ArchiveDexService;

  constructor(
    canvas: HTMLCanvasElement,
    catalog: DataCatalogService,
    earthService: EarthLayerService,
    timeService: TimeAtlasService,
    temporalMapService: TemporalMapService,
    dexService: ArchiveDexService,
    state: SaveState
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.catalog = catalog;
    this.dexService = dexService;
    this.state = state;
    ensureCompanionProgressFields(this.state.companion);
    if (!this.state.timeAtlas) {
      this.state.timeAtlas = {
        viewedTimeUnits: [],
        viewedGates: [],
        analyzedPeriods: [],
        activeTimeUnitId: null,
      };
    }

    const config = catalog.getConfig();
    this.player = new Player(state.player.x, state.player.y);
    this.world = new World(config.regions, this.speciesById);

    this.deviceRole = resolveDeviceRole(
      null,
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null,
    );
    applyDeviceRole(this.deviceRole);
    applyAccessibilitySettings(loadAccessibilitySettings());

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
      temporalMapService,
      catalog
    );
    this.coverageDashboardUI = new CoverageDashboardUI(
      document.getElementById('panel-coverage')!,
      catalog
    );
    this.implementationStatusUI = new ImplementationStatusUI(
      document.getElementById('panel-implementation')!
    );
    this.settingsUI = new SettingsUI(document.getElementById('panel-settings')!, this.deviceRole);
    this.settingsUI.onRoleChange = (role) => {
      this.deviceRole = role;
      this.resize();
    };
    this.devMode = new URLSearchParams(window.location.search).has('dev');

    this.earthLayerUI.onTabViewed = () => {
      this.onEarthLayerProgress();
    };

    this.timeAtlasUI.onActivePeriodChange = (unitId) => {
      this.state.timeAtlas.activeTimeUnitId = unitId;
      track('time_period_filter', { unitId: unitId ?? 'none' });
      this.rebuildEncounterTable();
      this.save();
      this.showToast(
        unitId
          ? `Time filter: ${unitId} — encounters use provenanced taxa for this period.`
          : 'Time filter cleared.',
      );
    };

    this.companionUI.setEmoteCallback((emote) => this.lifeling.triggerReaction(emote));
    this.companionUI.onChange = () => this.save();
    this.mapUI.onTravel = (regionId) => void this.travelToRegion(regionId);

    this.setupInput();
    void this.loadRegion(state.player.currentRegion);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    track('game_start', { role: this.deviceRole.id, region: state.player.currentRegion });
  }

  private resize() {
    const parent = this.canvas.parentElement!;
    const scale = this.deviceRole.worldScaleFactor || 1;
    // World scale from device role matrix — layout still fills parent; factor affects HUD density cue.
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
    this.canvas.style.setProperty('--aol-world-scale', String(scale));
    document.documentElement.classList.toggle('device-peripheral-only', this.deviceRole.peripheralOnly);
    document.documentElement.classList.toggle('device-dual-pane', this.deviceRole.dualPane);
  }

  private setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      if (this.activeMinigame) return;
      if (this.isPanelOpen()) {
        if (e.key === 'Escape') this.closeAllPanels();
        return;
      }
      if (e.key === 'e' || e.key === 'E') void this.interact();
      // Panel shortcuts use digit keys so WASD movement is never swallowed.
      if (e.key === '1') this.togglePanel('archive');
      if (e.key === '2') this.togglePanel('notebook');
      if (e.key === '3') this.togglePanel('map');
      if (e.key === '4') this.togglePanel('companion');
      if (e.key === '5') this.togglePanel('quests');
      if (e.key === '6') this.togglePanel('earth');
      if (e.key === '7') this.togglePanel('time');
      if (e.key === '8' || e.key === ',') this.togglePanel('settings');
      if (this.devMode && (e.key === 'g' || e.key === 'G')) this.togglePanel('coverage');
      if (this.devMode && (e.key === 'i' || e.key === 'I')) this.togglePanel('implementation');
      if (e.key === 'Escape') this.closeAllPanels();
      // Edge I/O rings: digit 0 cycles soft encounter accept when peripheral-only
      if (this.deviceRole.input === 'ring_select' && (e.key === '0' || e.key === 'Enter')) {
        void this.acceptSoftEncounterPrompt();
      }
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
    document.getElementById('btn-settings')?.addEventListener('click', () => this.togglePanel('settings'));

    document.getElementById('fossil-cancel')!.addEventListener('click', () => this.endMinigame());
    document.getElementById('observe-cancel')!.addEventListener('click', () => this.endMinigame());
    document.getElementById('observe-hold')!.addEventListener('mousedown', () => {
      if (this.activeMinigame instanceof WildlifeObservation) this.activeMinigame.holding = true;
    });
    document.getElementById('observe-hold')!.addEventListener('mouseup', () => {
      if (this.activeMinigame instanceof WildlifeObservation) this.activeMinigame.holding = false;
    });
    document.getElementById('observe-hold')!.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.activeMinigame instanceof WildlifeObservation) this.activeMinigame.holding = true;
    }, { passive: false });
    document.getElementById('observe-hold')!.addEventListener('touchend', () => {
      if (this.activeMinigame instanceof WildlifeObservation) this.activeMinigame.holding = false;
    });

    this.setupMobileTouch();
  }

  /** Canvas drag stick + tap-to-interact for Pixel / touch devices. */
  private touchPointerId: number | null = null;
  private touchOrigin: { x: number; y: number } | null = null;
  private touchMoved = false;

  private clearTouchKeys() {
    for (const k of ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const) {
      this.keys[k] = false;
    }
  }

  private applyTouchVector(dx: number, dy: number) {
    this.clearTouchKeys();
    const dead = 12;
    if (Math.hypot(dx, dy) < dead) return;
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx < 0) this.keys['a'] = true;
      else this.keys['d'] = true;
    } else {
      if (dy < 0) this.keys['w'] = true;
      else this.keys['s'] = true;
    }
    // diagonal assist
    if (Math.abs(dx) > dead && Math.abs(dy) > dead) {
      if (dx < 0) this.keys['a'] = true;
      else this.keys['d'] = true;
      if (dy < 0) this.keys['w'] = true;
      else this.keys['s'] = true;
    }
  }

  private canvasToWorld(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / Math.max(1, rect.width);
    const sy = this.canvas.height / Math.max(1, rect.height);
    const screenX = (clientX - rect.left) * sx;
    const screenY = (clientY - rect.top) * sy;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const maxCamX = Math.max(0, this.bounds.width - w);
    const maxCamY = Math.max(0, this.bounds.height - h);
    const camX = Math.min(maxCamX, Math.max(0, this.player.x - w / 2));
    const camY = Math.min(maxCamY, Math.max(0, this.player.y - h / 2));
    return { x: screenX + camX, y: screenY + camY };
  }

  private setupMobileTouch() {
    const onDown = (e: PointerEvent) => {
      if (this.paused || this.activeMinigame || this.isPanelOpen()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.touchPointerId = e.pointerId;
      this.touchOrigin = { x: e.clientX, y: e.clientY };
      this.touchMoved = false;
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (this.touchPointerId !== e.pointerId || !this.touchOrigin) return;
      const dx = e.clientX - this.touchOrigin.x;
      const dy = e.clientY - this.touchOrigin.y;
      if (Math.hypot(dx, dy) > 10) this.touchMoved = true;
      this.applyTouchVector(dx, dy);
    };
    const onUp = (e: PointerEvent) => {
      if (this.touchPointerId !== e.pointerId) return;
      const wasTap = !this.touchMoved && this.touchOrigin;
      this.touchPointerId = null;
      this.touchOrigin = null;
      this.clearTouchKeys();
      if (wasTap && !this.paused && !this.activeMinigame && !this.isPanelOpen()) {
        const world = this.canvasToWorld(e.clientX, e.clientY);
        const near = this.world.getNearestInteractable(world.x, world.y);
        if (near && Math.hypot(near.x - this.player.x, near.y - this.player.y) < 80) {
          void this.interact();
        } else if (near && Math.hypot(near.x - world.x, near.y - world.y) < 48) {
          // Tap portal / target: walk beside then interact next frame.
          this.player.x = near.x;
          this.player.y = near.y;
          this.state.player.x = near.x;
          this.state.player.y = near.y;
          this.nearestInteractable = near;
          void this.interact();
        }
      }
    };
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', onDown);
    this.canvas.addEventListener('pointermove', onMove);
    this.canvas.addEventListener('pointerup', onUp);
    this.canvas.addEventListener('pointercancel', onUp);
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
      track('panel_open', { panel: name });
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
      if (name === 'settings') {
        this.settingsUI.open();
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
    this.bounds = this.world.getWorldSize();
    this.player.x = this.bounds.width / 2;
    this.player.y = this.bounds.height / 2;
    this.state.player.x = this.player.x;
    this.state.player.y = this.player.y;
    this.rebuildEncounterTable();
    this.softEncounterCooldown = 4;

    const region = this.catalog.getConfig().regions.find((r) => r.id === regionId);
    document.getElementById('region-name')!.textContent = region?.name ?? regionId;
    track('region_travel', {
      region: regionId,
      biome: region?.biome ?? '',
      encounters: this.encounterTable?.candidates.length ?? 0,
    });
    this.save();
  }

  private rebuildEncounterTable() {
    const region = this.catalog.getConfig().regions.find((r) => r.id === this.state.player.currentRegion);
    if (!region || region.type === 'hub') {
      this.encounterTable = null;
      return;
    }
    this.encounterTable = buildEncounterTable({
      regionId: region.id,
      biome: region.biome,
      species: [...this.speciesById.values()],
      timePeriodId: this.state.timeAtlas?.activeTimeUnitId ?? null,
      collectedIds: getCollectedIds(this.state),
    });
  }

  private pendingSoftSpecies: PlayableSpecies | null = null;

  private trySoftEncounter() {
    if (!this.encounterTable || this.softEncounterCooldown > 0) return;
    if (this.state.player.currentRegion === 'museum') return;
    const roll = rollSoftEncounter(this.encounterTable, {
      collectedIds: getCollectedIds(this.state),
    });
    this.softEncounterCooldown = 8;
    if (roll.reason !== 'hit' || !roll.candidate) return;
    this.pendingSoftSpecies = roll.candidate.species;
    track('encounter_soft', {
      speciesId: roll.candidate.speciesId,
      ethical: roll.candidate.ethicalFlow,
    });
    this.showToast(`${describeEthicalPrompt(roll.candidate)} — Press E nearby or 0 (rings) to begin.`);
    // Place a temporary walk-up marker beside the player
    const sp = roll.candidate.species;
    const isFossil = roll.candidate.ethicalFlow === 'excavate';
    this.world.interactables.push({
      type: isFossil ? 'fossil' : 'species',
      speciesId: sp.id,
      species: sp,
      x: this.player.x + 48,
      y: this.player.y,
      radius: 28,
    });
  }

  private async acceptSoftEncounterPrompt() {
    if (!this.pendingSoftSpecies) return;
    const sp = this.pendingSoftSpecies;
    this.pendingSoftSpecies = null;
    if (hasArtifact(this.state, sp.id)) {
      this.showToast(`Already documented ${sp.commonName}.`);
      return;
    }
    if (sp.conservationStatus === 'Extinct') this.startFossilMinigame(sp);
    else this.startObservationMinigame(sp);
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
      track('encounter_walk_up', { speciesId: item.speciesId, type: item.type });
      if (item.type === 'fossil') this.startFossilMinigame(item.species);
      else this.startObservationMinigame(item.species);
    }
  }

  private startFossilMinigame(species: PlayableSpecies) {
    this.paused = true;
    track('excavate_start', { speciesId: species.id });
    document.getElementById('minigame-fossil')!.classList.remove('hidden');
    const canvas = document.getElementById('fossil-canvas') as HTMLCanvasElement;
    this.activeMinigame = new FossilExcavation(canvas, () => this.onMinigameComplete(species), () => this.endMinigame());
  }

  private startObservationMinigame(species: PlayableSpecies) {
    this.paused = true;
    track('observe_start', { speciesId: species.id });
    document.getElementById('minigame-observe')!.classList.remove('hidden');
    document.getElementById('observe-species-name')!.textContent =
      `Observe: ${species.commonName} (${species.scientificName})`;
    const canvas = document.getElementById('observe-canvas') as HTMLCanvasElement;
    this.activeMinigame = new WildlifeObservation(canvas, species, () => this.onMinigameComplete(species), () => this.endMinigame());
  }

  private async onMinigameComplete(species: PlayableSpecies) {
    const traits = this.catalog.getConfig().traits;
    const result = collectArtifact(this.state, species, traits, {
      timePeriodId: this.state.timeAtlas?.activeTimeUnitId ?? null,
    });
    if (result.success) {
      this.lifeling.triggerReaction('celebrate');
      const kind = species.conservationStatus === 'Extinct' ? 'excavate_complete' : 'observe_complete';
      track(kind, {
        speciesId: species.id,
        level: this.state.companion.level ?? 1,
        xp: this.state.companion.xp ?? 0,
      });
      if (result.progression?.leveledUp) {
        track('companion_level_up', {
          level: result.progression.level,
          from: result.progression.previousLevel,
        });
        this.showToast(`Lifeling grew to level ${result.progression.level}!`);
      }
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
      this.rebuildEncounterTable();
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

  /** Acceptance / Playwright helpers — movement + travel without fragile canvas coordinates. */
  async acceptTravel(regionId: string) {
    await this.travelToRegion(regionId);
  }

  acceptMoveBesideTarget(kind?: 'species' | 'fossil' | 'portal') {
    const targets = this.world.getInteractables().filter((item) => {
      if (!kind) return item.type === 'species' || item.type === 'fossil';
      return item.type === kind;
    });
    const target = targets[0];
    if (!target) return null;
    this.player.x = target.x;
    this.player.y = target.y;
    this.state.player.x = target.x;
    this.state.player.y = target.y;
    this.nearestInteractable = this.world.getNearestInteractable(this.player.x, this.player.y);
    return {
      type: target.type,
      id: 'speciesId' in target ? target.speciesId : target.id,
      label: 'label' in target ? target.label : ('species' in target ? target.species.commonName : 'unknown'),
    };
  }

  async acceptInteract() {
    await this.interact();
  }

  acceptSetMinigameHold(holding: boolean) {
    if (this.activeMinigame instanceof WildlifeObservation) {
      this.activeMinigame.holding = holding;
      return true;
    }
    return false;
  }

  acceptCompleteFossilMinigame() {
    if (this.activeMinigame instanceof FossilExcavation) {
      this.activeMinigame.acceptRevealComplete();
      return true;
    }
    return false;
  }

  acceptEquipTrait(traitId: string) {
    const traits = this.state.companion.unlockedTraits;
    if (!traits.includes(traitId)) traits.push(traitId);
    if (!this.state.companion.equippedTraits.includes(traitId)) {
      this.state.companion.equippedTraits.push(traitId);
    }
    this.save();
    this.refreshUI();
    return this.acceptSnapshot();
  }

  acceptSnapshot() {
    return {
      region: this.state.player.currentRegion,
      artifacts: this.state.artifacts.map((a) => a.speciesId),
      notebook: this.state.notebook?.length ?? 0,
      unlockedTraits: [...this.state.companion.unlockedTraits],
      equippedTraits: [...this.state.companion.equippedTraits],
      companionLevel: this.state.companion.level ?? 1,
      companionXp: this.state.companion.xp ?? 0,
      activeTimeUnitId: this.state.timeAtlas?.activeTimeUnitId ?? null,
      encounterCount: this.encounterTable?.candidates.length ?? 0,
      deviceRole: this.deviceRole.id,
      minigame: this.activeMinigame
        ? this.activeMinigame instanceof FossilExcavation
          ? 'fossil'
          : 'observe'
        : null,
    };
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
    this.player.update(dt, this.keys, this.bounds, this.world.getSolidObstacles());
    this.lifeling.update(dt, this.player.x, this.player.y, this.state.companion);

    if (this.softEncounterCooldown > 0) this.softEncounterCooldown -= dt;
    const moving = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(
      (k) => this.keys[k],
    );
    if (moving && !this.deviceRole.peripheralOnly) this.trySoftEncounter();

    this.nearestInteractable = this.world.getNearestInteractable(this.player.x, this.player.y);
    const prompt = document.getElementById('interaction-prompt')!;
    const promptText = document.getElementById('prompt-text')!;

    if (this.nearestInteractable) {
      prompt.classList.remove('hidden');
      const item = this.nearestInteractable;
      const coarse =
        this.deviceRole.touchPrimary ||
        (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches);
      const act = this.deviceRole.input === 'ring_select' ? 'Ring/0' : coarse ? 'Tap' : 'Press E';
      if (item.type === 'portal') promptText.textContent = `${act} — Travel to ${item.label}`;
      else if (item.type === 'earth_console') promptText.textContent = `${act} — Open ${item.label}`;
      else if (item.type === 'time_atlas') promptText.textContent = `${act} — Open ${item.label}`;
      else if (item.type === 'fossil') promptText.textContent = `${act} — Excavate ${item.species.commonName} fossil`;
      else promptText.textContent = `${act} — Observe ${item.species.commonName}`;
    } else {
      prompt.classList.add('hidden');
    }
  }

  private render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const maxCamX = Math.max(0, this.bounds.width - w);
    const maxCamY = Math.max(0, this.bounds.height - h);
    const camX = Math.min(maxCamX, Math.max(0, this.player.x - w / 2));
    const camY = Math.min(maxCamY, Math.max(0, this.player.y - h / 2));

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.save();
    this.ctx.translate(-camX, -camY);
    this.world.draw(this.ctx, this.bounds.width, this.bounds.height);
    this.lifeling.draw(this.ctx, this.state.companion);
    this.player.draw(this.ctx);
    this.ctx.restore();

    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.font = '11px sans-serif';
    this.ctx.textAlign = 'left';
    const coarse =
      this.deviceRole.touchPrimary ||
      (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches);
    if (this.deviceRole.peripheralOnly) {
      this.ctx.fillText('Edge rings: 0/Enter confirm · 8 settings · WASD optional', 10, h - 10);
    } else if (!coarse) {
      this.ctx.fillText('WASD/Arrows: Move | E: Interact | 1–7: Menus | 8: Settings', 10, h - 10);
    } else {
      this.ctx.fillText('Drag to move · Tap portals & nearby targets to interact', 10, h - 10);
    }
  }
}
