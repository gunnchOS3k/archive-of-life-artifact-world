import { Lifeling } from '../companion.js';

export class CompanionUI {
  constructor(panel) {
    this.panel = panel;
    this.canvas = panel.querySelector('#companion-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.nameInput = panel.querySelector('#companion-name');
    this.colorInput = panel.querySelector('#companion-color');
    this.equippedEl = panel.querySelector('#equipped-traits');
    this.inventoryEl = panel.querySelector('#trait-inventory');
    this.emoteEl = panel.querySelector('#emote-buttons');
    this.lifeling = new Lifeling();
    this.onChange = null;

    this.nameInput.addEventListener('input', () => this.updateCompanion());
    this.colorInput.addEventListener('input', () => this.updateCompanion());
  }

  setData(gameData, state) {
    this.gameData = gameData;
    this.state = state;
    this.nameInput.value = state.companion.name;
    this.colorInput.value = state.companion.bodyColor;
    this.render();
  }

  updateCompanion() {
    this.state.companion.name = this.nameInput.value;
    this.state.companion.bodyColor = this.colorInput.value;
    this.renderPreview();
    if (this.onChange) this.onChange();
  }

  render() {
    if (!this.gameData || !this.state) return;
    this.renderTraits();
    this.renderEmotes();
    this.renderPreview();
  }

  renderPreview() {
    this.lifeling.drawPreview(this.ctx, this.state.companion, 200);
  }

  renderTraits() {
    const { traits } = this.gameData;
    const { companion } = this.state;
    const cosmeticTraits = traits.filter(t => t.category !== 'emote');

    this.equippedEl.innerHTML = companion.equippedTraits.length
      ? companion.equippedTraits.map(id => {
          const t = traits.find(tr => tr.id === id);
          return t ? `<span class="trait-chip equipped" data-id="${id}">${t.name} ✓</span>` : '';
        }).join('')
      : '<span style="color:var(--text-secondary);font-size:0.85rem">No traits equipped</span>';

    this.inventoryEl.innerHTML = cosmeticTraits.map(t => {
      const unlocked = companion.unlockedTraits.includes(t.id);
      const equipped = companion.equippedTraits.includes(t.id);
      return `<span class="trait-chip ${unlocked ? '' : 'locked'} ${equipped ? 'equipped' : ''}"
                   data-id="${t.id}" title="${t.description}">
                ${t.name}
              </span>`;
    }).join('');

    this.inventoryEl.querySelectorAll('.trait-chip:not(.locked)').forEach(chip => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.id;
        const trait = traits.find(t => t.id === id);
        if (!trait) return;

        const idx = companion.equippedTraits.indexOf(id);
        if (idx >= 0) {
          companion.equippedTraits.splice(idx, 1);
        } else {
          // One per category
          companion.equippedTraits = companion.equippedTraits.filter(eid => {
            const et = traits.find(t => t.id === eid);
            return et?.category !== trait.category;
          });
          companion.equippedTraits.push(id);
        }
        this.render();
        if (this.onChange) this.onChange();
      });
    });
  }

  renderEmotes() {
    const emotes = this.gameData.traits.filter(t => t.category === 'emote');
    const { companion } = this.state;

    this.emoteEl.innerHTML = emotes.map(e => {
      const unlocked = companion.unlockedTraits.includes(e.id);
      return `<button class="emote-btn" data-emote="${e.id}" ${unlocked ? '' : 'disabled'}>${e.name}</button>`;
    }).join('');

    this.emoteEl.querySelectorAll('.emote-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoteName = btn.dataset.emote.replace('_emote', '');
        if (this.onEmote) this.onEmote(emoteName);
      });
    });
  }

  setEmoteCallback(cb) {
    this.onEmote = cb;
  }
}
