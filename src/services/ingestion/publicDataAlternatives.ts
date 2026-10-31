/**
 * Approved public-data alternative investigation (no invented rights).
 *
 * Catalogs candidate sources that may supplement COL/GBIF/PBDB/Neotoma/NASA
 * when IUCN is blocked_external. Does not invent API tokens, licenses, or
 * live redistribution rights. Adapter presence ≠ approvedForUse.
 */

export type AlternativeAdapterStatus =
  | 'live_adapter_unreviewed'
  | 'stub_or_fixture_only'
  | 'planned_missing'
  | 'blocked_rights_review';

export type PublicDataAlternative = {
  id: string;
  organization: string;
  domain: string;
  /** Public docs URL — not a rights grant. */
  publicDocsUrl: string;
  /** Honest license posture without inventing approval. */
  licensePosture: string;
  adapterStatus: AlternativeAdapterStatus;
  approvedForUse: false;
  sourceVerifiedRelease: false;
  substitutesForIucn: false;
  scienceValueWithoutIucn: string;
  nextOwnerAction: string;
  notes: string;
};

export type PublicDataAlternativesReport = {
  schema: 'aol.public_data_alternatives.v1';
  generatedAt: string;
  iucnBlocksAllScience: false;
  anyApprovedForUse: false;
  anySourceVerified: false;
  temporalMapsHonesty: '0/17';
  rule: string;
  alternatives: PublicDataAlternative[];
};

const RULE =
  'Investigation-only catalog: adapter code or public docs ≠ redistribution rights; never invent tokens; IUCN block ≠ freeze all science; keep 0/17 maps honest.';

/**
 * Candidate public alternatives. Rights remain external until human review stamps approval.
 */
export const PUBLIC_DATA_ALTERNATIVES: PublicDataAlternative[] = [
  {
    id: 'worms',
    organization: 'WoRMS Editorial Board',
    domain: 'Marine taxonomy',
    publicDocsUrl: 'https://www.marinespecies.org/rest/',
    licensePosture: 'WoRMS data policy — per-record attribution; not auto-approved for game redistribution',
    adapterStatus: 'live_adapter_unreviewed',
    approvedForUse: false,
    sourceVerifiedRelease: false,
    substitutesForIucn: false,
    scienceValueWithoutIucn: 'Marine accepted names / AphiaIDs while IUCN conservation stays blocked',
    nextOwnerAction: 'Human license/redistribution review before source_verified or approvedForUse',
    notes: 'registry.ts wormsProvider exists; live fetch ≠ verification',
  },
  {
    id: 'obis',
    organization: 'OBIS',
    domain: 'Marine occurrences',
    publicDocsUrl: 'https://api.obis.org/',
    licensePosture: 'OBIS data policy — verify per record; not assumed CC-BY for all publishers',
    adapterStatus: 'live_adapter_unreviewed',
    approvedForUse: false,
    sourceVerifiedRelease: false,
    substitutesForIucn: false,
    scienceValueWithoutIucn: 'Marine occurrence context without inventing IUCN assessments',
    nextOwnerAction: 'Confirm publisher licenses for any packaged OBIS rows',
    notes: 'registry.ts obisProvider exists; occurrence sample only',
  },
  {
    id: 'opentree',
    organization: 'Open Tree of Life',
    domain: 'Phylogeny / taxonomy synthesis',
    publicDocsUrl: 'https://opentreeoflife.github.io/',
    licensePosture: 'Open Tree terms — investigation only; no adapter rights invented',
    adapterStatus: 'planned_missing',
    approvedForUse: false,
    sourceVerifiedRelease: false,
    substitutesForIucn: false,
    scienceValueWithoutIucn: 'Optional phylogeny context for ArchiveDex — not conservation status',
    nextOwnerAction: 'Owner decides whether to authorize a bounded adapter + license review',
    notes: 'No live import workflow registered; do not invent credentials',
  },
  {
    id: 'wikidata',
    organization: 'Wikidata',
    domain: 'Linked identifiers (COL/GBIF/ITIS crosswalks)',
    publicDocsUrl: 'https://www.wikidata.org/wiki/Wikidata:Data_access',
    licensePosture: 'CC0 for Wikidata statements — external identifiers still inherit source terms',
    adapterStatus: 'planned_missing',
    approvedForUse: false,
    sourceVerifiedRelease: false,
    substitutesForIucn: false,
    scienceValueWithoutIucn: 'Crosswalk helper for public IDs; never treat as IUCN substitute',
    nextOwnerAction: 'If authorized, bound SPARQL/API queries and keep sample_fallback until review',
    notes: 'Identifier bridging only — not a taxonomy authority of record',
  },
  {
    id: 'inaturalist',
    organization: 'iNaturalist',
    domain: 'Community observations',
    publicDocsUrl: 'https://api.inaturalist.org/v1/docs/',
    licensePosture: 'Per-observation licenses vary (often CC-BY-NC); redistribution review required',
    adapterStatus: 'stub_or_fixture_only',
    approvedForUse: false,
    sourceVerifiedRelease: false,
    substitutesForIucn: false,
    scienceValueWithoutIucn: 'Optional occurrence texture — not Red List assessments',
    nextOwnerAction: 'Rate-limit + license filter design before any package claim',
    notes: 'Listed missing/stub in DATA_SOURCE_REGISTRY — do not invent live approval',
  },
  {
    id: 'eol',
    organization: 'Encyclopedia of Life',
    domain: 'Species descriptions / media',
    publicDocsUrl: 'https://eol.org/docs/what-is-eol/data-services',
    licensePosture: 'EOL / content partner licenses vary — educational context only until reviewed',
    adapterStatus: 'planned_missing',
    approvedForUse: false,
    sourceVerifiedRelease: false,
    substitutesForIucn: false,
    scienceValueWithoutIucn: 'Description copy candidates — not conservation or map unlocks',
    nextOwnerAction: 'Rights review per media/text object before ArchiveDex packaging',
    notes: 'Planned in registry docs; no silent synthetic science',
  },
  {
    id: 'smithsonian',
    organization: 'Smithsonian Institution',
    domain: 'Natural history collections',
    publicDocsUrl: 'https://naturalhistory.si.edu/',
    licensePosture: 'Varies by collection — fixture/unavailable path only until rights review',
    adapterStatus: 'blocked_rights_review',
    approvedForUse: false,
    sourceVerifiedRelease: false,
    substitutesForIucn: false,
    scienceValueWithoutIucn: 'Collection provenance demos via blocked fixture — not live API claim',
    nextOwnerAction: 'Owner licensing before any live Smithsonian import',
    notes: 'smithsonianProvider fixture/unavailable; digital pass does not claim live access',
  },
];

export function buildPublicDataAlternativesReport(
  generatedAt = new Date().toISOString(),
): PublicDataAlternativesReport {
  return {
    schema: 'aol.public_data_alternatives.v1',
    generatedAt,
    iucnBlocksAllScience: false,
    anyApprovedForUse: false,
    anySourceVerified: false,
    temporalMapsHonesty: '0/17',
    rule: RULE,
    alternatives: PUBLIC_DATA_ALTERNATIVES.map((a) => ({ ...a })),
  };
}

export function assertAlternativesHonesty(report: PublicDataAlternativesReport): void {
  if (report.iucnBlocksAllScience !== false) {
    throw new Error('Honesty violation: IUCN must not be treated as blocking all science');
  }
  if (report.anyApprovedForUse || report.anySourceVerified) {
    throw new Error('Honesty violation: alternatives catalog must not invent approval/source_verified');
  }
  if (report.temporalMapsHonesty !== '0/17') {
    throw new Error('Honesty violation: alternatives must keep 0/17 map honesty');
  }
  for (const alt of report.alternatives) {
    if (alt.approvedForUse || alt.sourceVerifiedRelease || alt.substitutesForIucn) {
      throw new Error(`Honesty violation: ${alt.id} invented rights or IUCN substitution`);
    }
  }
}

/** Player-facing strip: IUCN blocked ≠ science freeze. */
export function renderPublicAlternativesHonestyHtml(
  report: PublicDataAlternativesReport = buildPublicDataAlternativesReport(),
): string {
  assertAlternativesHonesty(report);
  const items = report.alternatives
    .map(
      (a) =>
        `<li data-alt="${escapeHtml(a.id)}" data-approved="false" data-status="${escapeHtml(a.adapterStatus)}">` +
        `<strong>${escapeHtml(a.organization)}</strong> (${escapeHtml(a.domain)}) — ` +
        `${escapeHtml(a.adapterStatus)}; approvedForUse=false; ` +
        `${escapeHtml(a.scienceValueWithoutIucn)}</li>`,
    )
    .join('');
  return [
    '<aside class="public-data-alternatives" data-iucn-blocks-all-science="false" data-maps="0/17" role="note">',
    '<p><strong>Public science continues without IUCN.</strong> IUCN stays blocked_external; COL/GBIF/PBDB/Neotoma/NASA/ICS remain available as sample_fallback. Candidate alternatives below are investigation-only — no invented rights.</p>',
    `<ul>${items}</ul>`,
    `<p><em>${escapeHtml(report.rule)}</em></p>`,
    '</aside>',
  ].join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
