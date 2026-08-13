/**
 * Independent verifier GAME-RC-002 playthrough — not the implementer test.
 * Challenges JSON-only narrative, fake 13/13, missing save/reload, ArchiveDex no-op.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { Game } from '@/game/Game';
import { createDefaultSave, deleteSave, loadSave, SAVE_VERSION } from '@/systems/saveSystem';
import { DataCatalogService } from '@/services/DataCatalogService';
import { EarthLayerService } from '@/services/EarthLayerService';
import { TemporalMapService } from '@/services/TemporalMapService';
import { TimeAtlasService } from '@/time/TimeAtlasService';
import { ArchiveDexService } from '@/services/ArchiveDexService';
import { evaluateLaunchCampaign } from '@/systems/launchCampaign';
import { getCollectedIds } from '@/systems/artifactSystem';
import {
  ACHIEVEMENT_STORAGE_KEY,
  AchievementRuntime,
} from '@/systems/achievementRuntime';

const ROOT = process.cwd();
const CATALOG_IDS = [
  'aol.first_discovery',
  'aol.first_artifact',
  'aol.region_hopper',
  'aol.era_walker',
  'aol.artifact_provenance',
  'aol.archivedex',
  'aol.taxonomy_breadth',
  'aol.lifeling_growth',
  'aol.lifeling_style',
  'aol.scientific_curiosity',
  'aol.launch_complete',
  'aol.pause_and_breathe',
  'aol.hidden_credits',
];

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

function stubFetchFromPublic() {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    const url = String(input);
    const rel = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
    const filePath = join(ROOT, 'public', rel.startsWith('data/') ? rel : join('data', rel));
    if (!existsSync(filePath)) return new Response(`missing ${filePath}`, { status: 404 });
    const body = readFileSync(filePath);
    const type = filePath.endsWith('.json') ? 'application/json' : 'application/octet-stream';
    return new Response(body, { status: 200, headers: { 'Content-Type': type } });
  });
}

async function bootGame(state = createDefaultSave()) {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  Object.defineProperty(canvas, 'parentElement', {
    value: { clientWidth: 800, clientHeight: 600, style: {} },
    configurable: true,
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
  const game = new Game(canvas, catalog, earth, time, temporal, dex, state);
  game.start();
  return { game, dex };
}

type GameHarness = {
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
  acceptCompleteFossilMinigame: () => boolean;
  acceptViewEra: (id: string) => void;
  acceptAcknowledgeFinale: () => void;
  acceptOpenCredits: () => void;
  acceptOpenAchievements: () => void;
  acceptEquipTrait: (id: string) => unknown;
  toggleManualPause: () => void;
  togglePanel: (name: string) => void;
  closeAllPanels: () => void;
  save: () => void;
  getAchievementRuntime: () => AchievementRuntime;
  activeMinigame: { update?: (dt: number) => void } | null;
};

async function observeOnce(game: Game, g: GameHarness) {
  const target = g.acceptMoveBesideTarget('species') ?? g.acceptMoveBesideTarget('fossil');
  if (!target) return false;
  const before = g.state.artifacts.length;
  await g.acceptInteract();
  g.acceptSetMinigameHold(true);
  for (let i = 0; i < 500 && g.state.artifacts.length === before; i++) {
    g.activeMinigame?.update?.(1 / 60);
  }
  g.acceptSetMinigameHold(false);
  g.acceptCompleteFossilMinigame();
  for (let i = 0; i < 40 && g.activeMinigame !== null; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  return g.state.artifacts.length > before;
}

describe('INDEPENDENT VERIFIER GAME-RC-002 Archive', () => {
  it('has no cheat unlock-by-id API', () => {
    const proto = AchievementRuntime.prototype as unknown as Record<string, unknown>;
    expect(typeof proto.unlockById).toBe('undefined');
    expect(typeof proto.forceUnlock).toBe('undefined');
    expect(typeof proto.unlockAchievement).toBe('undefined');
    // TS `private unlock(def)` is emitted on the prototype; it is not an id cheat API.
    expect(AchievementRuntime.prototype.unlock.length).toBe(1);
    const catalog = JSON.parse(readFileSync(join(ROOT, 'release/ACHIEVEMENTS.json'), 'utf8'));
    for (const item of catalog.achievements) {
      expect(['test', 'debug', 'cheat', 'always']).not.toContain(item.unlock?.type);
    }
    expect(catalog.achievements).toHaveLength(13);
  });

  it('walks a new save through real Game collect/ArchiveDex/Lifeling/campaign + reload', async () => {
    const fixture = readFileSync(join(ROOT, 'gate1/fixtures/production_gate_dom.html'), 'utf8');
    document.documentElement.innerHTML = fixture;
    installCanvasStub();
    HTMLAudioElement.prototype.play = () => Promise.resolve();
    stubFetchFromPublic();
    localStorage.removeItem(ACHIEVEMENT_STORAGE_KEY);
    deleteSave();

    const { game } = await bootGame();
    const g = game as unknown as GameHarness;
    expect(g.state.version).toBe(SAVE_VERSION);
    expect(g.state.artifacts).toHaveLength(0);
    expect(g.state.campaign?.globalCoverageClaimed).toBe(false);
    expect(g.state.companion.name).toBe('Relic');

    g.acceptCompleteOnboarding('Independent Verifier');

    for (const regionId of ['savanna', 'forest', 'wetland']) {
      await g.acceptTravel('museum');
      await g.acceptTravel(regionId);
      const wrote = await observeOnce(game, g);
      expect(wrote, `artifact write in ${regionId}`).toBe(true);
    }

    if ((g.state.campaign?.observedGroups.length ?? 0) < 2) {
      const world = game as unknown as {
        world: {
          getInteractables: () => Array<{
            type: string;
            speciesId?: string;
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
        g.acceptCompleteFossilMinigame();
        for (let i = 0; i < 40 && g.activeMinigame !== null; i++) {
          await new Promise((r) => setTimeout(r, 50));
        }
        if ((g.state.campaign?.observedGroups.length ?? 0) >= 2) break;
      }
    }

    if ((g.state.companion.modules?.unlockedModules.length ?? 0) < 1) {
      await g.acceptTravel('museum');
      await g.acceptTravel('urban_park');
    }

    expect(getCollectedIds(g.state).size).toBe(g.state.artifacts.length);
    expect(g.state.artifacts.length).toBeGreaterThanOrEqual(3);
    expect(g.state.notebook[0]?.provenanceCitations?.length ?? 0).toBeGreaterThan(0);
    expect(g.state.player.visitedRegions.filter((r) => r !== 'museum').length).toBeGreaterThanOrEqual(3);
    expect(g.state.companion.observationCount).toBeGreaterThanOrEqual(3);
    expect(
      (g.state.companion.level ?? 1) >= 2 ||
        (g.state.companion.modules?.unlockedModules.length ?? 0) >= 1,
    ).toBe(true);

    g.acceptViewEra('holocene');
    g.acceptViewEra('carboniferous');
    g.togglePanel('archive');
    g.closeAllPanels();
    g.acceptEquipTrait('celebrate_emote');
    g.activeMinigame = null;
    g.toggleManualPause();
    g.toggleManualPause();
    g.acceptAcknowledgeFinale();

    const evaled = evaluateLaunchCampaign(g.state);
    // eslint-disable-next-line no-console
    console.log(
      'INDEPENDENT_ARCHIVE_CAMPAIGN_STEPS',
      JSON.stringify({
        complete: evaled.complete,
        steps: evaled.steps,
        groups: g.state.campaign?.observedGroups,
        modules: g.state.companion.modules?.unlockedModules,
        level: g.state.companion.level,
      }),
    );
    expect(evaled.globalCoverage).toBe(false);
    expect(g.state.campaign?.globalCoverageClaimed).toBe(false);
    expect(evaled.complete, `incomplete steps ${JSON.stringify(evaled.steps.filter((s) => !s.done))}`).toBe(
      true,
    );
    expect(g.state.campaign?.launchCampaignComplete).toBe(true);

    g.acceptOpenCredits();
    g.acceptOpenAchievements();
    g.save();

    const rt = g.getAchievementRuntime();
    const unlocked = CATALOG_IDS.filter((id) => rt.isUnlocked(id));
    const missing = CATALOG_IDS.filter((id) => !rt.isUnlocked(id));
    // Persist independent evidence for the VP.
    const evidence = {
      artifacts: g.state.artifacts.map((a) => a.speciesId),
      notebook_provenance: g.state.notebook[0]?.provenanceCitations?.length ?? 0,
      archivedex_collected: [...getCollectedIds(g.state)],
      companion: {
        name: g.state.companion.name,
        level: g.state.companion.level,
        xp: g.state.companion.xp,
        modules: g.state.companion.modules?.unlockedModules ?? [],
      },
      observedGroups: g.state.campaign?.observedGroups ?? [],
      launchComplete: g.state.campaign?.launchCampaignComplete,
      globalCoverageClaimed: g.state.campaign?.globalCoverageClaimed,
      unlocked,
      missing,
      unlockedCount: rt.unlockedCount(),
      catalogCount: rt.catalogCount(),
    };
    // eslint-disable-next-line no-console
    console.log('INDEPENDENT_ARCHIVE_EVIDENCE', JSON.stringify(evidence));

    expect(rt.catalogCount()).toBe(13);
    expect(missing, `missing achievements: ${missing.join(',')}`).toEqual([]);
    expect(rt.unlockedCount()).toBe(13);

    const reloaded = loadSave();
    expect(reloaded).toBeTruthy();
    expect(reloaded!.artifacts.length).toBe(g.state.artifacts.length);
    expect(reloaded!.campaign?.launchCampaignComplete).toBe(true);
    expect(reloaded!.campaign?.globalCoverageClaimed).toBe(false);
    expect(getCollectedIds(reloaded!).size).toBe(reloaded!.artifacts.length);

    const { game: game2 } = await bootGame(reloaded!);
    const rt2 = (game2 as unknown as GameHarness).getAchievementRuntime();
    expect(rt2.unlockedCount()).toBe(13);
    expect(rt2.isUnlocked('aol.launch_complete')).toBe(true);
    expect(rt2.isUnlocked('aol.hidden_credits')).toBe(true);
    expect((game2 as unknown as GameHarness).state.campaign?.globalCoverageClaimed).toBe(false);
  }, 180_000);
});
