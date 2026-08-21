import type { SourceName } from './provenance';
import type { IntegrationStatus, SourceRegistryEntry } from './scientificRecord';

/** Registry of source organizations. Enum presence ≠ live integration. */
export const SOURCE_REGISTRY: Record<SourceName, SourceRegistryEntry> = {
  catalogue_of_life: {
    source_id: 'catalogue_of_life',
    organization_name: 'Catalogue of Life',
    homepage: 'https://www.catalogueoflife.org/',
    integration_status: 'FIXTURE_ONLY',
    terms_or_license_notes:
      'UNVERIFIED-FIXTURE until an authentic COL snapshot is imported. Do not guess CC-BY.',
    citation_policy: 'Attribute Catalogue of Life only when using verified COL snapshot facts.',
  },
  gbif: {
    source_id: 'gbif',
    organization_name: 'GBIF',
    homepage: 'https://www.gbif.org/',
    integration_status: 'FIXTURE_ONLY',
    terms_or_license_notes:
      'UNVERIFIED-FIXTURE until an authentic GBIF snapshot is imported. Per-dataset licenses vary.',
    citation_policy: 'Cite GBIF and the contributing dataset only when snapshot-verified.',
  },
  iucn: {
    source_id: 'iucn',
    organization_name: 'IUCN',
    homepage: 'https://www.iucnredlist.org/',
    integration_status: 'CONTRACT_ONLY',
    terms_or_license_notes:
      'IUCN Red List terms are distinct from open CC licenses — do not assume CC-BY.',
    citation_policy: 'Do not treat IUCN as CC-BY; follow IUCN terms when integration is verified.',
  },
  paleobiodb: {
    source_id: 'paleobiodb',
    organization_name: 'Paleobiology Database',
    homepage: 'https://paleobiodb.org/',
    integration_status: 'FIXTURE_ONLY',
    terms_or_license_notes:
      'UNVERIFIED-FIXTURE until an authentic PBDB snapshot is imported. Do not guess license.',
    citation_policy: 'Cite Paleobiology Database only for snapshot-verified fossil facts.',
  },
  neotoma: {
    source_id: 'neotoma',
    organization_name: 'Neotoma Paleoecology Database',
    homepage: 'https://www.neotomadb.org/',
    integration_status: 'CONTRACT_ONLY',
    terms_or_license_notes: 'Neotoma terms apply to paleoecological records.',
    citation_policy: 'Cite Neotoma when using paleoecological facts.',
  },
  nasa_earthdata: {
    source_id: 'nasa_earthdata',
    organization_name: 'NASA Earthdata',
    homepage: 'https://www.earthdata.nasa.gov/',
    integration_status: 'CONTRACT_ONLY',
    terms_or_license_notes: 'NASA Earthdata access and citation policies apply.',
    citation_policy: 'Cite NASA Earthdata products used for environmental context.',
  },
  ics_chronostratigraphic: {
    source_id: 'ics_chronostratigraphic',
    organization_name: 'International Commission on Stratigraphy',
    homepage: 'https://stratigraphy.org/',
    integration_status: 'FIXTURE_ONLY',
    terms_or_license_notes: 'ICS chart reuse follows ICS guidance.',
    citation_policy: 'Cite ICS for geologic time unit labels.',
  },
  encyclopedia_of_life: {
    source_id: 'encyclopedia_of_life',
    organization_name: 'Encyclopedia of Life',
    homepage: 'https://eol.org/',
    integration_status: 'NOT_IMPLEMENTED',
    terms_or_license_notes: 'EOL page/media licenses vary by source.',
    citation_policy: 'Do not claim EOL integration without executed adapter evidence.',
  },
  game_authored: {
    source_id: 'game_authored',
    organization_name: 'Archive of Life editorial/game-authored',
    integration_status: 'FIXTURE_ONLY',
    terms_or_license_notes: 'GAME-ORIGINAL — not an external biodiversity authority.',
    citation_policy: 'Label as game-authored; never badge as GBIF/IUCN/etc.',
  },
  mock_sample: {
    source_id: 'mock_sample',
    organization_name: 'Archive of Life mock/sample fixtures',
    integration_status: 'FIXTURE_ONLY',
    terms_or_license_notes: 'MOCK-SAMPLE — digital validation only.',
    citation_policy: 'Must display MOCK/SAMPLE warning; never source_verified.',
  },
};

export function getSourceOrganization(source: SourceName): SourceRegistryEntry {
  return SOURCE_REGISTRY[source];
}

export function claimLiveIntegration(source: SourceName): boolean {
  return SOURCE_REGISTRY[source].integration_status === 'LIVE_VERIFIED';
}

export function defaultIntegrationStatus(): IntegrationStatus {
  return 'NOT_IMPLEMENTED';
}
