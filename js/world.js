export class World {
  constructor(gameData) {
    this.gameData = gameData;
    this.interactables = [];
    this.decorations = [];
    this.regionData = null;
  }

  loadRegion(regionId) {
    this.regionData = this.gameData.regions.find(r => r.id === regionId);
    this.interactables = [];
    this.decorations = [];

    const w = 800, h = 600;
    const biome = this.regionData.biome;

    // Generate biome decorations
    this.generateDecorations(biome, w, h);

    // Museum hub portals
    if (regionId === 'museum') {
      const portals = [
        { id: 'portal_savanna', label: 'Savanna', target: 'savanna', x: 150, y: 200, color: '#C4A35A' },
        { id: 'portal_forest', label: 'Forest', target: 'forest', x: 650, y: 200, color: '#2D5A27' },
        { id: 'portal_wetland', label: 'Wetland', target: 'wetland', x: 150, y: 450, color: '#3D6B5E' },
        { id: 'portal_coastal', label: 'Coast', target: 'coastal', x: 650, y: 450, color: '#2B6CB0' },
        { id: 'portal_fossil', label: 'Fossil Site', target: 'fossil_site', x: 400, y: 500, color: '#8B7355' },
      ];
      for (const p of portals) {
        this.interactables.push({
          type: 'portal',
          ...p,
          radius: 35,
        });
      }
      this.decorations.push({ type: 'building', x: 400, y: 280, label: 'Archive Museum' });
    } else {
      // Species encounter points
      const species = this.regionData.species || [];
      const positions = this.scatterPositions(species.length, w, h);
      species.forEach((speciesId, i) => {
        const sp = this.gameData.speciesById[speciesId];
        if (!sp) return;
        const isFossil = sp.conservationStatus === 'Extinct';
        this.interactables.push({
          type: isFossil ? 'fossil' : 'species',
          speciesId,
          species: sp,
          x: positions[i].x,
          y: positions[i].y,
          radius: 28,
          discovered: false,
        });
      });

      // Return portal to museum
      this.interactables.push({
        type: 'portal',
        id: 'portal_museum',
        label: 'Return to Museum',
        target: 'museum',
        x: 60,
        y: 540,
        radius: 30,
        color: '#4A6741',
      });
    }
  }

  scatterPositions(count, w, h) {
    const positions = [];
    const margin = 80;
    const cols = Math.ceil(Math.sqrt(count));
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cellW = (w - margin * 2) / cols;
      const cellH = (h - margin * 2) / Math.ceil(count / cols);
      positions.push({
        x: margin + col * cellW + cellW / 2 + (Math.random() - 0.5) * 40,
        y: margin + row * cellH + cellH / 2 + (Math.random() - 0.5) * 40,
      });
    }
    return positions;
  }

  generateDecorations(biome, w, h) {
    const counts = { trees: 12, rocks: 6, grass: 20 };
    if (biome === 'savanna') counts.trees = 4;
    if (biome === 'wetland') counts.trees = 6;
    if (biome === 'coastal') { counts.trees = 2; counts.rocks = 10; }
    if (biome === 'fossil_bed') { counts.trees = 1; counts.rocks = 15; }
    if (biome === 'museum') { counts.trees = 8; counts.rocks = 3; }

    for (let i = 0; i < counts.trees; i++) {
      this.decorations.push({
        type: 'tree',
        x: 60 + Math.random() * (w - 120),
        y: 60 + Math.random() * (h - 120),
        size: 15 + Math.random() * 20,
      });
    }
    for (let i = 0; i < counts.rocks; i++) {
      this.decorations.push({
        type: 'rock',
        x: 40 + Math.random() * (w - 80),
        y: 40 + Math.random() * (h - 80),
        size: 8 + Math.random() * 15,
      });
    }
    for (let i = 0; i < counts.grass; i++) {
      this.decorations.push({
        type: 'grass',
        x: Math.random() * w,
        y: Math.random() * h,
      });
    }
  }

  getNearestInteractable(px, py, maxDist = 50) {
    let nearest = null;
    let minDist = maxDist;
    for (const item of this.interactables) {
      const d = Math.hypot(item.x - px, item.y - py);
      if (d < minDist) {
        minDist = d;
        nearest = item;
      }
    }
    return nearest;
  }

  getBiomeColor() {
    const colors = {
      museum: '#3D4F3D',
      savanna: '#C4A35A',
      forest: '#1E3D1E',
      wetland: '#2A4F45',
      coastal: '#1A3A5C',
      fossil_bed: '#6B5B45',
      grassland: '#8BA84A',
    };
    return colors[this.regionData?.biome] || '#2d4a2d';
  }

  draw(ctx, w, h) {
    // Ground
    ctx.fillStyle = this.getBiomeColor();
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Decorations
    for (const d of this.decorations) {
      this.drawDecoration(ctx, d);
    }

    // Interactables
    for (const item of this.interactables) {
      this.drawInteractable(ctx, item);
    }
  }

  drawDecoration(ctx, d) {
    if (d.type === 'tree') {
      ctx.fillStyle = '#4A3020';
      ctx.fillRect(d.x - 3, d.y, 6, d.size);
      ctx.fillStyle = '#2D5A27';
      ctx.beginPath();
      ctx.arc(d.x, d.y - d.size * 0.3, d.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.type === 'rock') {
      ctx.fillStyle = '#6B6B6B';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.size, d.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.type === 'grass') {
      ctx.strokeStyle = 'rgba(100,160,80,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 2, d.y - 8);
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + 2, d.y - 6);
      ctx.stroke();
    } else if (d.type === 'building') {
      ctx.fillStyle = '#4A6741';
      ctx.fillRect(d.x - 60, d.y - 40, 120, 80);
      ctx.fillStyle = '#6B8F5E';
      ctx.beginPath();
      ctx.moveTo(d.x - 70, d.y - 40);
      ctx.lineTo(d.x, d.y - 80);
      ctx.lineTo(d.x + 70, d.y - 40);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#E8E4D9';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, d.x, d.y + 55);
    }
  }

  drawInteractable(ctx, item) {
    if (item.type === 'portal') {
      ctx.fillStyle = item.color;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#E8E4D9';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, item.x, item.y + item.radius + 14);
    } else if (item.type === 'species') {
      const pulse = Math.sin(Date.now() / 500) * 3;
      ctx.strokeStyle = '#7EC8A3';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const icons = { Mammal: '🐾', Insect: '🐛', Arachnid: '🕸️' };
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(icons[item.species.group] || '🔍', item.x, item.y + 8);
    } else if (item.type === 'fossil') {
      ctx.fillStyle = '#8B7355';
      ctx.beginPath();
      ctx.ellipse(item.x, item.y, item.radius, item.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🦴', item.x, item.y + 8);
    }
  }
}
