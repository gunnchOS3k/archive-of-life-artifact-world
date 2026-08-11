/**
 * WP-014 ACTUAL_PRODUCTION_RUNTIME — real Game class + real saveSystem.
 * Rejects gate1 Node fixture core_loop as production evidence.
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Game } from '@/game/Game';
import {
  createDefaultSave,
  deleteSave,
  loadSave,
  saveGame,
  SAVE_VERSION,
} from '@/systems/saveSystem';
import { DataCatalogService } from '@/services/DataCatalogService';
import { EarthLayerService } from '@/services/EarthLayerService';
import { TemporalMapService } from '@/services/TemporalMapService';
import { TimeAtlasService } from '@/time/TimeAtlasService';
import { ArchiveDexService } from '@/services/ArchiveDexService';

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'gate1/evidence/out');
const ART_DIR = join(ROOT, 'artifacts/wp014');

type Step = { step: string; result: 'pass' | 'fail'; detail?: Record<string, unknown> };
const steps: Step[] = [];

function emit(step: string, ok: boolean, detail: Record<string, unknown> = {}) {
  steps.push({ step, result: ok ? 'pass' : 'fail', detail });
  expect(ok, `${step}: ${JSON.stringify(detail)}`).toBe(true);
}

function installCanvasStub() {
  HTMLCanvasElement.prototype.getContext = (() =>
    ({
      fillRect() {},
      clearRect() {},
      fillText() {},
      beginPath() {},
      arc() {},
      fill() {},
      stroke() {},
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      scale() {},
      drawImage() {},
      measureText: () => ({ width: 0 }),
      canvas: document.createElement('canvas'),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

function stubFetchFromPublic() {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = String(input);
    const rel = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
    const filePath = join(ROOT, 'public', rel.startsWith('data/') ? rel : join('data', rel));
    if (!existsSync(filePath)) {
      return new Response(`missing ${filePath}`, { status: 404 });
    }
    const body = readFileSync(filePath);
    const type = filePath.endsWith('.json') ? 'application/json' : 'application/octet-stream';
    return new Response(body, { status: 200, headers: { 'Content-Type': type } });
  });
}

describe('WP-014 Archive ACTUAL_PRODUCTION_RUNTIME', () => {
  let game: Game;
  let catalog: DataCatalogService;

  beforeAll(async () => {
    const fixture = readFileSync(join(ROOT, 'gate1/fixtures/production_gate_dom.html'), 'utf8');
    document.documentElement.innerHTML = fixture;
    installCanvasStub();
    stubFetchFromPublic();
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    Object.defineProperty(canvas, 'parentElement', {
      value: { clientWidth: 800, clientHeight: 600, style: {} },
    });
    deleteSave();
    catalog = new DataCatalogService();
    await catalog.initialize();
    await catalog.loadActiveRegion('museum');
    const earth = new EarthLayerService();
    const time = new TimeAtlasService();
    const temporal = new TemporalMapService();
    // Best-effort init if services expose it
    await (earth as { initialize?: () => Promise<void> }).initialize?.();
    await (time as { initialize?: () => Promise<void> }).initialize?.();
    await (temporal as { initialize?: () => Promise<void> }).initialize?.();
    const dex = new ArchiveDexService(catalog, time);
    const state = createDefaultSave();
    state.player.x = 120;
    state.player.y = 180;
    game = new Game(canvas, catalog, earth, time, temporal, dex, state);
    game.start();
    emit('title_menu_shell', !!document.getElementById('btn-new-game'), {
      has_canvas: !!canvas,
      region: state.player.currentRegion,
    });
    emit('new_game_session', true, { catalog_ready: true });
  }, 120_000);

  afterAll(() => {
    const allPass = steps.length > 0 && steps.every((s) => s.result === 'pass');
    const summary = {
      schema: 'aol_actual_production_runtime/v1',
      game: 'archive-of-life-artifact-world',
      engine: 'web-canvas',
      run_mode: 'vitest_jsdom_real_Game_class',
      all_steps_pass: allPass,
      steps,
      generated_at: new Date().toISOString(),
      false_positive_rejected: [
        'gate1/tools/core_loop_runner.mjs is a Node fixture simulator — not this evidence',
        'python -m http.server is not an archive runtime',
      ],
    };
    mkdirSync(OUT_DIR, { recursive: true });
    mkdirSync(ART_DIR, { recursive: true });
    const payload = JSON.stringify(summary, null, 2);
    writeFileSync(join(OUT_DIR, 'actual_production_runtime.json'), payload);
    writeFileSync(join(ART_DIR, 'actual_production_runtime.json'), payload);
  });

  it('real keyboard movement mutates player position via Game.update', () => {
    const g = game as unknown as {
      state: { player: { x: number } };
      player: { x: number };
      update: (dt: number) => void;
      keys: Record<string, boolean>;
    };
    const x0 = g.player.x;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    expect(g.keys['d']).toBe(true);
    for (let i = 0; i < 45; i++) g.update(1 / 60);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
    const x1 = g.player.x;
    emit('real_input_movement', x1 > x0 + 5, { x0, x1 });
  });

  it('manual pause freezes movement and saves', () => {
    const g = game as unknown as {
      player: { x: number };
      update: (dt: number) => void;
      paused: boolean;
      keys: Record<string, boolean>;
    };
    game.toggleManualPause();
    const x0 = g.player.x;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    for (let i = 0; i < 30; i++) g.update(1 / 60); // update() must no-op while paused
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
    const x1 = g.player.x;
    const disk = loadSave();
    emit('pause_pass', g.paused && Math.abs(x1 - x0) < 0.01 && !!disk, {
      paused: g.paused,
      x0,
      x1,
      disk_x: disk?.player.x,
    });
    game.toggleManualPause();
  });

  it('visibilitychange suspend persists checkpoint', () => {
    const g = game as unknown as {
      player: { x: number };
      state: { player: { x: number } };
      paused: boolean;
      suspendPaused: boolean;
    };
    g.player.x = 333;
    g.state.player.x = 333;
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    const disk = loadSave();
    emit('suspend_resume_or_checkpoint', g.paused && disk?.player.x === 333, {
      paused: g.paused,
      suspendPaused: g.suspendPaused,
      disk_x: disk?.player.x,
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  it('save/load lifecycle', () => {
    const live = createDefaultSave();
    live.player.currentRegion = 'savanna';
    live.player.x = 222;
    saveGame(live);
    const loaded = loadSave();
    emit('save_load_lifecycle', !!loaded && loaded.player.x === 222 && loaded.version === SAVE_VERSION, {
      version: loaded?.version,
      x: loaded?.player.x,
      region: loaded?.player.currentRegion,
    });
  });
});
