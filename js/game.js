import { Player } from './player.js';
import { Lifeling } from './companion.js';
import { World } from './world.js';
import { collectArtifact, hasArtifact, formatArtifactType } from './systems/artifactSystem.js';
import { visitRegion, checkQuestProgress } from './systems/questSystem.js';
import { saveGame } from './systems/saveSystem.js';
import { FossilExcavation } from './minigames/fossilExcavation.js';
import { WildlifeObservation } from './minigames/wildlifeObservation.js';
import { ArchiveUI } from './ui/archiveUI.js';
import { NotebookUI } from './ui/notebookUI.js';
import { MapUI } from './ui/mapUI.js';
import { CompanionUI } from './ui/companionUI.js';
import { QuestUI } from './ui/questUI.js';

export class Game {
  constructor(canvas, gameData, state, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gameData = gameData;
    this.state = state;
    this.ui = ui;

    this.player = new Player(state.player.x, state.player.y);
    this.lifeling = new Lifeling();
    this.world = new World(gameData);
    this.keys = {};
    this.running = false;
    this.paused = false;
    this.lastTime = 0;
    this.nearestInteractable = null;
    this.activeMinigame = null;
    this.pendingSpecies = null;

    this.archiveUI = new ArchiveUI(document.getElementById('panel-archive'));
    this.notebookUI = new NotebookUI(document.getElementById('panel-notebook'));
    this.mapUI = new MapUI(document.getElementById('panel-map'));
    this.companionUI = new CompanionUI(document.getElementById('panel-companion'));
    this.questUI = new QuestUI(document.getElementById('panel-quests'));

    this.companionUI.setEmoteCallback((emote) => this.lifeling.triggerReaction(emote));
    this.companionUI.onChange = () => this.save();
    this.mapUI.onTravel = (regionId) => this.travelToRegion(regionId);

    this.setupInput();
    this.loadRegion(state.player.currentRegion);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
    this.bounds = { width: this.canvas.width, height: this.canvas.height };
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;

      if (this.activeMinigame) return;
      if (this.isPanelOpen()) return;

      if (e.key === 'e' || e.key === 'E') this.interact();
      if (e.key === 'a' || e.key === 'A') this.togglePanel('archive');
      if (e.key === 'n' || e.key === 'N') this.togglePanel('notebook');
      if (e.key === 'm' || e.key === 'M') this.togglePanel('map');
      if (e.key === 'c' || e.key === 'C') this.togglePanel('companion');
      if (e.key === 'q' || e.key === 'Q') this.togglePanel('quests');
      if (e.key === 'Escape') this.closeAllPanels();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });

    document.querySelectorAll('.panel-close').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllPanels());
    });

    document.getElementById('btn-archive').addEventListener('click', () => this.togglePanel('archive'));
    document.getElementById('btn-notebook').addEventListener('click', () => this.togglePanel('notebook'));
    document.getElementById('btn-map').addEventListener('click', () => this.togglePanel('map'));
    document.getElementById('btn-companion').addEventListener('click', () => this.togglePanel('companion'));
    document.getElementById('btn-quests').addEventListener('click', () => this.togglePanel('quests'));

    document.getElementById('fossil-cancel').addEventListener('click', () => this.endMinigame());
    document.getElementById('observe-cancel').addEventListener('click', () => this.endMinigame());
    document.getElementById('observe-hold').addEventListener('mousedown', () => {
      if (this.activeMinigame?.holding !== undefined) this.activeMinigame.holding = true;
    });
    document.getElementById('observe-hold').addEventListener('mouseup', () => {
      if (this.activeMinigame?.holding !== undefined) this.activeMinigame.holding = false;
    });
  }

  isPanelOpen() {
    return document.querySelector('.panel:not(.hidden)') !== null;
  }

  togglePanel(name) {
    const panel = document.getElementById(`panel-${name}`);
    const isOpen = !panel.classList.contains('hidden');
    this.closeAllPanels();
    if (!isOpen) {
      panel.classList.remove('hidden');
      this.refreshUI();
      this.paused = true;
    } else {
      this.paused = false;
    }
  }

  closeAllPanels() {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    this.paused = false;
  }

  refreshUI() {
    this.archiveUI.setData(this.gameData, this.state);
    this.notebookUI.setData(this.state);
    this.mapUI.setData(this.gameData, this.state);
    this.companionUI.setData(this.gameData, this.state);
    this.questUI.setData(this.gameData, this.state);
  }

  loadRegion(regionId) {
    visitRegion(this.state, regionId);
    this.world.loadRegion(regionId);
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height / 2;
    this.state.player.x = this.player.x;
    this.state.player.y = this.player.y;

    const region = this.gameData.regions.find(r => r.id === regionId);
    document.getElementById('region-name').textContent = region?.name || regionId;
    this.save();
  }

  travelToRegion(regionId) {
    const current = this.gameData.regions.find(r => r.id === this.state.player.currentRegion);
    const target = this.gameData.regions.find(r => r.id === regionId);
    if (!target) return;

    const canTravel = current?.type === 'hub' || current?.connections?.includes(regionId) || target.type === 'hub' || regionId === 'museum';
    if (!canTravel && this.state.player.currentRegion !== 'museum') {
      this.showToast('Return to the museum hub to travel to distant regions.');
      return;
    }

    this.closeAllPanels();
    this.loadRegion(regionId);
    this.showToast(`Traveled to ${target.name}`);
  }

  interact() {
    if (!this.nearestInteractable) return;
    const item = this.nearestInteractable;

    if (item.type === 'portal') {
      this.travelToRegion(item.target);
      return;
    }

    if (item.type === 'fossil') {
      if (hasArtifact(this.state, item.speciesId)) {
        this.showToast(`Already documented ${item.species.commonName}.`);
        return;
      }
      this.startFossilMinigame(item.species);
      return;
    }

    if (item.type === 'species') {
      if (hasArtifact(this.state, item.speciesId)) {
        this.showToast(`Already documented ${item.species.commonName}.`);
        return;
      }
      this.startObservationMinigame(item.species);
    }
  }

  startFossilMinigame(species) {
    this.pendingSpecies = species;
    this.paused = true;
    const overlay = document.getElementById('minigame-fossil');
    overlay.classList.remove('hidden');
    const canvas = document.getElementById('fossil-canvas');

    this.activeMinigame = new FossilExcavation(
      canvas,
      () => this.onMinigameComplete(species),
      () => this.endMinigame()
    );
  }

  startObservationMinigame(species) {
    this.pendingSpecies = species;
    this.paused = true;
    const overlay = document.getElementById('minigame-observe');
    overlay.classList.remove('hidden');
    document.getElementById('observe-species-name').textContent =
      `Observe: ${species.commonName} (${species.scientificName})`;

    const canvas = document.getElementById('observe-canvas');
    this.activeMinigame = new WildlifeObservation(
      canvas,
      species,
      () => this.onMinigameComplete(species),
      () => this.endMinigame()
    );
  }

  onMinigameComplete(species) {
    const result = collectArtifact(this.state, species, this.gameData);
    if (result.success) {
      this.lifeling.triggerReaction('celebrate');
      this.state.companion.bond = Math.min(100, this.state.companion.bond + 5);
      this.showToast(`Artifact collected: ${formatArtifactType(result.artifact.artifactType)} from ${species.commonName}!`);

      const questUpdates = checkQuestProgress(this.state, this.gameData);
      for (const update of questUpdates) {
        if (update.completed) {
          this.showToast(`Quest complete: ${update.quest.title}!`);
        }
      }
      this.save();
      this.refreshUI();
    }
    setTimeout(() => this.endMinigame(), 500);
  }

  endMinigame() {
    if (this.activeMinigame) {
      this.activeMinigame.destroy();
      this.activeMinigame = null;
    }
    document.getElementById('minigame-fossil').classList.add('hidden');
    document.getElementById('minigame-observe').classList.add('hidden');
    this.pendingSpecies = null;
    this.paused = false;
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
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

  loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (!this.paused) {
      this.update(dt);
    }
    this.render();

    if (this.activeMinigame) {
      if (this.activeMinigame.update) this.activeMinigame.update(dt);
      if (this.activeMinigame.draw) this.activeMinigame.draw();

      if (this.activeMinigame.getProgress) {
        const { progress } = this.activeMinigame.getProgress();
        document.getElementById('fossil-progress-fill').style.width = `${progress}%`;
        document.getElementById('fossil-progress-text').textContent = `${Math.round(progress)}%`;
      }
      if (this.activeMinigame.getPatience) {
        const p = this.activeMinigame.getPatience();
        document.getElementById('observe-patience-fill').style.width = `${p}%`;
        document.getElementById('observe-patience-text').textContent = `Patience: ${Math.round(p)}%`;
      }
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.player.update(dt, this.keys, this.bounds);
    this.lifeling.update(dt, this.player.x, this.player.y, this.state.companion);

    this.nearestInteractable = this.world.getNearestInteractable(this.player.x, this.player.y);
    const prompt = document.getElementById('interaction-prompt');
    const promptText = document.getElementById('prompt-text');

    if (this.nearestInteractable) {
      prompt.classList.remove('hidden');
      const item = this.nearestInteractable;
      if (item.type === 'portal') {
        promptText.textContent = `Press E — Travel to ${item.label}`;
      } else if (item.type === 'fossil') {
        promptText.textContent = `Press E — Excavate ${item.species.commonName} fossil`;
      } else {
        promptText.textContent = `Press E — Observe ${item.species.commonName}`;
      }
    } else {
      prompt.classList.add('hidden');
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.world.draw(ctx, w, h);
    this.lifeling.draw(ctx, this.state.companion, this.gameData.traits);
    this.player.draw(ctx);

    // Controls hint
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WASD/Arrows: Move | E: Interact | A/N/M/C/Q: Menus', 10, h - 10);
  }
}
