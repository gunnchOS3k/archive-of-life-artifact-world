import type { ScientificRecordSnapshot } from '@/schema/scientificRecord';
import type { ArchiveDexEntry } from '@/schema/archivedex';
import type { DataSourceProvenance } from '@/schema/provenance';

export const WAVE008_FIXTURE_SNAPSHOT_ID = 'wave008-scientific-fixture-v1';

export function scientificRecordToArchiveDexEntry(rec: ScientificRecordSnapshot): ArchiveDexEntry {
  const source: DataSourceProvenance = {
    source: rec.source_organization_id,
    sourceVersion: rec.source_version ?? 'unknown',
    sourceRecordId: rec.source_record_id,
    license: (rec.license.license_spdx_or_label as DataSourceProvenance['license']) || 'MOCK-SAMPLE',
    citation: rec.citation ?? '',
    citationRequired: Boolean(rec.license.attribution_required),
    retrievedAt: rec.retrieved_at ?? '',
    lastUpdated: rec.retrieved_at ?? '',
    verificationStatus: rec.verification_status,
    isMockData: rec.verification_status === 'mock_sample',
  };

  return {
    id: rec.identity.canonical_id,
    commonName: rec.common_name ?? rec.scientific_name.accepted_scientific_name,
    scientificName: rec.scientific_name.accepted_scientific_name,
    group: rec.scientific_name.rank ?? 'taxon',
    lifeStatus: (rec.life_status === 'fossil'
      ? 'fossil_only'
      : rec.life_status === 'extant'
        ? 'extant'
        : rec.life_status === 'extinct'
          ? 'extinct'
          : 'uncertain') as ArchiveDexEntry['lifeStatus'],
    representationTier: 1,
    entryStatus: 'studied',
    region: rec.geographic_provenance?.region,
    taxonomy: {
      acceptedName: rec.scientific_name.accepted_scientific_name,
      synonyms: rec.scientific_name.synonyms,
      rank: rec.scientific_name.rank,
      species: rec.scientific_name.accepted_scientific_name,
    },
    time: {
      timeRangeLabel:
        rec.time_range?.geologic_units?.join('–') ??
        (rec.time_range?.kind === 'extant_current' ? 'Extant / current' : undefined),
      firstAppearanceMa: typeof rec.time_range?.start === 'number' ? rec.time_range.start : null,
      lastAppearanceMa: typeof rec.time_range?.end === 'number' ? rec.time_range.end : null,
      confidence: rec.confidence_or_uncertainty.confidence,
      fossilRecordLimitations: rec.time_range?.uncertainty,
    },
    habitatRange: {
      countries: rec.geographic_provenance?.country_codes,
      continents: rec.geographic_provenance?.region ? [rec.geographic_provenance.region] : undefined,
      fossilLocations:
        rec.geographic_provenance?.source_basis === 'fossil_locality'
          ? [rec.geographic_provenance.locality_text ?? 'fossil locality']
          : undefined,
    },
    sources: [source],
    uncertainty: {
      taxonomicUncertainty: rec.confidence_or_uncertainty.uncertainty_note,
      fossilUncertainty: rec.time_range?.kind === 'fossil_geologic_interval' ? rec.time_range.uncertainty : undefined,
      notes: rec.editorial.notes,
    },
    scientificRecord: rec,
    overview: {
      shortDescription:
        rec.fixture_role === 'game_authored'
          ? 'Game-authored teaching fixture — not a real organism.'
          : rec.fixture_role === 'mock_sample'
            ? 'Mock/sample scientific fixture for digital validation.'
            : `Scientific record for ${rec.scientific_name.accepted_scientific_name}.`,
      completionPercent: undefined,
    },
  };
}
