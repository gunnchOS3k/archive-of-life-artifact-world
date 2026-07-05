import '../css/styles.css';
import { dataCatalog } from '@/services/DataCatalogService';
import { earthLayerService } from '@/services/EarthLayerService';
import { timeAtlasService } from '@/time/TimeAtlasService';
import { createDefaultSave, loadSave, hasSave } from '@/systems/saveSystem';
import { Game } from '@/game/Game';

let game: Game | null = null;

async function init() {
  const continueBtn = document.getElementById('btn-continue')!;
  continueBtn.style.display = hasSave() ? 'inline-block' : 'none';

  document.getElementById('btn-new-game')!.addEventListener('click', () => void startGame(false));
  document.getElementById('btn-continue')!.addEventListener('click', () => void startGame(true));
}

async function startGame(continuing: boolean) {
  await Promise.all([dataCatalog.initialize(), earthLayerService.initialize(), timeAtlasService.initialize()]);
  const state = continuing ? loadSave() : createDefaultSave();
  if (!state) {
    alert('Could not load save. Starting new expedition.');
    return startGame(false);
  }
  if (!state.earthLayers) {
    state.earthLayers = { viewedTabs: [], analyzedRegions: [] };
  }
  if (!state.timeAtlas) {
    state.timeAtlas = { viewedTimeUnits: [], viewedGates: [], analyzedPeriods: [] };
  }

  document.getElementById('title-screen')!.classList.remove('active');
  document.getElementById('game-screen')!.classList.add('active');

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  game = new Game(canvas, dataCatalog, earthLayerService, timeAtlasService, state);
  game.start();

  if (!continuing) {
    game.showToast(
      'Welcome, Explorer-Archivist! Your Lifeling companion Relic is ready. Visit regions from the museum to begin.'
    );
  } else {
    game.showToast('Expedition resumed. Welcome back to the Archive of Life.');
  }
}

init();
