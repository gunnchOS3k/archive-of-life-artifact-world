import type { SaveState, LifelingTrait } from '@/schema';
import { Lifeling } from '@/game/companion';

export class CompanionUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nameInput: HTMLInputElement;
  private colorInput: HTMLInputElement;
  private equippedEl: HTMLElement;
  private inventoryEl: HTMLElement;
  private emoteEl: HTMLElement;
  private lifeling = new Lifeling();
  private state: SaveState | null = null;
  private traits: LifelingTrait[] = [];
  onChange: (() => void) | null = null;
  private onEmote: ((emote: string) => void) | null = null;

  constructor(panel: HTMLElement) {
    this.canvas = panel.querySelector('#companion-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.nameInput = panel.querySelector('#companion-name') as HTMLInputElement;
    this.colorInput = panel.querySelector('#companion-color') as HTMLInputElement;
    this.equippedEl = panel.querySelector('#equipped-traits')!;
    this.inventoryEl = panel.querySelector('#trait-inventory')!;
    this.emoteEl = panel.querySelector('#emote-buttons')!;

    this.nameInput.addEventListener('input', () => this.updateCompanion());
    this.colorInput.addEventListener('input', () => this.updateCompanion());
  }

  setEmoteCallback(cb: (emote: string) => void) {
    this.onEmote = cb;
  }

  setData(state: SaveState, traits: LifelingTrait[]) {
    this.state = state;
    this.traits = traits;
    this.nameInput.value = state.companion.name;
    this.colorInput.value = state.companion.bodyColor;
    this.render();
  }

  private updateCompanion() {
    if (!this.state) return;
    this.state.companion.name = this.nameInput.value;
    this.state.companion.bodyColor = this.colorInput.value;
    this.renderPreview();
    this.onChange?.();
  }

  private render() {
    if (!this.state) return;
    this.renderTraits();
    this.renderEmotes();
    this.renderPreview();
  }

  private renderPreview() {
    if (!this.state) return;
    this.lifeling.drawPreview(this.ctx, this.state.companion, 200);
  }

  private renderTraits() {
    if (!this.state) return;
    const cosmeticTraits = this.traits.filter((t) => t.category !== 'emote');
    const { companion } = this.state;

    this.equippedEl.innerHTML = companion.equippedTraits.length
      ? companion.equippedTraits
          .map((id) => {
            const t = this.traits.find((tr) => tr.id === id);
            return t ? `<span class="trait-chip equipped" data-id="${id}">${t.name} ✓</span>` : '';
          })
          .join('')
      : '<span style="color:var(--text-secondary);font-size:0.85rem">No traits equipped</span>';

    this.inventoryEl.innerHTML = cosmeticTraits
      .map((t) => {
        const unlocked = companion.unlockedTraits.includes(t.id);
        const equipped = companion.equippedTraits.includes(t.id);
        return `<span class="trait-chip ${unlocked ? '' : 'locked'} ${equipped ? 'equipped' : ''}"
                 data-id="${t.id}" title="${t.description}">${t.name}</span>`;
      })
      .join('');

    this.inventoryEl.querySelectorAll('.trait-chip:not(.locked)').forEach((chip) => {
      chip.addEventListener('click', () => {
        const id = (chip as HTMLElement).dataset.id!;
        const trait = this.traits.find((t) => t.id === id);
        if (!trait || !this.state) return;
        const idx = this.state.companion.equippedTraits.indexOf(id);
        if (idx >= 0) {
          this.state.companion.equippedTraits.splice(idx, 1);
        } else {
          this.state.companion.equippedTraits = this.state.companion.equippedTraits.filter((eid) => {
            const et = this.traits.find((t) => t.id === eid);
            return et?.category !== trait.category;
          });
          this.state.companion.equippedTraits.push(id);
        }
        this.render();
        this.onChange?.();
      });
    });
  }

  private renderEmotes() {
    if (!this.state) return;
    const emotes = this.traits.filter((t) => t.category === 'emote');
    const { companion } = this.state;

    this.emoteEl.innerHTML = emotes
      .map((e) => {
        const unlocked = companion.unlockedTraits.includes(e.id);
        return `<button class="emote-btn" data-emote="${e.id}" ${unlocked ? '' : 'disabled'}>${e.name}</button>`;
      })
      .join('');

    this.emoteEl.querySelectorAll('.emote-btn:not(:disabled)').forEach((btn) => {
      btn.addEventListener('click', () => {
        const emoteName = (btn as HTMLElement).dataset.emote!.replace('_emote', '');
        this.onEmote?.(emoteName);
      });
    });
  }
}
