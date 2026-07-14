import type { ArchiveDexEntry, ArchiveDexTabId } from '@/schema/archivedex';
import { getVisibleTabs, getEntryRevealLevel } from '@/services/archivedexMapper';

type EmptyLabel = string;

function field(label: string, value: unknown, emptyLabel: EmptyLabel = 'Not available in current snapshot'): string {
  const hasValue =
    value !== undefined &&
    value !== null &&
    value !== '' &&
    !(Array.isArray(value) && value.length === 0);
  if (hasValue) {
    const display = Array.isArray(value) ? value.join(', ') : String(value);
    return `<div class="dex-field"><span class="detail-label">${label}:</span> <span class="field-verified">${display}</span></div>`;
  }
  return `<div class="dex-field dex-field-empty"><span class="detail-label">${label}:</span> <em class="field-state">${emptyLabel}</em></div>`;
}

function listField(label: string, items?: string[], emptyLabel: EmptyLabel = 'Not available in current snapshot'): string {
  if (!items?.length) return field(label, undefined, emptyLabel);
  return `<div class="dex-field"><span class="detail-label">${label}:</span><ul class="dex-list">${items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`;
}

function provenanceBanner(entry: ArchiveDexEntry): string {
  const hasMock = entry.sources.some((p) => p.isMockData || p.verificationStatus === 'mock_sample');
  const hasGame = entry.sources.some((p) => p.verificationStatus === 'game_authored_verified' || p.source === 'game_authored');
  if (hasMock && hasGame) {
    return '<p class="dex-sample-banner"><span class="mock-badge">SAMPLE SCIENTIFIC DATA</span> Game mechanics are authored; external scientific fields require source snapshot import.</p>';
  }
  if (hasMock) {
    return '<p class="dex-sample-banner"><span class="mock-badge">MOCK/SAMPLE</span> Not counted as source-verified coverage.</p>';
  }
  return '';
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
  if (!ranks.length) return field('Taxonomy', undefined, 'Blocked by external source');
  return `<div class="taxonomy-ladder">${ranks.map(([r, v], i) => `<div class="taxonomy-rank" style="padding-left:${i * 12}px">${r}: <strong>${v}</strong></div>`).join('')}</div>`;
}

function renderSources(entry: ArchiveDexEntry): string {
  const prov = entry.sources
    .map((p) => {
      const status = p.verificationStatus ?? (p.isMockData ? 'mock_sample' : 'source_verified');
      const badge =
        status === 'mock_sample'
          ? '<span class="mock-badge">MOCK SAMPLE</span>'
          : status === 'game_authored_verified'
            ? '<span class="verified-badge">GAME AUTHORED</span>'
            : status === 'blocked_external'
              ? '<span class="blocked-badge">BLOCKED</span>'
              : '';
      return `
      <div class="provenance-item ${p.isMockData ? 'mock' : ''}">
        <strong>${p.source.replace(/_/g, ' ')}</strong> ${badge}
        <div>Version: ${p.sourceVersion} | License: ${p.license} | Status: ${status.replace(/_/g, ' ')}</div>
        <div class="citation">${p.citationRequired ? 'Citation required: ' : ''}${p.citation}</div>
        <div class="provenance-dates">Retrieved: ${p.retrievedAt} | Updated: ${p.lastUpdated}</div>
      </div>`;
    })
    .join('');
  const unc = entry.uncertainty;
  return `
    ${provenanceBanner(entry)}
    <p class="provenance-warning">Science changes. Taxonomy, conservation status, fossil interpretation, and species ranges may be updated as new evidence appears.</p>
    ${prov || '<p><em>No provenance records — blocked by external source.</em></p>'}
    <section class="federated-evidence-section">
      <h4>Live / fixture federated evidence</h4>
      <div id="federated-evidence-mount" class="evidence-panel" data-species-id="${entry.id}" data-scientific-name="${entry.scientificName}"></div>
    </section>
    ${unc?.taxonomicUncertainty ? `<p><strong>Taxonomic uncertainty:</strong> ${unc.taxonomicUncertainty}</p>` : ''}
    ${unc?.fossilUncertainty ? `<p><strong>Fossil uncertainty:</strong> ${unc.fossilUncertainty}</p>` : ''}
    ${unc?.unknownToScience?.length ? listField('What scientists still do not know', unc.unknownToScience, 'Unknown') : field('What scientists still do not know', undefined, 'Unknown')}
    ${unc?.notes ? `<p class="uncertainty-note">${unc.notes}</p>` : ''}
  `;
}

function tabFooter(): string {
  return '<footer class="dex-tab-provenance-footer"><em>Every ArchiveDex entry includes source provenance and uncertainty labeling.</em></footer>';
}

export function renderArchiveDexTab(entry: ArchiveDexEntry, tab: ArchiveDexTabId, discovered: boolean): string {
  const reveal = getEntryRevealLevel(entry, discovered);
  if (!getVisibleTabs(entry, reveal).includes(tab)) {
    return '<p class="dex-locked-tab"><em>Study this organism further to unlock this section.</em></p>';
  }

  const banner = tab !== 'sources' ? provenanceBanner(entry) : '';
  let body: string;

  switch (tab) {
    case 'overview':
      body = `
        ${field('Life status', entry.lifeStatus)}
        ${field('Representation tier', `T${entry.representationTier}`)}
        ${field('Region', entry.region, 'Unknown')}
        ${field('Time', entry.time?.timeRangeLabel ?? entry.time?.timeUnitIds?.join(' – '), 'Not available in current snapshot')}
        ${field('Conservation', entry.conservation?.iucnCategory, 'Not assessed')}
        ${field('Artifact', entry.artifactsEvidence?.collectedArtifactTypes?.join(', '), 'Not yet collected')}
        ${entry.overview?.shortDescription ? `<p class="dex-description">${entry.overview.shortDescription}</p>` : field('Description', undefined)}
        ${entry.overview?.whyItMatters ? `<div class="why-matters"><strong>Why it matters:</strong> ${entry.overview.whyItMatters}</div>` : field('Why it matters', undefined, 'Not available in current snapshot')}
        ${field('Archive completion', entry.overview?.completionPercent != null ? `${entry.overview.completionPercent}%` : undefined, 'Unknown')}
        ${field('Documented', entry.overview?.discoveryDate, 'Unknown')}
      `;
      break;
    case 'identity':
      body = `
        ${field('Pronunciation', entry.pronunciation, 'Unknown')}
        ${field('Name meaning', entry.nameMeaning, 'Unknown')}
        ${listField('How to identify', entry.identity?.identificationTips)}
        ${listField('Field marks', entry.identity?.fieldMarks)}
        ${listField('Similar species', entry.identity?.similarSpecies)}
        ${listField('Common misidentifications', entry.identity?.misidentifications)}
        ${field('Identification confidence', entry.identity?.identificationConfidence, 'Scientifically uncertain')}
        ${listField('Fossil identification traits', entry.identity?.fossilIdentification)}
        ${entry.identity?.debatedClassification ? `<p class="uncertainty-note">${entry.identity.debatedClassification}</p>` : field('Classification debates', undefined, 'None noted')}
      `;
      break;
    case 'taxonomy':
      body = taxonomyLadder(entry) + listField('Synonyms', entry.taxonomy.synonyms, 'Unknown') + listField('Related taxa', entry.taxonomy.relatedTaxa, 'Not available in current snapshot');
      break;
    case 'time':
      body = `
        ${field('Life status', entry.lifeStatus)}
        ${field('Time range', entry.time?.timeRangeLabel)}
        ${field('First appearance', entry.time?.firstAppearanceMa != null ? `${entry.time.firstAppearanceMa} Ma` : undefined, 'Unknown')}
        ${field('Last appearance', entry.time?.lastAppearanceMa != null ? `${entry.time.lastAppearanceMa} Ma` : undefined, 'Unknown')}
        ${listField('Time units', entry.time?.timeUnitIds)}
        ${listField('Mass extinctions', entry.time?.massExtinctionEvents, 'None linked in snapshot')}
        ${field('Ancient environment', entry.time?.ancientEnvironment)}
        ${field('Confidence', entry.time?.confidence, 'Scientifically uncertain')}
        ${entry.time?.fossilRecordLimitations ? `<p class="uncertainty-note">${entry.time.fossilRecordLimitations}</p>` : field('Fossil record limitations', undefined, 'Not available in current snapshot')}
      `;
      break;
    case 'habitat':
      body = `
        ${listField('Continents', entry.habitatRange?.continents)}
        ${listField('Biomes', entry.habitatRange?.biomes)}
        ${listField('Habitats', entry.habitatRange?.habitats)}
        ${field('Migration', entry.habitatRange?.migration, 'Unknown')}
        ${listField('Fossil locations', entry.habitatRange?.fossilLocations, 'Not available in current snapshot')}
        ${field('Paleoenvironment', entry.habitatRange?.paleoenvironment)}
        ${field('In-game clue', entry.habitatRange?.inGameClue, 'Not available in current snapshot')}
        ${listField('Required tools', entry.habitatRange?.requiredTools, 'None required')}
      `;
      break;
    case 'body':
      body = `
        ${field('Size', entry.bodyTraits?.size)}
        ${field('Weight', entry.bodyTraits?.weight, 'Unknown')}
        ${field('Body plan', entry.bodyTraits?.bodyPlan)}
        ${field('Covering', entry.bodyTraits?.covering, 'Unknown')}
        ${listField('Key features', entry.bodyTraits?.keyFeatures)}
        ${field('Sexual dimorphism', entry.bodyTraits?.sexualDimorphism, 'Unknown')}
        ${listField('Adaptations', entry.bodyTraits?.adaptations)}
        ${listField('Fossil anatomy', entry.bodyTraits?.fossilAnatomy, 'Not available in current snapshot')}
      `;
      break;
    case 'behavior':
      body = `
        ${field('Activity', entry.behavior?.activity)}
        ${field('Social structure', entry.behavior?.socialStructure, 'Unknown')}
        ${listField('Communication', entry.behavior?.communication, 'Unknown')}
        ${field('Movement', entry.behavior?.movement, 'Unknown')}
        ${field('Field safety', entry.behavior?.fieldSafety, 'Not available in current snapshot')}
        ${listField('Behavior evidence', entry.behavior?.behaviorEvidence, 'Scientifically uncertain')}
        ${entry.behavior?.speculationWarning ? `<p class="uncertainty-note">${entry.behavior.speculationWarning}</p>` : ''}
      `;
      break;
    case 'diet':
      body = `
        ${field('Diet category', entry.dietFoodWeb?.dietCategory)}
        ${listField('Main foods', entry.dietFoodWeb?.mainFoods)}
        ${field('Trophic level', entry.dietFoodWeb?.trophicLevel, 'Unknown')}
        ${listField('Prey', entry.dietFoodWeb?.prey, 'Not applicable')}
        ${listField('Predators', entry.dietFoodWeb?.predators, 'Unknown')}
        ${field('Ecosystem role', entry.dietFoodWeb?.ecosystemRole, 'Scientifically uncertain')}
        ${entry.dietFoodWeb?.foodWebDiagram ? `<pre class="food-web-diagram">${entry.dietFoodWeb.foodWebDiagram}</pre>` : field('Food web diagram', undefined, 'Not available in current snapshot')}
      `;
      break;
    case 'lifecycle':
      body = `
        ${field('Reproduction', entry.lifeCycle?.reproduction, 'Unknown')}
        ${field('Offspring', entry.lifeCycle?.offspring, 'Unknown')}
        ${field('Parenting', entry.lifeCycle?.parenting, 'Unknown')}
        ${field('Lifespan', entry.lifeCycle?.lifespan, 'Unknown')}
        ${listField('Growth stages', entry.lifeCycle?.growthStages, 'Not available in current snapshot')}
        ${field('Metamorphosis', entry.lifeCycle?.metamorphosis, 'Not applicable')}
      `;
      break;
    case 'ecology':
      body = `
        ${listField('Ecosystem roles', entry.ecology?.roles)}
        ${field('Keystone status', entry.ecology?.keystoneStatus, 'Not yet evaluated')}
        ${listField('Relationships', entry.ecology?.relationships, 'Not available in current snapshot')}
        ${field('Ecosystem impact', entry.ecology?.ecosystemImpact, 'Scientifically uncertain')}
        ${listField('Ecosystem services', entry.ecology?.ecosystemServices, 'Not available in current snapshot')}
      `;
      break;
    case 'conservation':
      body = `
        ${field('IUCN category', entry.conservation?.iucnCategory, 'Not assessed')}
        ${field('Population trend', entry.conservation?.populationTrend, 'Unknown')}
        ${listField('Major threats', entry.conservation?.majorThreats, 'Not available in current snapshot')}
        ${listField('Conservation actions', entry.conservation?.conservationActions, 'Not available in current snapshot')}
        ${listField('Extinction causes', entry.conservation?.extinctionCauses, 'Not applicable')}
        ${entry.conservation?.whyConservationMatters ? `<p>${entry.conservation.whyConservationMatters}</p>` : field('Why conservation matters', undefined, 'Not available in current snapshot')}
      `;
      break;
    case 'artifacts':
      body = `
        ${listField('Your artifacts', entry.artifactsEvidence?.collectedArtifactTypes, 'Not yet collected')}
        ${listField('Ethical rules', entry.artifactsEvidence?.ethicalRules, 'Not available in current snapshot')}
        ${field('Evidence strength', entry.artifactsEvidence?.evidenceStrength, 'Unknown')}
        <ul class="dex-list">${(entry.artifactsEvidence?.availableArtifacts ?? []).map((a) => `<li>${a.label} (${a.type}) — ethical collection</li>`).join('') || '<li><em>Not yet available in current snapshot</em></li>'}</ul>
      `;
      break;
    case 'earth':
      body = `
        <p class="dex-earth-intro">What does Earth need to be like for this organism to survive here?</p>
        ${listField('Environmental dependencies', entry.earthSystems?.environmentalDependencies)}
        ${listField('Habitat signals', entry.earthSystems?.habitatSignals, 'Blocked by external source')}
        ${field('Climate sensitivity', entry.earthSystems?.climateSensitivity, 'Scientifically uncertain')}
      `;
      break;
    case 'human':
      body = `
        ${listField('Cultural notes', entry.humanConnections?.culturalNotes, 'Not available in current snapshot')}
        ${field('Human-wildlife relationship', entry.humanConnections?.humanWildlifeConflict, 'Unknown')}
        ${listField('Ethical viewing rules', entry.humanConnections?.ethicalViewingRules, 'Not available in current snapshot')}
        ${listField('Community conservation', entry.humanConnections?.communityConservation, 'Not available in current snapshot')}
        ${field('Scientific discovery', entry.humanConnections?.scientificDiscovery, 'Unknown')}
      `;
      break;
    case 'lifeling':
      body = entry.lifeling?.unlocks?.length
        ? `<ul class="dex-list">${entry.lifeling.unlocks.map((u) => `<li><strong>${u.traitName}</strong> (${u.category}) — ${u.unlockCondition}</li>`).join('')}</ul>${entry.lifeling.masteryBadge ? `<p><strong>Mastery badge:</strong> ${entry.lifeling.masteryBadge}</p>` : ''}`
        : '<p><em>No Lifeling unlocks linked to this entry in the current snapshot.</em></p>';
      break;
    case 'media':
      body = `
        ${listField('Images', entry.media?.images, 'Not available in current snapshot')}
        ${listField('Audio', entry.media?.audio, 'Not available in current snapshot')}
        ${listField('Player photos', entry.media?.playerPhotos, 'Not yet collected')}
        ${listField('License notes', entry.media?.licenseNotes, 'Unknown')}
        <p><em>Player-captured media appears here after ethical field documentation.</em></p>
      `;
      break;
    case 'sources':
      return renderSources(entry) + tabFooter();
    default:
      body = '<p><em>Not available in current snapshot</em></p>';
  }

  return banner + body + tabFooter();
}
