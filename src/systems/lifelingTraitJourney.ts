/**
 * Lifeling trait unlock journey — museum / expedition / observation → cosmetic unlock → equip.
 * Cosmetic/affinity only while IUCN stays blocked_external. Never invents assessed badges,
 * maps unlocks, or source_verified science claims.
 */

import type { CompanionState, LifelingTrait } from '@/schema';
import {
  companionProgressSummary,
  ensureCompanionProgressFields,
  OBSERVATION_XP,
  xpProgressInLevel,
} from '@/systems/companionProgression';
import { buildLifelingHonestyReport, type LifelingHonestyReport } from '@/systems/lifelingHonestyPresentation';

export const LIFELING_TRAIT_JOURNEY_ID = 'aol.lifeling_trait_journey.v1';

export type TraitJourneyStepKind =
  | 'observe_species'
  | 'level_milestone'
  | 'equip_cosmetic'
  | 'return_museum';

export type TraitJourneyStep = {
  id: string;
  kind: TraitJourneyStepKind;
  title: string;
  detail: string;
  traitId: string | null;
  speciesHint: string | null;
  complete: boolean;
};

export type LifelingTraitJourney = {
  schema: typeof LIFELING_TRAIT_JOURNEY_ID;
  companionSummary: string;
  unlockedCount: number;
  lockedCount: number;
  equippedCount: number;
  nextStep: TraitJourneyStep | null;
  steps: TraitJourneyStep[];
  honesty: LifelingHonestyReport;
  claims: {
    conservationBadgesShown: false;
    iucnAssessed: false;
    mapsUnlocked: false;
    sourceVerified: false;
    HUMAN: false;
    RC2: false;
    V1: false;
  };
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Build ordered trait journey from companion + catalog (cosmetic traits + celebrate milestone). */
export function buildLifelingTraitJourney(
  companion: CompanionState,
  traits: LifelingTrait[],
): LifelingTraitJourney {
  ensureCompanionProgressFields(companion);
  const honesty = buildLifelingHonestyReport();
  const cosmetic = traits.filter((t) => t.category !== 'emote' || t.id === 'celebrate_emote');
  const unlocked = new Set(companion.unlockedTraits || []);
  const equipped = new Set(companion.equippedTraits || []);

  const steps: TraitJourneyStep[] = [];
  for (const trait of cosmetic) {
    const isUnlocked = unlocked.has(trait.id);
    const isEquipped = equipped.has(trait.id);
    if (trait.id === 'celebrate_emote') {
      steps.push({
        id: `level:${trait.id}`,
        kind: 'level_milestone',
        title: `Unlock ${trait.name} at level 3+`,
        detail: isUnlocked
          ? 'Milestone emote unlocked from field attentiveness (cosmetic only).'
          : 'Keep observing ethically to reach Lv 3 — celebrate emote is cosmetic, not a conservation badge.',
        traitId: trait.id,
        speciesHint: null,
        complete: isUnlocked,
      });
    } else {
      steps.push({
        id: `observe:${trait.id}`,
        kind: 'observe_species',
        title: `Observe to unlock ${trait.name}`,
        detail: isUnlocked
          ? `Unlocked via ${trait.unlockedBy} (cosmetic / affinity).`
          : `Ethical observation of ${trait.unlockedBy} unlocks this ${trait.category} trait (+${OBSERVATION_XP} XP). Not an IUCN assessment.`,
        traitId: trait.id,
        speciesHint: trait.unlockedBy,
        complete: isUnlocked,
      });
    }
    if (isUnlocked && trait.category !== 'emote') {
      steps.push({
        id: `equip:${trait.id}`,
        kind: 'equip_cosmetic',
        title: `Equip ${trait.name}`,
        detail: isEquipped
          ? 'Equipped on Lifeling preview (one per category).'
          : 'Open companion panel and equip — preview only; emoji/procedural ≠ finished model.',
        traitId: trait.id,
        speciesHint: null,
        complete: isEquipped,
      });
    }
  }

  const anyEquipped = (companion.equippedTraits || []).length > 0;
  steps.push({
    id: 'return_museum',
    kind: 'return_museum',
    title: 'Return to museum / ArchiveDex',
    detail: anyEquipped
      ? 'Trait journey active — museum floors stay sample_fallback; maps 0/17; IUCN blocked_external.'
      : 'After unlocking/equipping a cosmetic trait, return to museum floors without inventing science unlocks.',
    traitId: null,
    speciesHint: null,
    complete: anyEquipped && unlocked.size > 0,
  });

  const nextStep = steps.find((s) => !s.complete) || null;
  const unlockedCosmetic = cosmetic.filter((t) => unlocked.has(t.id));

  return {
    schema: LIFELING_TRAIT_JOURNEY_ID,
    companionSummary: companionProgressSummary(companion),
    unlockedCount: unlockedCosmetic.length,
    lockedCount: cosmetic.length - unlockedCosmetic.length,
    equippedCount: (companion.equippedTraits || []).length,
    nextStep,
    steps,
    honesty,
    claims: {
      conservationBadgesShown: false,
      iucnAssessed: false,
      mapsUnlocked: false,
      sourceVerified: false,
      HUMAN: false,
      RC2: false,
      V1: false,
    },
  };
}

/** Describe how many ethical observations remain until next level (informational). */
export function observationsUntilNextLevel(companion: CompanionState): number {
  ensureCompanionProgressFields(companion);
  const { intoLevel, needed } = xpProgressInLevel(companion.xp ?? 0);
  const remainingXp = Math.max(0, needed - intoLevel);
  return Math.ceil(remainingXp / OBSERVATION_XP);
}

export function assertLifelingTraitJourneyHonesty(journey: LifelingTraitJourney): void {
  if (journey.claims.conservationBadgesShown || journey.claims.iucnAssessed) {
    throw new Error('Lifeling trait journey must not claim IUCN/conservation badges');
  }
  if (journey.claims.mapsUnlocked || journey.claims.sourceVerified) {
    throw new Error('Lifeling trait journey must not claim maps or source_verified');
  }
  if (journey.claims.HUMAN || journey.claims.RC2 || journey.claims.V1) {
    throw new Error('HUMAN/RC2/V1 must remain false on Lifeling trait journey');
  }
  if (journey.honesty.iucnGate !== 'blocked_external') {
    throw new Error('Trait journey honesty requires IUCN blocked_external');
  }
}

/** Companion-panel HTML strip for next trait journey step. */
export function renderLifelingTraitJourneyHtml(journey: LifelingTraitJourney): string {
  assertLifelingTraitJourneyHonesty(journey);
  const next = journey.nextStep;
  const nextLine = next
    ? `<p data-next-step="${escapeHtml(next.id)}" data-step-kind="${escapeHtml(next.kind)}"><strong>Next:</strong> ${escapeHtml(next.title)} — ${escapeHtml(next.detail)}</p>`
    : '<p data-next-step="complete"><strong>Trait journey:</strong> all listed cosmetic steps complete for current catalog (still ≠ finished art / ≠ IUCN).</p>';
  const obsHint = next?.kind === 'observe_species' && next.speciesHint
    ? `<p class="lifeling-trait-journey-species">Species hint: <code>${escapeHtml(next.speciesHint)}</code></p>`
    : '';
  return [
    '<aside class="lifeling-trait-journey" data-lifeling-trait-journey="1" data-iucn="blocked_external" data-conservation-badges="false" role="status" aria-label="Lifeling trait unlock journey (cosmetic only)">',
    `<p><strong>Trait journey</strong> · unlocked ${journey.unlockedCount} · locked ${journey.lockedCount} · equipped ${journey.equippedCount}</p>`,
    `<p class="lifeling-trait-journey-summary">${escapeHtml(journey.companionSummary)}</p>`,
    nextLine,
    obsHint,
    '<p>conservationBadgesShown=false · iucnAssessed=false · mapsUnlocked=false · sourceVerified=false · HUMAN/RC2/V1=false</p>',
    '</aside>',
  ].join('\n');
}
