import type { ArchiveDexEntry, ArchiveDexTabId } from '@/schema/archivedex';
import { getVisibleTabs, getEntryRevealLevel } from '@/services/archivedexMapper';

function field(label: string, value: unknown, fallback = 'Not yet available'): string {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value) && value.length === 0) return '';
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return `<div class="dex-field"><span class="detail-label">${label}:</span> ${display === fallback ? `<em>${fallback}</em>` : display}</div>`;
}

function listField(label: string, items?: string[], fallback = 'Not yet available'): string {
  if (!items?.length) return `<div class="dex-field"><span class="detail-label">${label}:</span> <em>${fallback}</em></div>`;
  return `<div class="dex-field"><span class="detail-label">${label}:</span><ul class="dex-list">${items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`;
}

function taxonomyLadder(entry: ArchiveDexEntry): string {
  const t = entry.taxonomy;
  const ranks = [
    ['Kingdom', t.kingdom],
    ['Phylum', t.phylum],
    ['Class', t.className],
    ['Order', t.order],
    ['Family', t.family],
    ['Genus', t.genus],
    ['Species', t.species ?? entry.scientificName],
  ].filter(([, v]) => v);
  return `<div class="taxonomy-ladder">${ranks.map(([r, v], i) => `<div class="taxonomy-rank" style="padding-left:${i * 12}px">${r}: <strong>${v}</strong></div>`).join('')}</div>`;
}

function renderSources(entry: ArchiveDexEntry): string {
  const prov = entry.sources
    .map(
      (p) => `
      <div class="provenance-item ${p.isMockData ? 'mock' : ''}">
        <strong>${p.source.replace(/_/g, ' ')}</strong>
        ${p.isMockData ? '<span class="mock-badge">MOCK SAMPLE</span>' : ''}
        <div>Version: ${p.sourceVersion} | License: ${p.license}</div>
        <div class="citation">${p.citationRequired ? 'Citation required: ' : ''}${p.citation}</div>
        <div class="provenance-dates">Retrieved: ${p.retrievedAt} | Updated: ${p.lastUpdated}</div>
      </div>`
    )
    .join('');
  const unc = entry.uncertainty;
  return `
    <p class="provenance-warning">Science changes. Taxonomy, conservation status, fossil interpretation, and species ranges may be updated as new evidence appears.</p>
    ${prov}
    ${unc?.taxonomicUncertainty ? `<p><strong>Taxonomic uncertainty:</strong> ${unc.taxonomicUncertainty}</p>` : ''}
    ${unc?.fossilUncertainty ? `<p><strong>Fossil uncertainty:</strong> ${unc.fossilUncertainty}</p>` : ''}
    ${unc?.unknownToScience?.length ? listField('What scientists still do not know', unc.unknownToScience) : ''}
    ${unc?.notes ? `<p class="uncertainty-note">${unc.notes}</p>` : ''}
  `;
}

export function renderArchiveDexTab(entry: ArchiveDexEntry, tab: ArchiveDexTabId, discovered: boolean): string {
  const reveal = getEntryRevealLevel(entry, discovered);
  if (!getVisibleTabs(entry, reveal).includes(tab)) {
    return '<p class="dex-locked-tab"><em>Study this organism further to unlock this section.</em></p>';
  }

  switch (tab) {
    case 'overview':
      return `
        ${field('Life status', entry.lifeStatus)}
        ${field('Representation tier', `T${entry.representationTier}`)}
        ${field('Region', entry.region)}
        ${field('Time', entry.time?.timeRangeLabel ?? entry.time?.timeUnitIds?.join(' – '))}
        ${field('Conservation', entry.conservation?.iucnCategory, 'Not assessed')}
        ${field('Artifact', entry.artifactsEvidence?.collectedArtifactTypes?.join(', '), 'Not yet collected')}
        <p class="dex-description">${entry.overview?.shortDescription ?? 'Not yet available'}</p>
        ${entry.overview?.whyItMatters ? `<div class="why-matters"><strong>Why it matters:</strong> ${entry.overview.whyItMatters}</div>` : ''}
        ${field('Archive completion', entry.overview?.completionPercent != null ? `${entry.overview.completionPercent}%` : undefined)}
        ${entry.overview?.discoveryDate ? field('Documented', entry.overview.discoveryDate) : ''}
      `;
    case 'identity':
      return `
        ${field('Pronunciation', entry.pronunciation)}
        ${field('Name meaning', entry.nameMeaning)}
        ${listField('How to identify', entry.identity?.identificationTips)}
        ${listField('Field marks', entry.identity?.fieldMarks)}
        ${listField('Similar species', entry.identity?.similarSpecies)}
        ${listField('Common misidentifications', entry.identity?.misidentifications)}
        ${field('Identification confidence', entry.identity?.identificationConfidence, 'Scientifically uncertain')}
        ${listField('Fossil identification traits', entry.identity?.fossilIdentification)}
        ${entry.identity?.debatedClassification ? `<p class="uncertainty-note">${entry.identity.debatedClassification}</p>` : ''}
      `;
    case 'taxonomy':
      return taxonomyLadder(entry) + listField('Synonyms', entry.taxonomy.synonyms) + listField('Related taxa', entry.taxonomy.relatedTaxa);
    case 'time':
      return `
        ${field('Life status', entry.lifeStatus)}
        ${field('Time range', entry.time?.timeRangeLabel)}
        ${field('First appearance', entry.time?.firstAppearanceMa != null ? `${entry.time.firstAppearanceMa} Ma` : undefined)}
        ${field('Last appearance', entry.time?.lastAppearanceMa != null ? `${entry.time.lastAppearanceMa} Ma` : undefined)}
        ${listField('Time units', entry.time?.timeUnitIds)}
        ${listField('Mass extinctions', entry.time?.massExtinctionEvents)}
        ${field('Ancient environment', entry.time?.ancientEnvironment)}
        ${field('Confidence', entry.time?.confidence, 'Scientifically uncertain')}
        ${entry.time?.fossilRecordLimitations ? `<p class="uncertainty-note">${entry.time.fossilRecordLimitations}</p>` : ''}
      `;
    case 'habitat':
      return `
        ${listField('Continents', entry.habitatRange?.continents)}
        ${listField('Biomes', entry.habitatRange?.biomes)}
        ${listField('Habitats', entry.habitatRange?.habitats)}
        ${field('Migration', entry.habitatRange?.migration)}
        ${listField('Fossil locations', entry.habitatRange?.fossilLocations)}
        ${field('Paleoenvironment', entry.habitatRange?.paleoenvironment)}
        ${field('In-game clue', entry.habitatRange?.inGameClue)}
        ${listField('Required tools', entry.habitatRange?.requiredTools)}
      `;
    case 'body':
      return `
        ${field('Size', entry.bodyTraits?.size)}
        ${field('Weight', entry.bodyTraits?.weight)}
        ${field('Body plan', entry.bodyTraits?.bodyPlan)}
        ${field('Covering', entry.bodyTraits?.covering)}
        ${listField('Key features', entry.bodyTraits?.keyFeatures)}
        ${field('Sexual dimorphism', entry.bodyTraits?.sexualDimorphism)}
        ${listField('Adaptations', entry.bodyTraits?.adaptations)}
        ${listField('Fossil anatomy', entry.bodyTraits?.fossilAnatomy)}
      `;
    case 'behavior':
      return `
        ${field('Activity', entry.behavior?.activity)}
        ${field('Social structure', entry.behavior?.socialStructure)}
        ${listField('Communication', entry.behavior?.communication)}
        ${field('Movement', entry.behavior?.movement)}
        ${field('Field safety', entry.behavior?.fieldSafety)}
        ${listField('Behavior evidence', entry.behavior?.behaviorEvidence)}
        ${entry.behavior?.speculationWarning ? `<p class="uncertainty-note">${entry.behavior.speculationWarning}</p>` : ''}
      `;
    case 'diet':
      return `
        ${field('Diet category', entry.dietFoodWeb?.dietCategory)}
        ${listField('Main foods', entry.dietFoodWeb?.mainFoods)}
        ${field('Trophic level', entry.dietFoodWeb?.trophicLevel)}
        ${listField('Prey', entry.dietFoodWeb?.prey)}
        ${listField('Predators', entry.dietFoodWeb?.predators)}
        ${field('Ecosystem role', entry.dietFoodWeb?.ecosystemRole)}
        ${entry.dietFoodWeb?.foodWebDiagram ? `<pre class="food-web-diagram">${entry.dietFoodWeb.foodWebDiagram}</pre>` : ''}
      `;
    case 'lifecycle':
      return `
        ${field('Reproduction', entry.lifeCycle?.reproduction)}
        ${field('Offspring', entry.lifeCycle?.offspring)}
        ${field('Parenting', entry.lifeCycle?.parenting)}
        ${field('Lifespan', entry.lifeCycle?.lifespan, 'Unknown')}
        ${listField('Growth stages', entry.lifeCycle?.growthStages)}
        ${field('Metamorphosis', entry.lifeCycle?.metamorphosis, 'Not applicable')}
      `;
    case 'ecology':
      return `
        ${listField('Ecosystem roles', entry.ecology?.roles)}
        ${field('Keystone status', entry.ecology?.keystoneStatus, 'Not yet evaluated')}
        ${listField('Relationships', entry.ecology?.relationships)}
        ${field('Ecosystem impact', entry.ecology?.ecosystemImpact)}
        ${listField('Ecosystem services', entry.ecology?.ecosystemServices)}
      `;
    case 'conservation':
      return `
        ${field('IUCN category', entry.conservation?.iucnCategory, 'Not assessed')}
        ${field('Population trend', entry.conservation?.populationTrend, 'Unknown')}
        ${listField('Major threats', entry.conservation?.majorThreats)}
        ${listField('Conservation actions', entry.conservation?.conservationActions)}
        ${listField('Extinction causes', entry.conservation?.extinctionCauses)}
        ${entry.conservation?.whyConservationMatters ? `<p>${entry.conservation.whyConservationMatters}</p>` : ''}
      `;
    case 'artifacts':
      return `
        ${listField('Your artifacts', entry.artifactsEvidence?.collectedArtifactTypes)}
        ${listField('Ethical rules', entry.artifactsEvidence?.ethicalRules)}
        ${field('Evidence strength', entry.artifactsEvidence?.evidenceStrength)}
        <ul class="dex-list">${(entry.artifactsEvidence?.availableArtifacts ?? []).map((a) => `<li>${a.label} (${a.type}) — ethical collection</li>`).join('') || '<li><em>Not yet available</em></li>'}</ul>
      `;
    case 'earth':
      return `
        <p class="dex-earth-intro">What does Earth need to be like for this organism to survive here?</p>
        ${listField('Environmental dependencies', entry.earthSystems?.environmentalDependencies)}
        ${listField('Habitat signals', entry.earthSystems?.habitatSignals)}
        ${field('Climate sensitivity', entry.earthSystems?.climateSensitivity)}
      `;
    case 'human':
      return `
        ${listField('Cultural notes', entry.humanConnections?.culturalNotes)}
        ${field('Human-wildlife relationship', entry.humanConnections?.humanWildlifeConflict)}
        ${listField('Ethical viewing rules', entry.humanConnections?.ethicalViewingRules)}
        ${listField('Community conservation', entry.humanConnections?.communityConservation)}
        ${field('Scientific discovery', entry.humanConnections?.scientificDiscovery)}
      `;
    case 'lifeling':
      return entry.lifeling?.unlocks?.length
        ? `<ul class="dex-list">${entry.lifeling.unlocks.map((u) => `<li><strong>${u.traitName}</strong> (${u.category}) — ${u.unlockCondition}</li>`).join('')}</ul>${entry.lifeling.masteryBadge ? `<p><strong>Mastery badge:</strong> ${entry.lifeling.masteryBadge}</p>` : ''}`
        : '<p><em>No Lifeling unlocks linked to this entry yet.</em></p>';
    case 'media':
      return `
        ${listField('Images', entry.media?.images)}
        ${listField('Audio', entry.media?.audio)}
        ${listField('Player photos', entry.media?.playerPhotos)}
        ${listField('License notes', entry.media?.licenseNotes)}
        <p><em>Player-captured media appears here after ethical field documentation.</em></p>
      `;
    case 'sources':
      return renderSources(entry);
    default:
      return '<p>Not yet available</p>';
  }
}
