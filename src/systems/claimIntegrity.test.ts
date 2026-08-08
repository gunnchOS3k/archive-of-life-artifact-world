import { describe, expect, it } from 'vitest';
import { canonicalizeTaxonName, isAcceptableTaxonName } from '@/services/ingestion/taxonName';
import { auditLaunchTiers } from '@/claims/launchTierAudit';
import { evaluateClaimLedger } from '@/claims/evaluateClaimLedger';
import {
  assertNoForbiddenClaims,
  isForbiddenClaimToken,
  snapshotVersionLoadedToken,
} from '@/claims/claimTokens';
import { buildBulkSnapshotManifest, sha256Buffer } from '@/services/ingestion/bulk/BulkSnapshotManifest';

describe('taxon name canonicalization', () => {
  it('strips authorship and accepts binomials', () => {
    expect(canonicalizeTaxonName('Ursus arctos Linnaeus, 1758')).toBe('Ursus arctos');
    expect(isAcceptableTaxonName('Ursus arctos Linnaeus, 1758')).toBe(true);
    expect(canonicalizeTaxonName('Tyrannosaurus sp.')).toBe('Tyrannosaurus');
    expect(isAcceptableTaxonName('?')).toBe(false);
  });
});

describe('claim firewall tokens', () => {
  it('rejects GLOBAL_DATA_COMPLETE / ALL_SPECIES_INGESTED', () => {
    expect(isForbiddenClaimToken('GLOBAL_DATA_COMPLETE')).toBe(true);
    expect(isForbiddenClaimToken('ALL_SPECIES_INGESTED')).toBe(true);
    expect(() => assertNoForbiddenClaims(['GLOBAL_DATA_COMPLETE'])).toThrow(/CLAIM_FIREWALL/);
    expect(snapshotVersionLoadedToken('2.1.0-cont-v')).toBe('SNAPSHOT_VERSION_2_1_0_CONT_V_LOADED');
  });
});

describe('launch tier + claim ledger Cont V', () => {
  it('earns E/F when floors met and revokes premature RC without pipeline', () => {
    const launch = auditLaunchTiers({
      snapshotId: 't',
      regions: Array.from({ length: 12 }, (_, i) => ({
        id: i === 7 ? 'polar_ice' : `r${i}`,
        biome: 'x',
        speciesIds: ['a'],
      })),
      encounterSpecies: Array.from({ length: 130 }, (_, i) => ({
        id: `e${i}`,
        scientificName: `Genus species${i}`,
        programTier: 'E_Encounter',
        isPlayable: true,
        region: 'r0',
      })),
      flagshipSpecies: Array.from({ length: 24 }, (_, i) => ({
        id: `f${i}`,
        scientificName: `Hero species${i}`,
        gameplay: { role: 'flagship' },
        artifactTemplates: [{ id: 'a' }],
      })),
    });
    expect(launch.tokens.LAUNCH_TIER_E_COMPLETE).toBe(true);
    expect(launch.tokens.LAUNCH_TIER_F_COMPLETE).toBe(true);

    const ledger = evaluateClaimLedger({
      snapshotId: 't',
      snapshotVersion: '2.0.0',
      launch,
      fixtureSnapshotLoaded: true,
      pipelineComplete: false,
      pipelineReason: 'probe insufficient',
      officialBulkSnapshotLoaded: false,
      liveRecordsBySource: { col: 1, gbif: 0, pbdb: 0 },
      fixtureUniqueTaxa: 987,
      priorBetaToken: 'ARCHIVE_BETA_CONTENT_COMPLETE_DIGITAL',
      priorRcToken: 'ARCHIVE_DIGITAL_RC_READY',
      worldTraversalPass: true,
      worldTraversalDetail: 'ok',
    });
    expect(ledger.earned.some((e) => e.token === 'LAUNCH_TIER_E_COMPLETE')).toBe(true);
    expect(ledger.earned.some((e) => e.token === 'PIPELINE_COMPLETE')).toBe(false);
    expect(ledger.revoked.some((r) => r.token === 'ARCHIVE_DIGITAL_RC_READY')).toBe(true);
    expect(ledger.forbiddenRejected.map((f) => f.token)).toEqual(
      expect.arrayContaining(['GLOBAL_DATA_COMPLETE', 'ALL_SPECIES_INGESTED']),
    );
  });
});

describe('bulk snapshot manifest', () => {
  it('builds manifest without global complete claim and hashes buffers', () => {
    const m = buildBulkSnapshotManifest({ snapshotId: 's', snapshotVersion: '1' });
    expect(m.globalCompleteClaim).toBe(false);
    expect(m.sources.length).toBeGreaterThanOrEqual(3);
    expect(sha256Buffer('fixture')).toMatch(/^[a-f0-9]{64}$/);
  });
});
