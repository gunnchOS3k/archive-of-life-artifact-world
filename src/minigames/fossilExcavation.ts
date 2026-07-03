interface SedimentParticle {
  x: number;
  y: number;
  r: number;
  removed: boolean;
  isFossil: boolean;
}

export class FossilExcavation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onComplete: () => void;
  private progress = 0;
  private damage = 0;
  private brushing = false;
  private fossilRevealed = 0;
  private sediment: SedimentParticle[] = [];
  private _onMouseDown: (e: MouseEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseUp: () => void;

  constructor(canvas: HTMLCanvasElement, onComplete: () => void, _onCancel: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onComplete = onComplete;
    this.initSediment();
    this._onMouseDown = (e) => { this.brushing = true; this.brush(e); };
    this._onMouseMove = (e) => { if (this.brushing) this.brush(e); };
    this._onMouseUp = () => { this.brushing = false; };
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('mouseleave', this._onMouseUp);
  }

  initSediment() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.sediment = [];
    for (let i = 0; i < 800; i++) {
      this.sediment.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 3 + Math.random() * 6,
        removed: false,
        isFossil: false,
      });
    }
    // Fossil shape in center
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 60;
      this.sediment.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist * 0.6,
        r: 4 + Math.random() * 4,
        removed: false,
        isFossil: true,
      });
    }
  }

  brush(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const brushR = 20;

    for (const s of this.sediment) {
      if (s.removed) continue;
      const d = Math.hypot(s.x - mx, s.y - my);
      if (d < brushR) {
        if (s.isFossil && this.fossilRevealed < 80) {
          this.damage += 2;
        }
        s.removed = true;
        if (s.isFossil) this.fossilRevealed++;
      }
    }

    const total = this.sediment.filter(s => !s.isFossil).length;
    const removed = this.sediment.filter(s => !s.isFossil && s.removed).length;
    this.progress = Math.min(100, (removed / total) * 100);

    if (this.progress >= 95 && this.damage < 30) {
      this.onComplete();
    } else if (this.damage >= 30) {
      this.damage = 0;
      // Reset some fossil particles
      this.sediment.filter(s => s.isFossil).forEach(s => { s.removed = false; });
      this.fossilRevealed = Math.max(0, this.fossilRevealed - 20);
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#5C4033';
    ctx.fillRect(0, 0, w, h);

    for (const s of this.sediment) {
      if (s.removed) continue;
      ctx.fillStyle = s.isFossil ? '#D4C4A8' : '#8B7355';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grid lines for dig site feel
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  getProgress() {
    return { progress: this.progress, damage: this.damage };
  }

  destroy() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('mouseleave', this._onMouseUp);
  }
}
