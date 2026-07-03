import { loadGameData } from './systems/dataLoader.js';
import { createDefaultSave, loadSave, hasSave } from './systems/saveSystem.js';
import { Game } from './game.js';

let game = null;

async function init() {
  const continueBtn = document.getElementById('btn-continue');
  if (hasSave()) {
    continueBtn.style.display = 'inline-block';
  } else {
    continueBtn.style.display = 'none';
  }

  document.getElementById('btn-new-game').addEventListener('click', () => startGame(false));
  document.getElementById('btn-continue').addEventListener('click', () => startGame(true));
}

async function startGame(continuing) {
  const gameData = await loadGameData();
  const state = continuing ? loadSave() : createDefaultSave();
  if (!state) {
    alert('Could not load save. Starting new expedition.');
    return startGame(false);
  }

  document.getElementById('title-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');

  const canvas = document.getElementById('game-canvas');
  game = new Game(canvas, gameData, state, {});
  game.start();

  if (!continuing) {
    game.showToast('Welcome, Explorer-Archivist! Your Lifeling companion Relic is ready. Visit regions from the museum to begin.');
  } else {
    game.showToast('Expedition resumed. Welcome back to the Archive of Life.');
  }
}

init();
