export interface Bounds {
  width: number;
  height: number;
}

export class Player {
  x: number;
  y: number;
  speed = 180;
  radius = 14;
  facing = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number, keys: Record<string, boolean>, bounds: Bounds) {
    let dx = 0;
    let dy = 0;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.facing = Math.atan2(dy, dx);
    }

    this.x += dx * this.speed * dt;
    this.y += dy * this.speed * dt;
    this.x = Math.max(this.radius, Math.min(bounds.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(bounds.height - this.radius, this.y));
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facing);
    ctx.fillStyle = '#4A7C59';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-10, -18, 20, 6);
    ctx.fillRect(-6, -24, 12, 8);
    ctx.fillStyle = '#6B4423';
    ctx.fillRect(-8, -4, 6, 12);
    ctx.fillStyle = '#E8E4D9';
    ctx.beginPath();
    ctx.arc(8, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
