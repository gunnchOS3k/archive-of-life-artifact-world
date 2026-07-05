import type { PlayableSpecies } from '@/services/DataCatalogService';

export class WildlifeObservation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private species: PlayableSpecies;
  private onComplete: () => void;
  patience = 0;
  private alertness = 30;
  holding = false;
  private animalX: number;
  private animalY: number;
  private animalDir = 1;
  private timer = 0;
  private complete = false;
  private _onKeyDown: (e: KeyboardEvent) => void;
  private _onKeyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, species: PlayableSpecies, onComplete: () => void, _onCancel: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.species = species;
    this.onComplete = onComplete;
    this.animalX = canvas.width / 2;
    this.animalY = canvas.height / 2 + 30;
    this.animalDir = 1;
    this.timer = 0;
    this.complete = false;

    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.holding = true;
      }
    };
    this._onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') this.holding = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  update(dt: number) {
    if (this.complete) return;

    this.timer += dt;
    this.animalX += this.animalDir * 30 * dt;
    if (this.animalX < 80 || this.animalX > this.canvas.width - 80) {
      this.animalDir *= -1;
    }

    if (this.holding) {
      this.patience = Math.min(100, this.patience + 25 * dt);
      this.alertness = Math.max(0, this.alertness - 15 * dt);
    } else {
      this.alertness = Math.min(100, this.alertness + 10 * dt);
      this.patience = Math.max(0, this.patience - 5 * dt);
    }

    if (this.alertness >= 100) {
      this.patience = Math.max(0, this.patience - 30);
      this.alertness = 20;
    }

    if (this.patience >= 100) {
      this.complete = true;
      this.onComplete();
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky/ground
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.6, '#8BA84A');
    gradient.addColorStop(1, '#5A7A3A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Bushes
    ctx.fillStyle = '#2D5A27';
    ctx.beginPath();
    ctx.ellipse(60, h - 40, 50, 30, 0, 0, Math.PI * 2);
    ctx.ellipse(w - 60, h - 50, 40, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Simple silhouette drawn for observation minigame
    const alert = this.alertness / 100;
    ctx.save();
    ctx.translate(this.animalX, this.animalY);
    if (this.animalDir < 0) ctx.scale(-1, 1);

    const icons: Record<string, string> = { Mammal: '🦁', Insect: '🦋', Arachnid: '🕷️', Reptile: '🦎' };
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(icons[this.species.group] || '🐾', 0, 0);

    if (alert > 0.5) {
      ctx.font = '20px sans-serif';
      ctx.fillText('!', 20, -30);
    }

    ctx.restore();

    // Viewfinder
    ctx.strokeStyle = this.holding ? '#7EC8A3' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    const vfSize = 80;
    ctx.strokeRect(w / 2 - vfSize / 2, h / 2 - vfSize / 2 - 20, vfSize, vfSize);

    // Instructions
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.holding ? 'Observing... stay still!' : 'Hold Space to observe quietly', w / 2, h - 15);
  }

  getPatience() {
    return this.patience;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}
