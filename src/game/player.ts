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

  update(
    dt: number,
    keys: Record<string, boolean>,
    bounds: Bounds,
    solids: Array<{ x: number; y: number; radius: number }> = [],
  ) {
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

    const blocked = (nx: number, ny: number) =>
      solids.some((s) => Math.hypot(nx - s.x, ny - s.y) < s.radius + this.radius);

    const nextX = this.x + dx * this.speed * dt;
    const nextY = this.y + dy * this.speed * dt;
    if (!blocked(nextX, this.y)) this.x = nextX;
    if (!blocked(this.x, nextY)) this.y = nextY;
    this.x = Math.max(this.radius, Math.min(bounds.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(bounds.height - this.radius, this.y));
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facing);
    ctx.fillStyle = '#C4A574';
    ctx.fillRect(-9, -6, 18, 14);
    ctx.fillStyle = '#F2D4A5';
    ctx.beginPath();
    ctx.arc(0, -14, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4A7C45';
    ctx.fillRect(-12, -4, 8, 16);
    ctx.fillRect(4, -4, 6, 14);
    ctx.fillStyle = '#6B4423';
    ctx.fillRect(-7, 8, 5, 10);
    ctx.fillRect(2, 8, 5, 10);
    ctx.fillStyle = '#3D5A2E';
    ctx.beginPath();
    ctx.arc(-14, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
