import { describe, expect, it } from 'vitest';
import { fetchIucnGated } from '@/services/ingestion/publicSourceAdapters';
import {
  applyBlockedIucnAdapterToConservation,
  assertIucnBlockedHonesty,
  renderIucnBlockedEvidenceStripHtml,
  renderIucnBlockedPanelHtml,
  renderIucnHonestyBadgeHtml,
  renderIucnPlayerStatusHtml,
  resolveIucnPlayerPresentation,
} from '@/systems/iucnBlockedPresentation';

describe('IUCN blocked player-facing UX', () => {
  it('resolveIucnPlayerPresentation stays blocked_external with assessed=false', () => {
    const p = resolveIucnPlayerPresentation({
      assessed: false,
      iucnCategory: 'Vulnerable',
      dataMode: 'mock_sample',
    });
    expect(p.gateState).toBe('blocked_external');
    expect(p.assessed).toBe(false);
    expect(p.sourceVerified).toBe(false);
    expect(p.showAssessedBadge).toBe(false);
    expect(p.gameplayCategoryLabel).toBe('Vulnerable');
    expect(p.playerSummary).toMatch(/blocked_external/i);
    expect(p.rightsCredentialNote).toMatch(/IUCN_API_TOKEN|rights/i);
    expect(() => assertIucnBlockedHonesty(p)).not.toThrow();
  });

  it('does not promote assessed=true / source_verified when callers pass those flags without authorization', () => {
    const p = resolveIucnPlayerPresentation({
      assessed: true,
      iucnCategory: 'Endangered',
      dataMode: 'mock_sample',
      verificationStatus: 'mock_sample',
    });
    expect(p.assessed).toBe(false);
    expect(p.sourceVerified).toBe(false);
    expect(p.gateState).toBe('blocked_external');
    expect(p.showAssessedBadge).toBe(false);
  });

  it('blocked adapter path cannot flip conservation.assessed or source_verified', async () => {
    const adapter = await fetchIucnGated(null);
    expect(adapter.blocked).toBe(true);
    expect(adapter.meta.verificationStatus).toBe('blocked_external');
    expect(adapter.records).toEqual([]);

    const prior = {
      iucnCategory: 'Vulnerable' as const,
      assessed: false,
      sourceVersion: 'quarantined-mock-iucn-2026-07',
      lastUpdated: '2026-07-02',
      dataMode: 'mock_sample' as const,
      uncertaintyNote: 'gameplay planning label',
    };

    const next = applyBlockedIucnAdapterToConservation(prior, adapter);
    expect(next.assessed).toBe(false);
    expect(next.sourceVerified).toBe(false);
    expect(next.verificationStatus).toBe('blocked_external');
    expect(next.dataMode).not.toBe('source_verified');
    expect(next.iucnCategory).toBe('Vulnerable');

    // Sabotage attempt: even if prior wrongly claimed assessed, blocked apply forces false
    const sabotaged = applyBlockedIucnAdapterToConservation(
      { ...prior, assessed: true, dataMode: 'source_verified' },
      adapter,
    );
    expect(sabotaged.assessed).toBe(false);
    expect(sabotaged.sourceVerified).toBe(false);
    expect(sabotaged.dataMode).not.toBe('source_verified');
    expect(sabotaged.verificationStatus).toBe('blocked_external');
  });

  it('refuses to honor a fake source_verified adapter claim on the apply path', () => {
    expect(() =>
      applyBlockedIucnAdapterToConservation(
        {
          iucnCategory: 'Least Concern',
          assessed: false,
          sourceVersion: 'x',
          lastUpdated: '2026-10-29',
        },
        {
          blocked: false,
          ok: true,
          meta: {
            verificationStatus: 'source_verified',
          } as never,
        },
      ),
    ).toThrow(/source_verified|Honesty violation/i);
  });

  it('player HTML never emits assessed badges or source_verified claims', () => {
    const p = resolveIucnPlayerPresentation({
      assessed: false,
      iucnCategory: 'Vulnerable',
      dataMode: 'mock_sample',
    });
    const status = renderIucnPlayerStatusHtml(p);
    const badge = renderIucnHonestyBadgeHtml(p);
    const panel = renderIucnBlockedPanelHtml(p);
    const strip = renderIucnBlockedEvidenceStripHtml(p);
    const blob = `${status}\n${badge}\n${panel}\n${strip}`;

    expect(blob).toMatch(/blocked_external/);
    expect(blob).toMatch(/data-iucn-assessed="false"/);
    expect(blob).toMatch(/data-iucn-source-verified="false"/);
    expect(blob).toMatch(/data-iucn-show-assessed-badge="false"/);
    expect(blob).toMatch(/rights|credential|IUCN_API_TOKEN/i);
    expect(blob).not.toMatch(/data-iucn-assessed="true"/);
    expect(blob).not.toMatch(/assessed=true/);
    expect(blob).not.toMatch(/source_verified=true/);
    expect(blob).not.toMatch(/class="[^"]*assessed-badge/);
    // Gameplay label may appear, but only as not-assessed
    expect(status).toMatch(/Gameplay label: Vulnerable \(not assessed\)/);
  });
});
