/**
 * Procedural silhouette SVG packaging — packaged stubs for observation/Dex preview.
 * assetKind = procedural_silhouette_svg; never finishedModel / humanApproved.
 */

import type { ObservationMotionMode } from '@/systems/observationLocomotion';
import { resolveObservationMotionForTaxon } from '@/systems/observationLocomotion';
import { listFlagshipTaxonIds } from '@/services/flagshipTaxonProfiles';

export const SILHOUETTE_SVG_PACKAGE_ID = 'aol.silhouette_svg_package.v1';

export const SILHOUETTE_SVG_MODES: readonly ObservationMotionMode[] = [
  'amble',
  'bound',
  'flutter',
  'hover_dart',
  'swim_undulate',
  'sit_wait',
  'scurry',
  'static_fossil',
  'bipedal',
  'climb',
] as const;

export type SilhouetteSvgAsset = {
  mode: ObservationMotionMode;
  filename: string;
  publicPath: string;
  finishedModel: false;
  humanApproved: false;
  assetKind: 'procedural_silhouette_svg';
  svg: string;
};

export type SilhouetteSvgPackageManifest = {
  schema: typeof SILHOUETTE_SVG_PACKAGE_ID;
  generatedAt: string;
  packageKind: 'procedural_silhouette_svg';
  finishedModelsClaimed: false;
  humanApprovedFinal: false;
  emojiEqualsFinished: false;
  sourceVerifiedRelease: false;
  iucnAssessed: false;
  mapsUnlocked: false;
  modeCount: number;
  flagshipBindings: number;
  assets: Array<{
    mode: ObservationMotionMode;
    filename: string;
    publicPath: string;
    finishedModel: false;
    humanApproved: false;
  }>;
  flagshipModeMap: Record<string, ObservationMotionMode>;
  rule: string;
};

const RULE =
  'Procedural silhouette SVG stubs may ship for observation/Dex underpaint; they are not finished models, not human-approved finals, and do not unlock IUCN assessments or paleomaps.';

function modeBody(mode: ObservationMotionMode): string {
  switch (mode) {
    case 'flutter':
    case 'hover_dart':
      return `
        <ellipse cx="48" cy="48" rx="8" ry="12" fill="currentColor" opacity="0.55"/>
        <ellipse cx="30" cy="42" rx="14" ry="7" transform="rotate(-25 30 42)" fill="currentColor" opacity="0.4"/>
        <ellipse cx="66" cy="42" rx="14" ry="7" transform="rotate(25 66 42)" fill="currentColor" opacity="0.4"/>`;
    case 'swim_undulate':
      return `
        <ellipse cx="44" cy="50" rx="28" ry="11" fill="currentColor" opacity="0.5"/>
        <path d="M70 50 L86 40 L86 60 Z" fill="currentColor" opacity="0.45"/>`;
    case 'sit_wait':
      return `
        <ellipse cx="48" cy="52" rx="14" ry="9" fill="currentColor" opacity="0.5"/>
        <path d="M36 48 Q22 36 18 58 M40 50 Q28 34 24 60 M56 48 Q70 36 74 58 M52 50 Q64 34 68 60" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>`;
    case 'static_fossil':
      return `
        <ellipse cx="48" cy="50" rx="26" ry="12" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3" opacity="0.55"/>
        <text x="48" y="54" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.55">recon</text>`;
    case 'bipedal':
      return `
        <ellipse cx="48" cy="36" rx="12" ry="16" fill="currentColor" opacity="0.5"/>
        <rect x="42" y="50" width="5" height="18" fill="currentColor" opacity="0.45"/>
        <rect x="51" y="50" width="5" height="18" fill="currentColor" opacity="0.45"/>
        <ellipse cx="62" cy="32" rx="9" ry="7" fill="currentColor" opacity="0.45"/>`;
    case 'climb':
      return `
        <ellipse cx="46" cy="50" rx="16" ry="11" transform="rotate(18 46 50)" fill="currentColor" opacity="0.5"/>
        <ellipse cx="62" cy="42" rx="7" ry="6" fill="currentColor" opacity="0.45"/>`;
    case 'scurry':
      return `
        <ellipse cx="46" cy="54" rx="12" ry="7" fill="currentColor" opacity="0.5"/>
        <ellipse cx="58" cy="48" rx="6" ry="5" fill="currentColor" opacity="0.45"/>`;
    case 'bound':
      return `
        <ellipse cx="44" cy="48" rx="22" ry="12" transform="rotate(-10 44 48)" fill="currentColor" opacity="0.5"/>
        <ellipse cx="66" cy="40" rx="9" ry="8" fill="currentColor" opacity="0.45"/>`;
    case 'amble':
    default:
      return `
        <ellipse cx="44" cy="54" rx="26" ry="13" fill="currentColor" opacity="0.5"/>
        <ellipse cx="66" cy="44" rx="11" ry="9" fill="currentColor" opacity="0.45"/>`;
  }
}

/** Build a single procedural silhouette SVG string for a locomotion mode. */
export function buildSilhouetteSvgMarkup(mode: ObservationMotionMode): string {
  const title = `Procedural silhouette stub (${mode}) — not a finished model`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${title}"`,
    ` data-aol-silhouette="1" data-mode="${mode}" data-finished-model="false" data-human-approved="false" data-asset-kind="procedural_silhouette_svg">`,
    `  <title>${title}</title>`,
    `  <desc>Authored procedural underpaint for observation mode ${mode}. Not human-approved final art. Not IUCN. Not source_verified.</desc>`,
    `  <g fill="currentColor">${modeBody(mode)}`,
    `  </g>`,
    `</svg>`,
  ].join('\n');
}

export function buildSilhouetteSvgAsset(mode: ObservationMotionMode): SilhouetteSvgAsset {
  const filename = `silhouette-${mode}.svg`;
  return {
    mode,
    filename,
    publicPath: `/assets/silhouettes/${filename}`,
    finishedModel: false,
    humanApproved: false,
    assetKind: 'procedural_silhouette_svg',
    svg: buildSilhouetteSvgMarkup(mode),
  };
}

export function listSilhouetteSvgAssets(): SilhouetteSvgAsset[] {
  return SILHOUETTE_SVG_MODES.map(buildSilhouetteSvgAsset);
}

export function buildSilhouetteSvgPackageManifest(
  generatedAt = new Date().toISOString(),
): SilhouetteSvgPackageManifest {
  const assets = listSilhouetteSvgAssets();
  const flagshipModeMap: Record<string, ObservationMotionMode> = {};
  for (const id of listFlagshipTaxonIds()) {
    flagshipModeMap[id] = resolveObservationMotionForTaxon(id).mode;
  }
  return {
    schema: SILHOUETTE_SVG_PACKAGE_ID,
    generatedAt,
    packageKind: 'procedural_silhouette_svg',
    finishedModelsClaimed: false,
    humanApprovedFinal: false,
    emojiEqualsFinished: false,
    sourceVerifiedRelease: false,
    iucnAssessed: false,
    mapsUnlocked: false,
    modeCount: assets.length,
    flagshipBindings: Object.keys(flagshipModeMap).length,
    assets: assets.map((a) => ({
      mode: a.mode,
      filename: a.filename,
      publicPath: a.publicPath,
      finishedModel: false,
      humanApproved: false,
    })),
    flagshipModeMap,
    rule: RULE,
  };
}

export function assertSilhouetteSvgPackageHonesty(
  manifest: SilhouetteSvgPackageManifest,
): void {
  if (
    manifest.finishedModelsClaimed ||
    manifest.humanApprovedFinal ||
    manifest.emojiEqualsFinished
  ) {
    throw new Error('Silhouette SVG package must not claim finished / human-approved art');
  }
  if (manifest.sourceVerifiedRelease || manifest.iucnAssessed || manifest.mapsUnlocked) {
    throw new Error('Silhouette SVG package must not claim science unlocks');
  }
  for (const a of manifest.assets) {
    if (a.finishedModel || a.humanApproved) {
      throw new Error(`Asset ${a.mode} honesty violation`);
    }
  }
}

/** Compact museum/Dex honesty strip for SVG packaging. */
export function renderSilhouetteSvgPackageHtml(
  manifest: SilhouetteSvgPackageManifest = buildSilhouetteSvgPackageManifest(),
): string {
  assertSilhouetteSvgPackageHonesty(manifest);
  const sample = manifest.assets[0];
  return [
    '<aside class="silhouette-svg-package" data-silhouette-svg-package="1" data-finished-model="false" data-human-approved="false" role="note" aria-label="Procedural silhouette SVG package — not finished art">',
    `<p><strong>Silhouette SVG package:</strong> ${manifest.modeCount} procedural mode stubs · ${manifest.flagshipBindings} flagship bindings — procedural ≠ finished.</p>`,
    sample
      ? `<p>Sample path: <code>${escapeHtml(sample.publicPath)}</code></p>`
      : '',
    '<p>finishedModelsClaimed=false · humanApprovedFinal=false · sourceVerifiedRelease=false · iucnAssessed=false · mapsUnlocked=false</p>',
    `<p><em>${escapeHtml(manifest.rule)}</em></p>`,
    '</aside>',
  ].join('\n');
}

/** Inline SVG preview for Dex/museum (uses mode for flagship if known). */
export function renderSilhouetteSvgPreviewHtml(
  modeOrTaxonId: ObservationMotionMode | string,
): string {
  const modes = new Set<string>(SILHOUETTE_SVG_MODES);
  const mode = modes.has(modeOrTaxonId)
    ? (modeOrTaxonId as ObservationMotionMode)
    : resolveObservationMotionForTaxon(modeOrTaxonId).mode;
  const asset = buildSilhouetteSvgAsset(mode);
  return [
    `<figure class="silhouette-svg-preview" data-silhouette-svg-preview="1" data-mode="${asset.mode}" data-finished-model="false">`,
    asset.svg,
    `<figcaption>Procedural SVG stub (${escapeHtml(asset.mode)}) — not a finished model</figcaption>`,
    `</figure>`,
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
