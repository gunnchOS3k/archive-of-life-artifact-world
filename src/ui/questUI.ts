import type { SaveState, Quest, SpeciesIndexEntry } from '@/schema';
import { getQuestProgress } from '@/systems/questSystem';

export class QuestUI {
  private list: HTMLElement;

  constructor(container: HTMLElement) {
    this.list = container.querySelector('#quest-list')!;
  }

  setData(state: SaveState, quests: Quest[], indexEntries: SpeciesIndexEntry[]) {
    const active = state.quests.active.map((id) => quests.find((q) => q.id === id)).filter(Boolean) as Quest[];
    const completed = state.quests.completed.map((id) => quests.find((q) => q.id === id)).filter(Boolean) as Quest[];

    let html = '';
    if (active.length === 0 && completed.length === 0) {
      html = '<p style="color:var(--text-secondary)">No quests available.</p>';
    }
    for (const quest of active) {
      html += this.renderQuest(quest, getQuestProgress(state, quest, indexEntries), false);
    }
    for (const quest of completed) {
      html += this.renderQuest(quest, getQuestProgress(state, quest, indexEntries), true);
    }
    this.list.innerHTML = html;
  }

  private renderQuest(quest: Quest, progress: ReturnType<typeof getQuestProgress>, complete: boolean) {
    const objectives = progress.objectives
      .map(
        (obj) => `
      <div class="quest-objective ${obj.done ? 'done' : ''}">
        <span class="check">${obj.done ? '✅' : '⬜'}</span>
        ${obj.label}
      </div>
    `
      )
      .join('');
    return `
      <div class="quest-card ${complete ? 'complete' : ''}">
        <h4>${quest.title} ${complete ? '✓' : ''}</h4>
        <p class="quest-desc">${quest.description}</p>
        ${objectives}
        ${complete ? `<p style="color:var(--accent-green);font-size:0.85rem;margin-top:0.5rem">Reward: ${quest.reward}</p>` : ''}
      </div>
    `;
  }
}
