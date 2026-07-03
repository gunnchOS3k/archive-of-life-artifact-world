import { getQuestProgress } from '../systems/questSystem.js';

export class QuestUI {
  constructor(container) {
    this.list = container.querySelector('#quest-list');
  }

  setData(gameData, state) {
    this.gameData = gameData;
    this.state = state;
    this.render();
  }

  render() {
    if (!this.gameData || !this.state) return;

    const active = this.state.quests.active.map(id => this.gameData.quests.find(q => q.id === id)).filter(Boolean);
    const completed = this.state.quests.completed.map(id => this.gameData.quests.find(q => q.id === id)).filter(Boolean);

    let html = '';

    if (active.length === 0 && completed.length === 0) {
      html = '<p style="color:var(--text-secondary)">No quests available.</p>';
    }

    for (const quest of active) {
      const progress = getQuestProgress(this.state, quest, this.gameData);
      html += this.renderQuest(quest, progress, false);
    }

    for (const quest of completed) {
      const progress = getQuestProgress(this.state, quest, this.gameData);
      html += this.renderQuest(quest, progress, true);
    }

    this.list.innerHTML = html;
  }

  renderQuest(quest, progress, complete) {
    const objectives = progress.objectives.map(obj => `
      <div class="quest-objective ${obj.done ? 'done' : ''}">
        <span class="check">${obj.done ? '✅' : '⬜'}</span>
        ${obj.label}
      </div>
    `).join('');

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
