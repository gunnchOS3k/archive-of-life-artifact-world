/**
 * Procedural observation silhouette stubs — mode-shaped underpaint only.
 * Never a finished model / human-approved final asset.
 */

import type { ObservationMotionMode } from '@/systems/observationLocomotion';

export type SilhouetteStubMeta = {
  finishedModel: false;
  humanApproved: false;
  assetKind: 'procedural_silhouette_stub';
  mode: ObservationMotionMode;
};

export function silhouetteStubMeta(mode: ObservationMotionMode): SilhouetteStubMeta {
  return {
    finishedModel: false,
    humanApproved: false,
    assetKind: 'procedural_silhouette_stub',
    mode,
  };
}

/**
 * Draw a low-opacity procedural body stub beneath the identity mark.
 * Shapes follow locomotion mode cues without claiming anatomy finals.
 */
export function drawObservationSilhouetteStub(
  ctx: CanvasRenderingContext2D,
  mode: ObservationMotionMode,
  facing: 1 | -1,
): SilhouetteStubMeta {
  ctx.save();
  if (facing < 0) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(20, 28, 18, 0.35)';
  ctx.strokeStyle = 'rgba(20, 28, 18, 0.45)';
  ctx.lineWidth = 1.5;

  switch (mode) {
    case 'flutter':
    case 'hover_dart': {
      // Compact thorax + wing ellipses
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-16, -4, 14, 8, -0.4, 0, Math.PI * 2);
      ctx.ellipse(16, -4, 14, 8, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'swim_undulate': {
      ctx.beginPath();
      ctx.ellipse(0, 4, 32, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(28, 4);
      ctx.lineTo(42, -6);
      ctx.lineTo(42, 14);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'sit_wait': {
      ctx.beginPath();
      ctx.ellipse(0, 6, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Leg suggestion strokes (not finished arachnid art)
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(side * 8, 4);
          ctx.quadraticCurveTo(side * (22 + i * 2), -8 + i * 4, side * (28 + i), 10 + i * 2);
          ctx.stroke();
        }
      }
      break;
    }
    case 'static_fossil': {
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(0, 4, 26, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = 'rgba(20, 28, 18, 0.55)';
      ctx.textAlign = 'center';
      ctx.fillText('recon', 0, 8);
      break;
    }
    case 'bipedal': {
      ctx.beginPath();
      ctx.ellipse(0, -6, 14, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-6, 8, 5, 18);
      ctx.fillRect(2, 8, 5, 18);
      ctx.beginPath();
      ctx.ellipse(12, -10, 10, 8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'climb': {
      ctx.beginPath();
      ctx.ellipse(0, 4, 18, 12, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(14, -2, 8, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'scurry': {
      ctx.beginPath();
      ctx.ellipse(0, 6, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(12, 2, 7, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bound': {
      ctx.beginPath();
      ctx.ellipse(0, 2, 24, 14, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(20, -6, 10, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'amble':
    default: {
      ctx.beginPath();
      ctx.ellipse(0, 8, 28, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(18, -2, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
  return silhouetteStubMeta(mode);
}
