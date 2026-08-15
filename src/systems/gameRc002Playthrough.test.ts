/**
 * GAME-RC-002 — map every claimed playthrough step to Game runtime execution.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Game } from '@/game/Game';
import { createDefaultSave, deleteSave, SAVE_VERSION } from '@/systems/saveSystem';
import { DataCatalogService } from '@/services/DataCatalogService';
import { EarthLayerService } from '@/services/EarthLayerService';
import { TemporalMapService } from '@/services/TemporalMapService';
import { TimeAtlasService } from '@/time/TimeAtlasService';
import { ArchiveDexService } from '@/services/ArchiveDexService';
import { evaluateLaunchCampaign } from '@/systems/launchCampaign';
import { ACHIEVEMENT_STORAGE_KEY } from '@/systems/achievementRuntime';

const ROOT = process.cwd();

function installCanvasStub() {
  const stub2d: Record<string, unknown> = new Proxy(
    {
      measureText: () => ({ width: 0 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      canvas: document.createElement('canvas'),
      getContextAttributes: () => ({}),
    },
    {
      get(target, prop) {
        if (prop in target) return (target as Record<string, unknown>)[prop as string];
        return () => {};
      },
    },
  );
  HTMLCanvasElement.prototype.getContext = (() =>
    stub2d) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

function installAudioStub() {
  HTMLAudioElement.prototype.play = () => Promise.resolve();
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

describe('GAME-RC-002 Archive launch-campaign playthrough', () => {
  let game: Game;

  beforeAll(async () => {
    const fixture = readFileSync(join(ROOT, 'gate1/fixtures/production_gate_dom.html'), 'utf8');
    document.documentElement.innerHTML = fixture;
    installCanvasStub();
    installAudioStub();
    stubFetchFromPublic();
    localStorage.removeItem(ACHIEVEMENT_STORAGE_KEY);
    deleteSave();
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    Object.defineProperty(canvas, 'parentElement', {
      value: { clientWidth: 800, clientHeight: 600, style: {} },
    });
    const catalog = new DataCatalogService();
    await catalog.initialize();
    await catalog.loadActiveRegion('museum');
    const earth = new EarthLayerService();
    const time = new TimeAtlasService();
    const temporal = new TemporalMapService();
    await (earth as { initialize?: () => Promise<void> }).initialize?.();
    await (time as { initialize?: () => Promise<void> }).initialize?.();
    await (temporal as { initialize?: () => Promise<void> }).initialize?.();
    const dex = new ArchiveDexService(catalog, time);
    const state = createDefaultSave();
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.campaign?.globalCoverageClaimed).toBe(false);
    game = new Game(canvas, catalog, earth, time, temporal, dex, state);
    game.start();
  }, 120_000);

  it('validates release contracts (python)', () => {
    const out = execFileSync('python3', ['scripts/validate_game_rc_contracts.py'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(out).toContain('GAME_RC_CONTRACTS_OK');
  });

  it('executes first-launch onboarding through credits and achievement browser', async () => {
    const g = game as unknown as {
      state: ReturnType<typeof createDefaultSave>;
      acceptCompleteOnboarding: (name?: string) => void;
      acceptTravel: (id: string) => Promise<void>;
      acceptMoveBesideTarget: (kind?: 'species' | 'fossil' | 'portal') => {
        type: string;
        id: string;
        label: string;
      } | null;
      acceptInteract: () => Promise<void>;
      acceptSetMinigameHold: (holding: boolean) => boolean;
      acceptViewEra: (id: string) => void;
      acceptAcknowledgeFinale: () => void;
      acceptOpenCredits: () => void;
      acceptOpenAchievements: () => void;
      acceptEquipTrait: (id: string) => unknown;
      toggleManualPause: () => void;
      togglePanel: (name: string) => void;
      closeAllPanels: () => void;
      getAchievementRuntime: () => {
        isUnlocked: (id: string) => boolean;
        catalogCount: () => number;
        unlockedCount: () => number;
        browserEntries: () => Array<{ id: string; title: string; unlocked: boolean }>;
      };
      activeMinigame: { update?: (dt: number) => void } | null;
    };

    expect(document.getElementById('btn-new-game')).toBeTruthy();
    g.acceptCompleteOnboarding('Field Tester');
    expect(g.state.campaign?.onboardingComplete).toBe(true);
    expect(g.state.companion.name).toBe('Relic');

    const regions = ['savanna', 'forest', 'wetland'];
    const groups = new Set<string>();
    for (const regionId of regions) {
      await g.acceptTravel('museum');
      await g.acceptTravel(regionId);
      const target = g.acceptMoveBesideTarget('species') ?? g.acceptMoveBesideTarget('fossil');
      expect(target, `species in ${regionId}`).toBeTruthy();
      const before = g.state.artifacts.length;
      await g.acceptInteract();
      g.acceptSetMinigameHold(true);
      for (let i = 0; i < 500 && g.state.artifacts.length === before; i++) {
        g.activeMinigame?.update?.(1 / 60);
      }
      g.acceptSetMinigameHold(false);
      for (let i = 0; i < 40 && g.activeMinigame !== null; i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (g.state.artifacts.length === before) {
        // Fossil path: force complete if observe minigame was not the type.
        const gf = game as unknown as { acceptCompleteFossilMinigame: () => boolean };
        gf.acceptCompleteFossilMinigame();
        for (let i = 0; i < 40 && g.activeMinigame !== null; i++) {
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      expect(g.state.artifacts.length).toBeGreaterThan(before);
      const note = g.state.notebook[0];
      expect(note.provenanceCitations?.length ?? 0).toBeGreaterThan(0);
      for (const grp of g.state.campaign?.observedGroups ?? []) groups.add(grp);
    }

    if (groups.size < 2) {
      const world = game as unknown as {
        world: {
          getInteractables: () => Array<{
            type: string;
            speciesId?: string;
            species?: { group?: string };
            x: number;
            y: number;
          }>;
        };
        player: { x: number; y: number };
        nearestInteractable: unknown;
      };
      for (const item of world.world.getInteractables()) {
        if (item.type !== 'species' && item.type !== 'fossil') continue;
        if (!item.speciesId || g.state.artifacts.some((a) => a.speciesId === item.speciesId)) continue;
        world.player.x = item.x;
        world.player.y = item.y;
        g.state.player.x = item.x;
        g.state.player.y = item.y;
        world.nearestInteractable = item;
        const before = g.state.artifacts.length;
        await g.acceptInteract();
        g.acceptSetMinigameHold(true);
        for (let i = 0; i < 500 && g.state.artifacts.length === before; i++) {
          g.activeMinigame?.update?.(1 / 60);
        }
        (game as unknown as { acceptCompleteFossilMinigame: () => boolean }).acceptCompleteFossilMinigame();
        for (let i = 0; i < 40 && g.activeMinigame !== null; i++) {
          await new Promise((r) => setTimeout(r, 50));
        }
        if ((g.state.campaign?.observedGroups.length ?? 0) >= 2) break;
      }
    }

    expect(g.state.player.visitedRegions.filter((r) => r !== 'museum').length).toBeGreaterThanOrEqual(3);
    g.acceptViewEra('holocene');
    g.acceptViewEra('carboniferous');
    g.acceptViewEra('cretaceous');
    g.togglePanel('archive');
    g.closeAllPanels();
    g.acceptEquipTrait('celebrate_emote');

    g.closeAllPanels();
    g.activeMinigame = null;
    g.toggleManualPause();
    g.toggleManualPause();

    g.acceptAcknowledgeFinale();
    const evaled = evaluateLaunchCampaign(g.state);
    expect(evaled.globalCoverage).toBe(false);
    expect(g.state.campaign?.globalCoverageClaimed).toBe(false);
    expect(evaled.complete).toBe(true);

    g.acceptOpenCredits();
    expect(g.state.campaign?.creditsOpened).toBe(true);
    expect(document.getElementById('credits-overlay')?.classList.contains('hidden')).toBe(false);

    g.acceptOpenAchievements();
    const rt = g.getAchievementRuntime();
    expect(rt.catalogCount()).toBe(16);
    expect(rt.isUnlocked('aol.first_discovery')).toBe(true);
    expect(rt.isUnlocked('aol.launch_complete')).toBe(true);
    expect(rt.isUnlocked('aol.pause_and_breathe')).toBe(true);
    expect(rt.isUnlocked('aol.hidden_credits')).toBe(true);
    const hidden = rt.browserEntries().find((e) => e.id === 'aol.hidden_credits');
    expect(hidden?.title).not.toBe('???');
    expect(rt.unlockedCount()).toBeGreaterThanOrEqual(10);
  }, 120_000);

  it('keeps honesty tokens false', () => {
    const gate = JSON.parse(readFileSync(join(ROOT, 'release/RC_GATE.json'), 'utf8')) as {
      claims: Record<string, boolean>;
      critic_class: string;
      defects: { S0_open: number; S1_open: number };
      visual: { VISUAL_MODEL_REVIEW: string };
    };
    expect(gate.claims.POLISHED_RELEASE_CANDIDATE).toBe(false);
    expect(gate.claims.FEATURE_COMPLETE_RC).toBe(false);
    expect(gate.claims.HUMAN_PLAYTEST_VALIDATED).toBe(false);
    expect(gate.critic_class).toBe('BETA');
    expect(gate.defects.S0_open).toBe(0);
    expect(gate.defects.S1_open).toBe(0);
    expect(gate.visual.VISUAL_MODEL_REVIEW).toBe('UNAVAILABLE');
  });
});
