import type { SaveState } from '@/schema';

export class NotebookUI {
  private entries: HTMLElement;

  constructor(container: HTMLElement) {
    this.entries = container.querySelector('#notebook-entries')!;
  }

  setData(state: SaveState) {
    if (state.notebook.length === 0) {
      this.entries.innerHTML =
        '<p style="color:var(--text-secondary)">Your field notebook is empty. Explore regions and collect artifacts to fill it.</p>';
      return;
    }
    this.entries.innerHTML = state.notebook
      .map(
        (entry) => `
      <div class="notebook-entry">
        <div class="entry-time">${new Date(entry.time).toLocaleString()}</div>
        <div class="entry-text">${entry.text}</div>
      </div>
    `
      )
      .join('');
  }
}
