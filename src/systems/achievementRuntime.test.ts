import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AchievementRuntime,
  memoryPersist,
  type AchievementCatalog,
} from '@/systems/achievementRuntime';

const catalog = JSON.parse(
  readFileSync(join(process.cwd(), 'release/ACHIEVEMENTS.json'), 'utf8'),
) as AchievementCatalog;

describe('GAME-RC-002 Archive AchievementRuntime', () => {
  it('unlocks all 13 catalog entries from real flags/events/stats and persists', () => {
    const persist = memoryPersist();
    const rt = new AchievementRuntime(catalog, persist);
    expect(rt.catalogCount()).toBe(13);
    expect(rt.completionPercent()).toBe(0);
    const hidden = rt.browserEntries().find((e) => e.id === 'aol.hidden_credits');
    expect(hidden?.title).toBe('???');
    expect(hidden?.unlocked).toBe(false);

    rt.reportEvent('observation_complete', 1);
    expect(rt.isUnlocked('aol.first_discovery')).toBe(true);
    const stamp = rt.unlockedAt('aol.first_discovery');
    expect(stamp.length).toBeGreaterThan(0);
    rt.reportEvent('observation_complete', 1);
    expect(rt.unlockedAt('aol.first_discovery')).toBe(stamp);
    expect(rt.unlockedCount()).toBe(1);

    rt.reportEvent('artifact_collected', 1);
    expect(rt.isUnlocked('aol.first_artifact')).toBe(true);
    rt.setStat('regions_explored', 3);
    expect(rt.isUnlocked('aol.region_hopper')).toBe(true);
    rt.setStat('eras_viewed', 2);
    expect(rt.isUnlocked('aol.era_walker')).toBe(true);
    rt.setFlag('provenance_recorded');
    expect(rt.isUnlocked('aol.artifact_provenance')).toBe(true);
    rt.setFlag('archivedex_opened');
    expect(rt.isUnlocked('aol.archivedex')).toBe(true);
    rt.setStat('taxonomic_groups', 2);
    expect(rt.isUnlocked('aol.taxonomy_breadth')).toBe(true);
    rt.setFlag('companion_module_unlocked');
    expect(rt.isUnlocked('aol.lifeling_growth')).toBe(true);
    rt.setFlag('companion_customized');
    expect(rt.isUnlocked('aol.lifeling_style')).toBe(true);
    rt.setFlag('scientific_curiosity');
    expect(rt.isUnlocked('aol.scientific_curiosity')).toBe(true);
    rt.setFlag('launch_campaign_complete');
    expect(rt.isUnlocked('aol.launch_complete')).toBe(true);
    rt.reportEvent('pause_resume', 1);
    expect(rt.isUnlocked('aol.pause_and_breathe')).toBe(true);
    rt.setFlag('finale_acknowledged');
    rt.setFlag('credits_opened');
    expect(rt.isUnlocked('aol.hidden_credits')).toBe(true);

    expect(rt.unlockedCount()).toBe(13);
    expect(rt.completionPercent()).toBe(100);
    const notes = rt.drainNotifications();
    expect(notes.length).toBeGreaterThanOrEqual(13);
    expect(rt.pendingNotificationCount()).toBe(0);

    const rt2 = new AchievementRuntime(catalog, persist);
    expect(rt2.isUnlocked('aol.first_discovery')).toBe(true);
    expect(rt2.unlockedAt('aol.first_discovery')).toBe(stamp);
    expect(rt2.completionPercent()).toBe(100);
    const revealed = rt2.browserEntries().find((e) => e.id === 'aol.hidden_credits');
    expect(revealed?.title).toBe('Archive Credits');
  });
});
