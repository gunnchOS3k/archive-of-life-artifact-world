/**
 * World presentation / menus / HUD density for launch campaign.
 * Procedural canvas remains the visual surface — no painted remaster claim.
 */

export type HudSurface =
  | 'toast'
  | 'minimap_hint'
  | 'lifeling_hud'
  | 'region_banner'
  | 'era_chip'
  | 'achievement_toast'
  | 'a11y_chrome'
  | 'menu_panel';

export interface PresentationPulse {
  surface: HudSurface;
  message: string;
  at: number;
}

const pulses: PresentationPulse[] = [];
const MAX = 60;

export function pulseHud(surface: HudSurface, message: string): PresentationPulse {
  const row: PresentationPulse = { surface, message, at: Date.now() };
  pulses.push(row);
  if (pulses.length > MAX) pulses.shift();
  return row;
}

export function getPresentationPulses(): readonly PresentationPulse[] {
  return pulses;
}

export function clearPresentationPulses(): void {
  pulses.length = 0;
}

export const MENU_HUD_SURFACES: readonly HudSurface[] = [
  'toast',
  'minimap_hint',
  'lifeling_hud',
  'region_banner',
  'era_chip',
  'achievement_toast',
  'a11y_chrome',
  'menu_panel',
];

export function presentationDensityScore(): number {
  const seen = new Set(pulses.map((p) => p.surface));
  return Math.round((100 * seen.size) / MENU_HUD_SURFACES.length);
}
