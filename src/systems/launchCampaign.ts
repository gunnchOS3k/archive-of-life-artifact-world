/**
 * Finite LAUNCH_CAMPAIGN_COMPLETION — separate from global species coverage.
 * Completing the launch expedition does NOT mean the knowledge base is complete.
 */

import type { CampaignSlice, SaveState } from '@/schema';
import type { AchievementRuntime } from '@/systems/achievementRuntime';

export type { CampaignSlice };

export const LAUNCH_CAMPAIGN_ID = 'launch_campaign_v1';
export const GLOBAL_COVERAGE_ID = 'GLOBAL_SPECIES_KNOWLEDGE_BASE_COVERAGE';

export const LAUNCH_FINALE_EXPEDITION_ID = 'exp_launch_finale';

export function createDefaultCampaign(): CampaignSlice {
  return {
    onboardingComplete: false,
    explorerName: '',
    archivedexOpened: false,
    companionCustomized: false,
    creditsOpened: false,
    launchCampaignComplete: false,
    finaleAcknowledged: false,
    observedGroups: [],
    globalCoverageClaimed: false,
  };
}

export function ensureCampaign(state: SaveState): CampaignSlice {
  const current = state.campaign ?? createDefaultCampaign();
  const merged: CampaignSlice = {
    ...createDefaultCampaign(),
    ...current,
    observedGroups: Array.isArray(current.observedGroups) ? current.observedGroups : [],
    globalCoverageClaimed: false,
  };
  state.campaign = merged;
  return merged;
}

export interface LaunchStep {
  id: string;
  done: boolean;
}

export function exploreRegionsVisited(state: SaveState): string[] {
  return (state.player.visitedRegions ?? []).filter((id) => id !== 'museum');
}

export function evaluateLaunchCampaign(state: SaveState): {
  complete: boolean;
  steps: LaunchStep[];
  density: LaunchStep[];
  densityComplete: boolean;
  globalCoverage: false;
} {
  const campaign = ensureCampaign(state);
  const explore = exploreRegionsVisited(state);
  const eras = state.timeAtlas?.viewedTimeUnits ?? [];
  const provenance = (state.notebook ?? []).some(
    (n) => Array.isArray(n.provenanceCitations) && n.provenanceCitations.length > 0,
  );
  const growth =
    (state.companion.level ?? 1) >= 2 ||
    (state.companion.modules?.unlockedModules.length ?? 0) >= 1;
  const groups = campaign.observedGroups.length;

  const steps: LaunchStep[] = [
    { id: 'onboarding', done: campaign.onboardingComplete },
    { id: 'first_region', done: explore.length >= 1 },
    { id: 'first_observation', done: (state.companion.observationCount ?? 0) >= 1 },
    { id: 'first_artifact', done: state.artifacts.length >= 1 },
    { id: 'provenance', done: provenance },
    { id: 'archivedex', done: campaign.archivedexOpened },
    { id: 'multiple_regions', done: explore.length >= 3 },
    { id: 'multiple_eras', done: eras.length >= 2 },
    { id: 'companion_customized', done: campaign.companionCustomized },
    { id: 'major_milestone', done: growth },
    { id: 'taxonomy_breadth', done: groups >= 2 },
    { id: 'finale', done: campaign.finaleAcknowledged },
  ];

  /** Density extras for GAME-RC-004 — tracked, not all required for finite complete. */
  const density: LaunchStep[] = [
    { id: 'era_density', done: eras.length >= 3 },
    { id: 'artifact_density', done: state.artifacts.length >= 3 },
    { id: 'region_density', done: explore.length >= 5 },
    { id: 'credits', done: campaign.creditsOpened },
  ];

  const complete = steps.every((s) => s.done);
  if (complete && !campaign.launchCampaignComplete) {
    campaign.launchCampaignComplete = true;
  }
  return {
    complete,
    steps,
    density,
    densityComplete: density.every((s) => s.done),
    globalCoverage: false,
  };
}

/** Map save-derived campaign progress onto the achievement runtime. */
export function syncAchievementsFromSave(runtime: AchievementRuntime, state: SaveState): void {
  const campaign = ensureCampaign(state);
  const evaled = evaluateLaunchCampaign(state);
  const explore = exploreRegionsVisited(state);
  const eras = new Set(state.timeAtlas?.viewedTimeUnits ?? []);
  if (state.timeAtlas?.activeTimeUnitId) eras.add(state.timeAtlas.activeTimeUnitId);

  if (campaign.onboardingComplete) runtime.setFlag('onboarding_complete');
  runtime.setStat('regions_explored', explore.length);
  runtime.setStat('eras_viewed', eras.size);
  runtime.setStat('companion_level', state.companion.level ?? 1);
  runtime.setStat('taxonomic_groups', campaign.observedGroups.length);
  runtime.setStat('artifacts_collected', state.artifacts.length);

  if ((state.companion.observationCount ?? 0) >= 1 && !runtime.isUnlocked('aol.first_discovery')) {
    runtime.reportEvent('observation_complete', 1);
  }
  if (state.artifacts.length >= 1 && !runtime.isUnlocked('aol.first_artifact')) {
    runtime.reportEvent('artifact_collected', 1);
  }
  const provenance = (state.notebook ?? []).some(
    (n) => Array.isArray(n.provenanceCitations) && n.provenanceCitations.length > 0,
  );
  if (provenance) runtime.setFlag('provenance_recorded');
  if (campaign.archivedexOpened) runtime.setFlag('archivedex_opened');
  if (campaign.companionCustomized) runtime.setFlag('companion_customized');
  if ((state.companion.modules?.unlockedModules.length ?? 0) >= 1) {
    runtime.setFlag('companion_module_unlocked');
  }
  if (campaign.observedGroups.length >= 1) runtime.setFlag('scientific_curiosity');
  if (evaled.complete) runtime.setFlag('launch_campaign_complete');
  if (campaign.creditsOpened) runtime.setFlag('credits_opened');
  if (campaign.finaleAcknowledged) runtime.setFlag('finale_acknowledged');
  if (state.artifacts.length >= 3) runtime.setFlag('artifact_density');
  if (eras.size >= 3) runtime.setFlag('era_density');
  if (campaign.launchCampaignComplete && campaign.creditsOpened) {
    runtime.setFlag('postgame_ready');
  }
}

export const LAUNCH_FINALE: {
  id: string;
  name: string;
  description: string;
  distinctFromGlobalCoverage: true;
} = {
  id: LAUNCH_FINALE_EXPEDITION_ID,
  name: 'Launch Finale — Return to the Archive',
  description:
    'Return to the museum hub after documenting a launch-scope field set. Completing this acknowledges the launch campaign — not global species coverage.',
  distinctFromGlobalCoverage: true,
};
