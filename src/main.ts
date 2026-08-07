import '../css/styles.css';
import { dataCatalog } from '@/services/DataCatalogService';
import { earthLayerService } from '@/services/EarthLayerService';
import { ArchiveDexService } from '@/services/ArchiveDexService';
import { temporalMapService } from '@/services/TemporalMapService';
import { timeAtlasService } from '@/time/TimeAtlasService';
import { createDefaultSave, loadSave, loadSaveAsync, hasSave } from '@/systems/saveSystem';
import {
  applyAccessibilitySettings,
  loadAccessibilitySettings,
} from '@/systems/accessibility';
import { applyDeviceRole, resolveDeviceRole } from '@/device/deviceRoles';
import { track } from '@/systems/telemetry';
import { Game } from '@/game/Game';

let game: Game | null = null;
const archiveDexService = new ArchiveDexService(dataCatalog, timeAtlasService);

async function init() {
  const role = resolveDeviceRole(
    null,
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null,
  );
  applyDeviceRole(role);
  applyAccessibilitySettings(loadAccessibilitySettings());

  const continueBtn = document.getElementById('btn-continue')!;
  // Prefer sync hasSave; async backup may rehydrate continue after IDB check.
  continueBtn.style.display = hasSave() ? 'inline-block' : 'none';
  void loadSaveAsync().then((s) => {
    if (s) continueBtn.style.display = 'inline-block';
  });

  document.getElementById('btn-new-game')!.addEventListener('click', () => void startGame(false));
  document.getElementById('btn-continue')!.addEventListener('click', () => void startGame(true));

  // Internal RC acceptance hook (adb / AcceptNavReceiver).
  (window as unknown as {
    __aolStartExpedition?: (continuing?: boolean) => Promise<void>;
    __aolAccept?: (cmd: string, arg?: string) => Promise<unknown>;
  }).__aolStartExpedition = (continuing = false) => startGame(!!continuing);
  (window as unknown as { __aolAccept?: (cmd: string, arg?: string) => Promise<unknown> }).__aolAccept =
    async (cmd, arg) => {
      const g = (window as unknown as { __aolGame: Game | null }).__aolGame;
      if (cmd === 'start') return startGame(arg === 'continue');
      if (!g) return { ok: false, error: 'no_game' };
      if (cmd === 'travel' && arg) {
        await g.acceptTravel(arg);
        return g.acceptSnapshot();
      }
      if (cmd === 'move' || cmd === 'move_beside') {
        return { ok: true, target: g.acceptMoveBesideTarget(arg as 'species' | 'fossil' | 'portal' | undefined), snapshot: g.acceptSnapshot() };
      }
      if (cmd === 'interact') {
        await g.acceptInteract();
        return g.acceptSnapshot();
      }
      if (cmd === 'hold') {
        const on = arg !== '0' && arg !== 'false';
        return { ok: g.acceptSetMinigameHold(on), snapshot: g.acceptSnapshot() };
      }
      if (cmd === 'fossil_done') {
        return { ok: g.acceptCompleteFossilMinigame(), snapshot: g.acceptSnapshot() };
      }
      if (cmd === 'panel' && arg) {
        const btn = document.getElementById(`btn-${arg}`) as HTMLButtonElement | null;
        if (btn) {
          btn.click();
          return g.acceptSnapshot();
        }
        return { ok: false, error: 'no_panel_btn' };
      }
      if (cmd === 'evidence') {
        const idx = arg && /^\d+$/.test(arg) ? Number(arg) : 0;
        const btn = document.querySelectorAll(
          '.notebook-evidence-btn',
        )[idx] as HTMLButtonElement | undefined;
        if (!btn) return { ok: false, error: 'no_evidence_btn' };
        btn.click();
        return g.acceptSnapshot();
      }
      if (cmd === 'equip' && arg) {
        return g.acceptEquipTrait(arg);
      }
      if (cmd === 'save') {
        g.save();
        return g.acceptSnapshot();
      }
      if (cmd === 'snapshot') return g.acceptSnapshot();
      return { ok: false, error: 'unknown_cmd' };
    };
}

async function startGame(continuing: boolean) {
  await Promise.all([
    dataCatalog.initialize(),
    earthLayerService.initialize(),
    timeAtlasService.initialize(),
    temporalMapService.initialize(),
  ]);
  const state = continuing ? (await loadSaveAsync()) ?? loadSave() : createDefaultSave();
  if (!state) {
    alert('Could not load save. Starting new expedition.');
    return startGame(false);
  }
  if (!state.earthLayers) {
    state.earthLayers = { viewedTabs: [], analyzedRegions: [] };
  }
  if (!state.timeAtlas) {
    state.timeAtlas = {
      viewedTimeUnits: [],
      viewedGates: [],
      analyzedPeriods: [],
      activeTimeUnitId: null,
    };
  }

  document.getElementById('title-screen')!.classList.remove('active');
  document.getElementById('game-screen')!.classList.add('active');

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  game = new Game(
    canvas,
    dataCatalog,
    earthLayerService,
    timeAtlasService,
    temporalMapService,
    archiveDexService,
    state
  );
  game.start();
  (window as unknown as { __aolGame: Game | null }).__aolGame = game;
  track('game_start', { continuing, region: state.player.currentRegion });

  if (!continuing) {
    game.showToast(
      'Welcome, Explorer-Archivist! Your Lifeling companion Relic is ready. Visit regions from the museum to begin.'
    );
  } else {
    game.showToast('Expedition resumed. Welcome back to the Archive of Life.');
  }
}

init();
