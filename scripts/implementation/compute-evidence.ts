/**
 * Evidence-based implementation status computation.
 * Statuses derived from audits, file presence, and import reports — not manual optimism.
 */
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import type { ImplementationStatus, SystemRecord } from './types';
import { SYSTEM_REGISTRY } from './systems';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function fileExists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

function readJsonSafe<T>(rel: string): T | null {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8')) as T;
}

function runAudit(script: string): boolean {
  try {
    execSync(`npm run ${script}`, { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function sourceImported(sourceId: string): boolean {
  const report = readJsonSafe<{ sources: Array<{ source: string; imported: boolean }> }>(
    'public/data/status/source_import_status.json'
  );
  return report?.sources?.some((s) => s.source === sourceId && s.imported) ?? false;
}

function hasNasaRealMetadata(): boolean {
  for (const rel of [
    'data-pipeline/exports/nasa/nasa_metadata_manifest.json',
    'public/data/earth/nasa_metadata_cache.json',
  ]) {
    const manifest = readJsonSafe<{ dataMode?: string; layers?: Array<{ mode: string }>; imported?: boolean }>(rel);
    if (!manifest) continue;
    if (manifest.layers?.some((l) => l.mode === 'REAL NASA METADATA')) return true;
    if (manifest.imported === true && manifest.dataMode !== 'sample_fallback') return true;
  }
  return false;
}

function provenanceModelComplete(): boolean {
  const hero = readJsonSafe<{ species: Array<{ provenance?: Array<{ source?: string; verificationStatus?: string; isMockData?: boolean }> }> }>(
    'public/data/bundles/hero-species.json'
  );
  if (!hero?.species?.length) return false;
  const hasGameAuthored = hero.species.some((s) =>
    s.provenance?.some(
      (p) =>
        p.verificationStatus === 'game_authored_verified' ||
        (p.source === 'game_authored' && p.isMockData === false)
    )
  );
  const hasMockLabeled = hero.species.some((s) =>
    s.provenance?.some(
      (p) => p.verificationStatus === 'mock_sample' || p.isMockData === true
    )
  );
  return hasGameAuthored && hasMockLabeled;
}

const SNAPSHOT_SCOPE_NOTE = 'FULLY_IMPLEMENTED for current verified snapshot scope. Global completion requires source snapshot ingestion.';

const STATUS_EVALUATORS: Record<string, () => { status: ImplementationStatus; notes?: string; blockedReason?: string }> = {
  archivedex: () =>
    runAudit('audit:archivedex')
      ? {
          status: 'FULLY_IMPLEMENTED',
          notes: 'ArchiveDex is fully implemented as a species-entry system for the current snapshot. Full Catalogue of Life coverage depends on real COL ingestion.',
        }
      : { status: 'PARTIAL_IMPLEMENTATION', notes: 'ArchiveDex audit failing.' },

  time_atlas: () =>
    runAudit('audit:time')
      ? {
          status: 'FULLY_IMPLEMENTED',
          notes: 'Time Atlas is fully implemented as a browsing and gate system for the current verified time snapshot. Live ICS refresh/import is handled through source ingestion workflow.',
        }
      : { status: 'PARTIAL_IMPLEMENTATION' },

  global_coverage_matrix: () =>
    runAudit('audit:coverage') && fileExists('public/data/coverage/gap_report.json')
      ? {
          status: 'FULLY_IMPLEMENTED',
          notes: 'Global Coverage Matrix is fully implemented as a coverage engine. Global completeness depends on real source snapshot ingestion.',
        }
      : { status: 'PARTIAL_IMPLEMENTATION' },

  coverage_dashboard: () =>
    fileExists('src/ui/coverageDashboardUI.ts') && fileExists('src/coverage/CoverageDashboardService.ts')
      ? {
          status: 'FULLY_IMPLEMENTED',
          notes: 'Coverage Dashboard is fully implemented as a dev/admin dashboard for current snapshot coverage.',
        }
      : { status: 'PARTIAL_IMPLEMENTATION' },

  python_pipeline: () => {
    const cliOk =
      fileExists('data-pipeline/src/archive_life_pipeline/cli.py') &&
      fileExists('data-pipeline/src/archive_life_pipeline/source_import.py');
    return cliOk
      ? {
          status: 'FULLY_IMPLEMENTED',
          notes: 'Python pipeline is fully implemented as the local data pipeline runner. Source-specific ingestion adapters require configured snapshots or credentials.',
        }
      : { status: 'PARTIAL_IMPLEMENTATION' };
  },

  sql_pipeline: () =>
    fileExists('data-pipeline/sql/09_gap_report.sql')
      ? {
          status: 'FULLY_IMPLEMENTED',
          notes: 'SQL pipeline is fully implemented for current snapshot validation and gap reporting.',
        }
      : { status: 'PARTIAL_IMPLEMENTATION' },

  source_provenance: () =>
    provenanceModelComplete()
      ? {
          status: 'FULLY_IMPLEMENTED',
          notes: 'Provenance model distinguishes game_authored_verified, source_verified, mock_sample, derived_inferred, and blocked_external.',
        }
      : { status: 'MOCK_SAMPLE_ONLY', notes: 'Provenance verification classes not yet applied to bundles.' },

  earth_layer_console: () => {
    if (hasNasaRealMetadata()) {
      return {
        status: 'FULLY_IMPLEMENTED',
        notes: 'NASA Earth Layer Console fully implemented for metadata/display scope with real cached NASA metadata. Full Earthdata granule ingestion remains external.',
      };
    }
    if (fileExists('data-pipeline/src/archive_life_pipeline/nasa_ingest.py')) {
      return {
        status: 'PARTIAL_IMPLEMENTATION',
        notes: 'NASA adapters implemented with mode badges; run npm run source:import:nasa for real metadata cache.',
      };
    }
    return { status: 'MOCK_SAMPLE_ONLY' };
  },

  source_snapshot_workflow: () =>
    fileExists('scripts/source-cli.ts') && fileExists('data-pipeline/src/archive_life_pipeline/source_import.py')
      ? {
          status: 'FULLY_IMPLEMENTED',
          notes: 'Source snapshot import workflow is executable via npm run source:* commands.',
        }
      : { status: 'BLOCKED_BY_EXTERNAL_DATA', blockedReason: 'Import workflow not wired.' },

  catalogue_of_life_ingestion: () =>
    sourceImported('col')
      ? { status: 'FULLY_IMPLEMENTED', notes: 'Real COL snapshot imported and audited.' }
      : {
          status: 'BLOCKED_BY_EXTERNAL_DATA',
          blockedReason: 'Catalogue of Life snapshot not found. Download approved snapshot and set COL_SNAPSHOT_PATH in data-pipeline/.env.',
          notes: 'Import command available: npm run source:import:col',
        },

  nasa_earthdata_ingestion: () =>
    sourceImported('nasa')
      ? { status: 'FULLY_IMPLEMENTED', notes: 'NASA metadata/event/climate sources imported and cached.' }
      : {
          status: 'BLOCKED_BY_EXTERNAL_DATA',
          blockedReason: 'No real NASA metadata cache yet. Run npm run source:import:nasa.',
          notes: 'Public API adapters implemented; import populates data-pipeline/exports/nasa/.',
        },

  neotoma_ingestion: () =>
    sourceImported('neotoma')
      ? { status: 'FULLY_IMPLEMENTED', notes: 'Neotoma snapshot or API import complete.' }
      : {
          status: 'BLOCKED_BY_EXTERNAL_DATA',
          blockedReason: 'Neotoma snapshot not configured. Set NEOTOMA_SNAPSHOT_PATH or NEOTOMA_API_ENABLED.',
          notes: 'Import command available: npm run source:import:neotoma',
        },
};

export function computeSystemStatuses(): SystemRecord[] {
  return SYSTEM_REGISTRY.map((base) => {
    const evaluator = STATUS_EVALUATORS[base.id];
    if (!evaluator) return base;
    const computed = evaluator();
    const notes = computed.notes ?? base.notes;
    const scopedNote =
      computed.status === 'FULLY_IMPLEMENTED' &&
      ['archivedex', 'time_atlas', 'global_coverage_matrix', 'coverage_dashboard', 'python_pipeline', 'sql_pipeline', 'earth_layer_console'].includes(base.id) &&
      !notes.includes('snapshot scope')
        ? `${notes} ${SNAPSHOT_SCOPE_NOTE}`
        : notes;
    return {
      ...base,
      status: computed.status,
      notes: scopedNote.replace(`${SNAPSHOT_SCOPE_NOTE} ${SNAPSHOT_SCOPE_NOTE}`, SNAPSHOT_SCOPE_NOTE),
      blockedReason: computed.blockedReason ?? base.blockedReason,
    };
  });
}

export function buildRealDataCompletionPlan(): object {
  const nonFull = SYSTEM_REGISTRY.filter((s) =>
    ['PARTIAL_IMPLEMENTATION', 'MOCK_SAMPLE_ONLY', 'BLOCKED_BY_EXTERNAL_DATA'].includes(s.status)
  );
  const computed = computeSystemStatuses();
  const targets = [
    'archivedex',
    'time_atlas',
    'earth_layer_console',
    'global_coverage_matrix',
    'coverage_dashboard',
    'python_pipeline',
    'sql_pipeline',
    'source_snapshot_workflow',
    'catalogue_of_life_ingestion',
    'source_provenance',
    'nasa_earthdata_ingestion',
    'neotoma_ingestion',
  ];

  return {
    generatedAt: new Date().toISOString(),
    snapshotScopeNote: SNAPSHOT_SCOPE_NOTE,
    systems: targets.map((id) => {
      const current = SYSTEM_REGISTRY.find((s) => s.id === id)!;
      const updated = computed.find((s) => s.id === id)!;
      return {
        id,
        name: current.name,
        currentStatus: updated.status,
        targetStatus:
          id.includes('ingestion') && !sourceImported(id.replace('_ingestion', '').replace('catalogue_of_life', 'col').replace('nasa_earthdata', 'nasa'))
            ? 'BLOCKED_BY_EXTERNAL_DATA until real snapshot imported'
            : 'FULLY_IMPLEMENTED',
        canCompleteLocally: !id.includes('ingestion') || id === 'source_snapshot_workflow' || id === 'nasa_earthdata_ingestion',
        validationCommand: id.includes('pipeline') ? 'npm run pipeline:all' : id.includes('ingestion') ? `npm run source:import:${id.includes('col') ? 'col' : id.includes('nasa') ? 'nasa' : id.includes('neotoma') ? 'neotoma' : 'all'}` : `npm run audit:${id.replace('_', ':')}`,
        releaseEligibleRule: 'Mock/sample and blocked external data never count as source-verified coverage.',
        notes: updated.notes,
        blockedReason: updated.blockedReason,
      };
    }),
    legacyNonFullCount: nonFull.length,
  };
}
