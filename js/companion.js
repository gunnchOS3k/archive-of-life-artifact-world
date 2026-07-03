export class Lifeling {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.followDistance = 40;
    this.speed = 160;
    this.bobPhase = 0;
    this.emote = null;
    this.emoteTimer = 0;
    this.reactionTimer = 0;
    this.hopPhase = 0;
  }

  update(dt, playerX, playerY, companionState) {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.followDistance) {
      const nx = dx / dist;
      const ny = dy / dist;
      this.x += nx * this.speed * dt;
      this.y += ny * this.speed * dt;
    }

    this.bobPhase += dt * 4;
    this.hopPhase += dt * 6;

    if (this.emoteTimer > 0) {
      this.emoteTimer -= dt;
      if (this.emoteTimer <= 0) this.emote = null;
    }

    if (this.reactionTimer > 0) {
      this.reactionTimer -= dt;
    }
  }

  triggerReaction(type = 'celebrate') {
    this.emote = type;
    this.emoteTimer = 2;
    this.reactionTimer = 2;
  }

  draw(ctx, companionState, traits) {
    const bob = Math.sin(this.bobPhase) * 3;
    const hasHop = companionState.equippedTraits.includes('frog_hop');
    const hop = hasHop ? Math.abs(Math.sin(this.hopPhase)) * 8 : 0;

    ctx.save();
    ctx.translate(this.x, this.y - bob - hop);

    const size = 16;
    const color = companionState.bodyColor || '#7EC8A3';

    // Aura effects
    if (companionState.equippedTraits.includes('butterfly_shimmer')) {
      ctx.globalAlpha = 0.3 + Math.sin(this.bobPhase * 2) * 0.15;
      ctx.fillStyle = '#FF6600';
      ctx.beginPath();
      ctx.arc(0, 0, size + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (companionState.equippedTraits.includes('bee_pollen_trail')) {
      ctx.fillStyle = '#FFD700';
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(-15 - i * 8, Math.sin(this.bobPhase + i) * 5, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Patterns
    if (companionState.equippedTraits.includes('tiger_stripes')) {
      ctx.strokeStyle = '#FF8C00';
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 4, -size);
        ctx.lineTo(i * 3, size);
        ctx.stroke();
      }
    }

    if (companionState.equippedTraits.includes('penguin_belly')) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(0, 4, size * 0.6, size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (companionState.equippedTraits.includes('mammoth_fur')) {
      ctx.strokeStyle = '#8B7355';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * size, Math.sin(angle) * size * 0.85);
        ctx.lineTo(Math.cos(angle) * (size + 5), Math.sin(angle) * (size * 0.85 + 5));
        ctx.stroke();
      }
    }

    // Back traits
    if (companionState.equippedTraits.includes('beetle_shell_back')) {
      ctx.fillStyle = '#2E8B2E';
      ctx.beginPath();
      ctx.ellipse(0, -2, size * 0.9, size * 0.6, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    if (companionState.equippedTraits.includes('trilobite_plates')) {
      ctx.fillStyle = '#5C4033';
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(i * 5 - 2, -size * 0.7, 5, 8);
      }
    }

    // Head traits
    if (companionState.equippedTraits.includes('lion_mane_small')) {
      ctx.fillStyle = '#D4A017';
      ctx.beginPath();
      ctx.arc(0, -4, size + 4, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    if (companionState.equippedTraits.includes('deer_antlers_small')) {
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -size);
      ctx.lineTo(-10, -size - 10);
      ctx.moveTo(6, -size);
      ctx.lineTo(10, -size - 10);
      ctx.stroke();
    }

    if (companionState.equippedTraits.includes('rex_crest')) {
      ctx.fillStyle = '#8B0000';
      ctx.beginPath();
      ctx.moveTo(0, -size - 2);
      ctx.lineTo(-8, -size - 8);
      ctx.lineTo(8, -size - 8);
      ctx.closePath();
      ctx.fill();
    }

    // Eyes
    const eyeColor = companionState.equippedTraits.includes('owl_eye_markings') ? '#F5E6C8' : '#1a1a1a';
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(-5, -4, 4, 0, Math.PI * 2);
    ctx.arc(5, -4, 4, 0, Math.PI * 2);
    ctx.fill();

    if (companionState.equippedTraits.includes('owl_eye_markings')) {
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(-5, -4, 2, 0, Math.PI * 2);
      ctx.arc(5, -4, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ears
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(-14, -18);
    ctx.lineTo(-6, -12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, -10);
    ctx.lineTo(14, -18);
    ctx.lineTo(6, -12);
    ctx.closePath();
    ctx.fill();

    // Tail
    if (companionState.equippedTraits.includes('wolf_tail')) {
      ctx.fillStyle = '#6B6B6B';
      ctx.beginPath();
      ctx.ellipse(size + 4, 2, 8, 5, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(size - 2, 0, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Emote bubbles
    if (this.emote === 'celebrate') {
      ctx.font = '16px sans-serif';
      ctx.fillText('✨', 0, -size - 15);
    } else if (this.emote === 'sniff') {
      ctx.font = '14px sans-serif';
      ctx.fillText('👃', 12, -size - 10);
    } else if (this.emote === 'dig') {
      ctx.font = '14px sans-serif';
      ctx.fillText('⛏️', 0, -size - 12);
    }

    if (this.reactionTimer > 0) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size + 6 + Math.sin(this.bobPhase * 3) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawPreview(ctx, companionState, size = 100) {
    const prev = { x: this.x, y: this.y };
    this.x = size / 2;
    this.y = size / 2 + 10;
    ctx.clearRect(0, 0, size, size);
    this.draw(ctx, companionState, []);
    this.x = prev.x;
    this.y = prev.y;
  }
}
