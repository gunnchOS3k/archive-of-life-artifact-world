import type { AchievementRuntime } from '@/systems/achievementRuntime';

export class AchievementsUI {
  private root: HTMLElement;
  private runtime: AchievementRuntime;

  constructor(panel: HTMLElement, runtime: AchievementRuntime) {
    this.root = panel.querySelector('.panel-body') ?? panel;
    this.runtime = runtime;
  }

  open(): void {
    this.render();
  }

  render(): void {
    const percent = this.runtime.completionPercent();
    const unlocked = this.runtime.unlockedCount();
    const total = this.runtime.catalogCount();
    const rows = this.runtime.browserEntries()
      .map((entry) => {
        const stamp = entry.unlocked && entry.unlocked_at
          ? `<time datetime="${entry.unlocked_at}">${entry.unlocked_at.slice(0, 10)}</time>`
          : '';
        return `<article class="ach-row${entry.unlocked ? ' ach-unlocked' : ''}" data-id="${entry.id}">
          <div class="ach-title">${entry.title}</div>
          <div class="ach-desc">${entry.description}</div>
          <div class="ach-meta">${Math.round(entry.percent)}% · ${entry.current}/${entry.target} ${stamp}</div>
        </article>`;
      })
      .join('');
    this.root.innerHTML = `
      <p class="ach-summary" aria-live="polite">Launch campaign achievements: ${unlocked}/${total} (${Math.round(percent)}%). Not global species coverage.</p>
      <div class="ach-list">${rows}</div>
    `;
  }
}
