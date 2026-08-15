/**
 * GAME-RC-004 — launch campaign density + living-world framing (headless).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  clearDiscoveryHistory,
  discoveryCriticNotes,
  getDiscoveryHistory,
  livingWorldFramingActive,
  presentDiscovery,
} from '@/systems/discoveryFeedback';
import {
  buildPacingProgress,
  estimatedLaunchMinutes,
  LAUNCH_PACING_BEATS,
  LaunchPacingTracker,
  pacingCompletionPercent,
} from '@/systems/launchPacing';
import {
  clearPresentationPulses,
  getPresentationPulses,
  MENU_HUD_SURFACES,
  presentationDensityScore,
  pulseHud,
} from '@/systems/worldPresentation';
import { buildVisualPackHarness } from '@/systems/visualPackHarness';
import { playCue, clearCueHistory, getCueHistory } from '@/systems/audioCueSystem';

const ROOT = process.cwd();

describe('GAME-RC-004 Archive launch density', () => {
  it('validates release contracts including platform + visual harness', () => {
    const out = execFileSync('python3', ['scripts/validate_game_rc_contracts.py'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(out).toContain('GAME_RC_CONTRACTS_OK');
    expect(out).toContain('achievements=16');
  });

  it('engineers living-world discovery framing without claiming human fun', () => {
    clearDiscoveryHistory();
    presentDiscovery('region_arrive', 'Savanna dawn', 'Living field site.');
    presentDiscovery('observation_complete', 'Documented lion', 'Expedition moment.');
    expect(livingWorldFramingActive()).toBe(true);
    expect(getDiscoveryHistory().length).toBe(2);
    const notes = discoveryCriticNotes();
    expect(notes.engineered_toward).toBe('living_world_expedition');
    expect(notes.database_risk).toBe('S2_OPEN');
  });

  it('covers launch pacing beats and HUD presentation density', () => {
    expect(LAUNCH_PACING_BEATS.length).toBe(10);
    expect(estimatedLaunchMinutes()).toBeGreaterThanOrEqual(10);
    const beats = buildPacingProgress([
      'title_to_onboarding',
      'onboarding_to_first_region',
      'first_sighting',
    ]);
    expect(pacingCompletionPercent(beats)).toBe(30);
    clearPresentationPulses();
    for (const surface of MENU_HUD_SURFACES) pulseHud(surface, surface);
    expect(getPresentationPulses().length).toBe(MENU_HUD_SURFACES.length);
    expect(presentationDensityScore()).toBe(100);
  });

  it('LaunchPacingTracker advances from marked expedition beats', () => {
    const tracker = new LaunchPacingTracker();
    expect(tracker.percent()).toBe(0);
    expect(tracker.mark('title_to_onboarding')).toBe(true);
    expect(tracker.mark('title_to_onboarding')).toBe(false);
    tracker.mark('onboarding_to_first_region');
    tracker.mark('first_sighting');
    expect(tracker.percent()).toBe(30);
    expect(tracker.has('first_sighting')).toBe(true);
  });

  it('expands fail-soft audio cues used by density path', () => {
    clearCueHistory();
    playCue('discovery_chime');
    playCue('era_shift');
    playCue('achievement_presented');
    playCue('finale_return');
    expect(getCueHistory().map((c) => c.name)).toEqual([
      'discovery_chime',
      'era_shift',
      'achievement_presented',
      'finale_return',
    ]);
  });

  it('ships visual harness with capture deferred and honest platform matrix', () => {
    const harness = buildVisualPackHarness();
    expect(harness.status).toBe('HARNESS_READY');
    expect(harness.VISUAL_MODEL_REVIEW).toBe('UNAVAILABLE');
    expect(harness.deferred_heavy_work.length).toBeGreaterThan(0);

    const platform = JSON.parse(
      readFileSync(join(ROOT, 'release/PLATFORM_MATRIX.json'), 'utf8'),
    ) as {
      PLATFORM_PUBLISHED: boolean;
      targets: Array<{ id: string; status: string }>;
    };
    expect(platform.PLATFORM_PUBLISHED).toBe(false);
    expect(platform.targets.find((t) => t.id === 'web')?.status).toBe('BUILDABLE');
    expect(platform.targets.find((t) => t.id === 'android')?.status).toBe('BUILDABLE');
    expect(platform.targets.find((t) => t.id === 'ios')?.status).toBe('NOT_STARTED');

    const visualFile = join(ROOT, 'release/VISUAL_PACK_HARNESS.json');
    expect(existsSync(visualFile)).toBe(true);
  });

  it('keeps honesty tokens false and critic BETA with S2 open', () => {
    const gate = JSON.parse(readFileSync(join(ROOT, 'release/RC_GATE.json'), 'utf8')) as {
      packet: string;
      claims: Record<string, boolean>;
      critic_class: string;
      defects: { S0_open: number; S1_open: number; S2_open: number };
      visual: { VISUAL_MODEL_REVIEW: string };
      achievements: { count: number };
    };
    expect(gate.packet).toBe('GAME-RC-004');
    expect(gate.claims.POLISHED_RELEASE_CANDIDATE).toBe(false);
    expect(gate.claims.FEATURE_COMPLETE_RC).toBe(false);
    expect(gate.claims.HUMAN_PLAYTEST_VALIDATED).toBe(false);
    expect(gate.critic_class).toBe('BETA');
    expect(gate.defects.S0_open).toBe(0);
    expect(gate.defects.S1_open).toBe(0);
    expect(gate.defects.S2_open).toBeGreaterThan(0);
    expect(gate.visual.VISUAL_MODEL_REVIEW).toBe('UNAVAILABLE');
    expect(gate.achievements.count).toBe(16);

    const content = JSON.parse(
      readFileSync(join(ROOT, 'release/CONTENT_MANIFEST.json'), 'utf8'),
    ) as { counts: { launch_eras_playable_filters: number; launch_expeditions: number } };
    expect(content.counts.launch_eras_playable_filters).toBe(4);
    expect(content.counts.launch_expeditions).toBe(4);
    expect(content.counts.launch_encounter_taxa).toBe(157);
  });
});
