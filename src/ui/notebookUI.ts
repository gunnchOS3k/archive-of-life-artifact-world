import type { SaveState } from '@/schema';
import { renderSourcesEvidencePanel } from '@/ui/evidence/SourcesEvidencePanel';

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
        (entry, i) => `
      <div class="notebook-entry" data-species-id="${entry.speciesId}">
        <div class="entry-time">${new Date(entry.time).toLocaleString()}</div>
        <div class="entry-text">${entry.text}</div>
        <button type="button" class="btn-secondary notebook-evidence-btn" data-idx="${i}" data-species-id="${entry.speciesId}">Sources &amp; Evidence</button>
        <div class="notebook-evidence-mount evidence-panel hidden" id="notebook-evidence-${i}"></div>
      </div>
    `,
      )
      .join('');

    this.entries.querySelectorAll('.notebook-evidence-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const el = btn as HTMLButtonElement;
        const idx = el.dataset.idx!;
        const speciesId = el.dataset.speciesId!;
        const mount = this.entries.querySelector(`#notebook-evidence-${idx}`) as HTMLElement | null;
        if (!mount) return;
        const opening = mount.classList.contains('hidden');
        this.entries.querySelectorAll('.notebook-evidence-mount').forEach((m) => m.classList.add('hidden'));
        if (!opening) return;
        mount.classList.remove('hidden');
        const entry = state.notebook[Number(idx)];
        const sciMatch = entry?.text.match(/\(([^)]+)\)/);
        void renderSourcesEvidencePanel(mount, speciesId, sciMatch?.[1]);
      });
    });
  }
}
