import type { RegionBundle } from '@/schema';
import type { PlayableSpecies } from '@/services/DataCatalogService';

export type Interactable =
  | { type: 'portal'; id: string; label: string; target: string; x: number; y: number; radius: number; color: string }
  | { type: 'species'; speciesId: string; species: PlayableSpecies; x: number; y: number; radius: number }
  | { type: 'fossil'; speciesId: string; species: PlayableSpecies; x: number; y: number; radius: number }
  | { type: 'earth_console'; id: string; label: string; x: number; y: number; radius: number }
  | { type: 'time_atlas'; id: string; label: string; x: number; y: number; radius: number };

interface Decoration {
  type: string;
  x: number;
  y: number;
  size?: number;
  label?: string;
}

export class World {
  private regions: RegionBundle[];
  private speciesById: Map<string, PlayableSpecies>;
  interactables: Interactable[] = [];
  decorations: Decoration[] = [];
  regionData: RegionBundle | null = null;

  constructor(regions: RegionBundle[], speciesById: Map<string, PlayableSpecies>) {
    this.regions = regions;
    this.speciesById = speciesById;
  }

  updateSpeciesMap(speciesById: Map<string, PlayableSpecies>) {
    this.speciesById = speciesById;
  }

  loadRegion(regionId: string) {
    this.regionData = this.regions.find((r) => r.id === regionId) ?? null;
    this.interactables = [];
    this.decorations = [];
    if (!this.regionData) return;

    const w = 800;
    const h = 600;
    const biome = this.regionData.biome;
    this.generateDecorations(biome, w, h);

    if (regionId === 'museum') {
      const portals = [
        { id: 'portal_savanna', label: 'Savanna', target: 'savanna', x: 150, y: 200, color: '#C4A35A' },
        { id: 'portal_forest', label: 'Forest', target: 'forest', x: 650, y: 200, color: '#2D5A27' },
        { id: 'portal_wetland', label: 'Wetland', target: 'wetland', x: 150, y: 450, color: '#3D6B5E' },
        { id: 'portal_coastal', label: 'Coast', target: 'coastal', x: 650, y: 450, color: '#2B6CB0' },
        { id: 'portal_fossil', label: 'Fossil Site', target: 'fossil_site', x: 400, y: 500, color: '#8B7355' },
      ];
      for (const p of portals) {
        this.interactables.push({ type: 'portal', ...p, radius: 35 });
      }
      this.decorations.push({ type: 'building', x: 400, y: 280, label: 'Archive Museum' });
      this.interactables.push({
        type: 'earth_console',
        id: 'earth_console',
        label: 'Earth Layer Console',
        x: 520,
        y: 280,
        radius: 32,
      });
      this.interactables.push({
        type: 'time_atlas',
        id: 'time_atlas',
        label: 'Time Atlas',
        x: 280,
        y: 280,
        radius: 32,
      });
    } else {
      const speciesIds = this.regionData.speciesIds ?? [];
      const positions = this.scatterPositions(speciesIds.length, w, h);
      speciesIds.forEach((speciesId, i) => {
        const sp = this.speciesById.get(speciesId);
        if (!sp) return;
        const isFossil = sp.conservationStatus === 'Extinct';
        const base = { speciesId, species: sp, x: positions[i].x, y: positions[i].y, radius: 28 };
        this.interactables.push(isFossil ? { type: 'fossil', ...base } : { type: 'species', ...base });
      });
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

  private scatterPositions(count: number, w: number, h: number) {
    const positions: { x: number; y: number }[] = [];
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

  private generateDecorations(biome: string, w: number, h: number) {
    const counts = { trees: 12, rocks: 6, grass: 20 };
    if (biome === 'savanna') counts.trees = 4;
    if (biome === 'wetland') counts.trees = 6;
    if (biome === 'coastal') { counts.trees = 2; counts.rocks = 10; }
    if (biome === 'fossil_bed') { counts.trees = 1; counts.rocks = 15; }
    if (biome === 'museum') { counts.trees = 8; counts.rocks = 3; }

    for (let i = 0; i < counts.trees; i++) {
      this.decorations.push({ type: 'tree', x: 60 + Math.random() * (w - 120), y: 60 + Math.random() * (h - 120), size: 15 + Math.random() * 20 });
    }
    for (let i = 0; i < counts.rocks; i++) {
      this.decorations.push({ type: 'rock', x: 40 + Math.random() * (w - 80), y: 40 + Math.random() * (h - 80), size: 8 + Math.random() * 15 });
    }
    for (let i = 0; i < counts.grass; i++) {
      this.decorations.push({ type: 'grass', x: Math.random() * w, y: Math.random() * h });
    }
  }

  getNearestInteractable(px: number, py: number, maxDist = 50): Interactable | null {
    let nearest: Interactable | null = null;
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

  private getBiomeColor(): string {
    const colors: Record<string, string> = {
      museum: '#3D4F3D', savanna: '#C4A35A', forest: '#1E3D1E', wetland: '#2A4F45',
      coastal: '#1A3A5C', fossil_bed: '#6B5B45', grassland: '#8BA84A',
    };
    return colors[this.regionData?.biome ?? ''] || '#2d4a2d';
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = this.getBiomeColor();
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (const d of this.decorations) this.drawDecoration(ctx, d);
    for (const item of this.interactables) this.drawInteractable(ctx, item);
  }

  private drawDecoration(ctx: CanvasRenderingContext2D, d: Decoration) {
    if (d.type === 'tree' && d.size) {
      ctx.fillStyle = '#4A3020';
      ctx.fillRect(d.x - 3, d.y, 6, d.size);
      ctx.fillStyle = '#2D5A27';
      ctx.beginPath();
      ctx.arc(d.x, d.y - d.size * 0.3, d.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.type === 'rock' && d.size) {
      ctx.fillStyle = '#6B6B6B';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.size, d.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.type === 'grass') {
      ctx.strokeStyle = 'rgba(100,160,80,0.4)';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y - 8);
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 2, d.y - 6);
      ctx.stroke();
    } else if (d.type === 'building') {
      ctx.fillStyle = '#4A6741';
      ctx.fillRect(d.x - 60, d.y - 40, 120, 80);
      ctx.fillStyle = '#6B8F5E';
      ctx.beginPath();
      ctx.moveTo(d.x - 70, d.y - 40); ctx.lineTo(d.x, d.y - 80); ctx.lineTo(d.x + 70, d.y - 40);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E8E4D9';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label ?? '', d.x, d.y + 55);
    }
  }

  private drawInteractable(ctx: CanvasRenderingContext2D, item: Interactable) {
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
      const icons: Record<string, string> = { Mammal: '🐾', Insect: '🐛', Arachnid: '🕸️' };
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
    } else if (item.type === 'earth_console') {
      ctx.fillStyle = '#1E3A5F';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🛰️', item.x, item.y + 8);
      ctx.fillStyle = '#E8E4D9';
      ctx.font = '10px sans-serif';
      ctx.fillText('Earth Console', item.x, item.y + item.radius + 12);
    } else if (item.type === 'time_atlas') {
      ctx.fillStyle = '#4A3728';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏳', item.x, item.y + 8);
      ctx.fillStyle = '#E8E4D9';
      ctx.font = '10px sans-serif';
      ctx.fillText('Time Atlas', item.x, item.y + item.radius + 12);
    }
  }
}
