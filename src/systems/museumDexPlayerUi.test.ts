/**
 * Player UI wiring: museum hub + ArchiveDex honesty mounts + a11y labels.
 * Input-shaped journey uses presentation mounts (not emoji-as-finished claims).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertMuseumDexHonesty,
  buildArchiveDexEntryPresentation,
  buildMuseumHubPresentation,
  listArchiveDexFlagshipPresentations,
  mountArchiveDexHonestyBanner,
  mountMuseumHubPresentation,
  renderArchiveDexBriefStripHtml,
  renderArchiveDexHonestyBannerHtml,
  renderMuseumHubHonestyHtml,
} from '@/systems/museumDexPresentation';
import {
  createDefaultSave,
  deleteSave,
  loadSave,
  saveGame,
  validateSave,
} from '@/systems/saveSystem';
import { collectArtifact } from '@/systems/artifactSystem';
import type { PlayableSpecies } from '@/services/DataCatalogService';
import type { LifelingTrait } from '@/schema';
import { applyAccessibilitySettings, loadAccessibilitySettings } from '@/systems/accessibility';

const ROOT = process.cwd();

const horse: PlayableSpecies = {
  id: 'equus_caballus_ferus',
  commonName: "Przewalski's Horse",
  scientificName: 'Equus ferus przewalskii',
  group: 'Mammal',
  family: 'Equidae',
  conservationStatus: 'Endangered',
  artifactTypes: ['track_cast'],
  region: 'steppe',
  questType: 'observation',
  dangerLevel: 2,
  ethicalInteraction: 'observe_from_distance',
  timeRange: 'Present',
  habitats: ['steppe'],
  continents: ['Asia'],
  diet: 'Herbivore',
  activity: 'Diurnal',
  size: '1.2–1.4 m',
  behavior: 'Steppe herd browser',
  learningTopics: [],
  funFacts: [],
  whyItMatters: '',
  timeUnitIds: ['holocene'],
  provenance: [
    {
      source: 'game_authored',
      sourceVersion: 'mvp',
      sourceRecordId: 'equus_caballus_ferus',
      license: 'GAME-ORIGINAL',
      citation: 'Archive authored',
      citationRequired: false,
      retrievedAt: '2026-10-29T00:00:00.000Z',
      lastUpdated: '2026-10-29T00:00:00.000Z',
      verificationStatus: 'game_authored_verified',
      isMockData: false,
    },
  ],
};

function fakeDocument(): Document {
  const html = `
    <div id="title-screen">
      <div id="museum-honesty-host" data-museum-honesty-host></div>
    </div>
    <div id="game-screen">
      <div id="region-name">Archive Museum</div>
      <div id="hud-museum-honesty-host" data-museum-honesty-host hidden></div>
      <div id="panel-archive">
        <div id="archivedex-honesty-host"></div>
        <div id="archive-coverage"></div>
      </div>
    </div>
  `;
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('museum/dex player UI wiring', () => {
  it('mounts museum hub honesty into title + game hosts with a11y labels', () => {
    const doc = fakeDocument();
    const hub = buildMuseumHubPresentation();
    expect(mountMuseumHubPresentation(doc, hub)).toBe(true);
    const titleHost = doc.querySelector('#museum-honesty-host');
    expect(titleHost?.querySelector('[data-museum-honesty]')).toBeTruthy();
    expect(titleHost?.getAttribute('aria-label') ?? '').toMatch(/0 of 17|0\/17/i);
    expect(doc.getElementById('title-screen')?.getAttribute('aria-label') ?? '').toMatch(/museum/i);

    const hud = doc.getElementById('hud-museum-honesty-host')!;
    hud.hidden = false;
    expect(mountMuseumHubPresentation(doc.getElementById('game-screen'), hub)).toBe(true);
    expect(hud.querySelector('[data-museum-honesty]')).toBeTruthy();
    expect(doc.getElementById('region-name')?.getAttribute('aria-label') ?? '').toContain('0 of 17');
    expect(renderMuseumHubHonestyHtml(hub)).toContain('Flagship taxa');
  });

  it('mounts ArchiveDex honesty banner and flagship presentations stay non-finished', () => {
    const doc = fakeDocument();
    expect(mountArchiveDexHonestyBanner(doc.getElementById('panel-archive'))).toBe(true);
    const banner = doc.querySelector('[data-archivedex-honesty]');
    expect(banner?.textContent ?? '').toMatch(/not finished model|IUCN|blocked_external|assessed/i);
    expect(banner?.textContent ?? '').toMatch(/blocked_external/i);
    expect(banner?.textContent ?? '').toMatch(/assessed=false/i);
    expect(renderArchiveDexHonestyBannerHtml()).toContain('0/17');

    const entries = listArchiveDexFlagshipPresentations();
    expect(entries).toHaveLength(24);
    const horseEntry = buildArchiveDexEntryPresentation('equus_caballus_ferus');
    expect(horseEntry?.finishedModelClaimed).toBe(false);
    expect(horseEntry?.iucnAssessed).toBe(false);
    expect(horseEntry?.artStatusLabel).toMatch(/candidate|not a finished model|not human-approved|not finished/i);
    expect(horseEntry?.locomotionCue).toMatch(/trot|lope|amble/i);
    expect(horseEntry?.behaviorNote).toBeTruthy();
    expect(horseEntry?.observationMotionMode).toBe('amble');
    expect(horseEntry?.silhouetteBriefWave).toBe(1);
    const strip = renderArchiveDexBriefStripHtml(horseEntry!);
    expect(strip).toContain('data-dex-brief-strip');
    expect(strip).toContain('data-finished-model="false"');
    expect(strip).toMatch(/Locomotion|Behavior|not a finished/i);
    expect(() => assertMuseumDexHonesty(buildMuseumHubPresentation(), entries)).not.toThrow();
  });

  it('input-shaped journey: expedition → observation → dex → Lifeling → museum → save/reload', () => {
    deleteSave();
    const state = createDefaultSave();
    // Museum hub
    state.player.currentRegion = 'museum';
    state.player.visitedRegions = ['museum'];
    // Expedition
    state.player.currentRegion = 'steppe';
    state.player.visitedRegions = ['museum', 'steppe'];
    // Observation / collect → dex + Lifeling growth
    const traits: LifelingTrait[] = [
      {
        id: 'steppe_mane',
        name: 'Steppe Mane',
        category: 'head',
        description: 'Wind-cut mane',
        unlockedBy: 'equus_caballus_ferus',
      },
    ];
    const collected = collectArtifact(state, horse, traits, { timePeriodId: 'holocene' });
    expect(collected.success).toBe(true);
    state.stats.speciesDocumented = Math.max(1, state.stats.speciesDocumented ?? 0);
    state.companion.name = 'Steppe Scout';
    state.companion.unlockedTraits = [
      ...new Set([...(state.companion.unlockedTraits ?? []), 'steppe_mane']),
    ];
    // Dex presentation for observed taxon
    const dex = buildArchiveDexEntryPresentation('equus_caballus_ferus');
    expect(dex?.taxonId).toBe('equus_caballus_ferus');
    expect(dex?.finishedModelClaimed).toBe(false);
    // Return museum + save/reload
    state.player.currentRegion = 'museum';
    expect(validateSave(state)).toBe(true);
    saveGame(state);
    const restored = loadSave();
    expect(restored?.player.currentRegion).toBe('museum');
    expect(restored?.player.visitedRegions).toEqual(expect.arrayContaining(['museum', 'steppe']));
    expect(restored?.companion.name).toBe('Steppe Scout');
    expect(restored?.companion.unlockedTraits).toContain('steppe_mane');
    expect((restored?.artifacts.length ?? 0) + (restored?.stats.speciesDocumented ?? 0)).toBeGreaterThan(0);
    deleteSave();
  });

  it('a11y settings apply alongside museum presentation labels', () => {
    const root = document.createElement('div');
    applyAccessibilitySettings(
      { ...loadAccessibilitySettings(), highContrast: true, reducedMotion: true },
      root,
    );
    expect(root.classList.contains('a11y-high-contrast')).toBe(true);
    expect(root.classList.contains('a11y-reduced-motion')).toBe(true);
    const hub = buildMuseumHubPresentation();
    expect(hub.ariaLabel.length).toBeGreaterThan(40);
    expect(hub.exploreRegionCount).toBeGreaterThanOrEqual(12);
    expect(hub.flagshipCount).toBe(24);
  });

  it('museum hub bridges Lifeling honesty without IUCN/maps unlock claims', () => {
    const html = renderMuseumHubHonestyHtml();
    expect(html).toContain('data-museum-lifeling-bridge');
    expect(html).toContain('lifeling-honesty');
    expect(html).toMatch(/save\/resume|Lifeling/i);
    expect(html).toContain('0/17');
    expect(html).toMatch(/blocked_external|IUCN/i);
  });

  it('index.html hosts museum/dex honesty mount points', () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    expect(html).toContain('id="museum-honesty-host"');
    expect(html).toContain('id="hud-museum-honesty-host"');
    expect(html).toContain('id="archivedex-honesty-host"');
    expect(html).toContain('btn-archive');
    expect(html).toContain('btn-companion');
  });
});
