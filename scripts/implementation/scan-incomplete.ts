import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { IncompleteInventoryItem } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');
export const STATUS_DIR = join(ROOT, 'public', 'data', 'status');

const MARKER_PATTERNS: Array<{ type: string; regex: RegExp }> = [
  { type: 'TODO', regex: /\bTODO\b/i },
  { type: 'FIXME', regex: /\bFIXME\b/i },
  { type: 'WIP', regex: /\bWIP\b/i },
  { type: 'TBD', regex: /\bTBD\b/i },
  { type: 'coming_soon', regex: /coming soon/i },
  { type: 'not_implemented', regex: /not implemented/i },
  { type: 'placeholder', regex: /\bplaceholder\b/i },
  { type: 'scaffold', regex: /\bscaffold\b/i },
  { type: 'temporary', regex: /\btemporary\b/i },
  { type: 'hardcoded', regex: /\bhardcoded\b/i },
  { type: 'for_now', regex: /for now/i },
  { type: 'eventually', regex: /\beventually\b/i },
  { type: 'demo_only', regex: /demo only/i },
];

const RELEASE_PATH_PREFIXES = ['src/'];
const RELEASE_PATH_FILES = ['index.html'];

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.venv',
  '__pycache__',
  '.git',
  'public/data/bundles',
  'public/data/time',
]);

const SKIP_FILES = /\.(lock|json)$/;

function isReleasePath(relPath: string): boolean {
  if (RELEASE_PATH_FILES.includes(relPath)) return true;
  return RELEASE_PATH_PREFIXES.some((p) => relPath.startsWith(p));
}

function inferSystem(filePath: string): string {
  if (filePath.startsWith('src/game/')) return 'playable_game_loop';
  if (filePath.startsWith('src/ui/archiveDex')) return 'archivedex';
  if (filePath.startsWith('src/ui/timeAtlas')) return 'time_atlas';
  if (filePath.startsWith('src/ui/earthLayer')) return 'earth_layer_console';
  if (filePath.startsWith('src/ui/coverage')) return 'coverage_dashboard';
  if (filePath.startsWith('src/ui/implementation')) return 'implementation_dashboard';
  if (filePath.startsWith('src/coverage/')) return 'global_coverage_matrix';
  if (filePath.startsWith('data-pipeline/')) return 'python_pipeline';
  if (filePath.startsWith('scripts/audit')) return 'audits';
  return 'unknown';
}

function classifyItem(
  relPath: string,
  markerType: string,
  line: string,
  releasePath: boolean
): Pick<IncompleteInventoryItem, 'currentStatus' | 'requiredAction' | 'blocksRelease' | 'severity'> {
  const lower = line.toLowerCase();

  if (!releasePath) {
    if (
      relPath.includes('data-pipeline/ingest/') ||
      relPath.includes('data-pipeline/transform/') ||
      markerType === 'placeholder' ||
      markerType === 'scaffold'
    ) {
      return {
        currentStatus: 'blocked_external',
        requiredAction: 'Documented as blocked external ingestion — not player-facing.',
        blocksRelease: false,
        severity: 'info',
      };
    }
    if (relPath.startsWith('docs/') || relPath.startsWith('public/data/coverage/')) {
      return {
        currentStatus: 'intentional_sample',
        requiredAction: 'Documentation or registry entry — no code change required.',
        blocksRelease: false,
        severity: 'info',
      };
    }
  }

  if (relPath.includes('generate-bundles') || relPath.includes('generate-time-atlas')) {
    return {
      currentStatus: 'intentional_sample',
      requiredAction: 'Sample bundle generator — mock flags are intentional.',
      blocksRelease: false,
      severity: 'info',
    };
  }

  if (lower.includes('mock-badge') || lower.includes('mock sample') || lower.includes('ismockdata')) {
    return {
      currentStatus: 'intentional_sample',
      requiredAction: 'Intentional mock/sample labeling for players.',
      blocksRelease: false,
      severity: 'info',
    };
  }

  if (relPath === 'index.html' && lower.includes('placeholder=')) {
    return {
      currentStatus: 'resolved',
      requiredAction: 'HTML input placeholder attribute — not incomplete feature.',
      blocksRelease: false,
      severity: 'info',
    };
  }

  if (markerType === 'TODO' || markerType === 'FIXME' || markerType === 'coming_soon' || markerType === 'not_implemented') {
    return {
      currentStatus: 'needs_action',
      requiredAction: 'Remove or resolve marker in release-path code.',
      blocksRelease: releasePath,
      severity: releasePath ? 'critical' : 'medium',
    };
  }

  if (releasePath && (markerType === 'placeholder' || markerType === 'scaffold')) {
    return {
      currentStatus: 'needs_action',
      requiredAction: 'Replace scaffold/placeholder with implementation or hide feature.',
      blocksRelease: true,
      severity: 'high',
    };
  }

  return {
    currentStatus: 'resolved',
    requiredAction: 'Reviewed — non-blocking in current release scope.',
    blocksRelease: false,
    severity: 'low',
  };
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    if (SKIP_DIRS.has(entry) || [...SKIP_DIRS].some((d) => rel.startsWith(d))) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, files);
    } else if (
      /\.(ts|tsx|py|sql|html|md)$/.test(entry) &&
      !SKIP_FILES.test(entry) &&
      !rel.includes('uv.lock')
    ) {
      files.push(full);
    }
  }
  return files;
}

export function scanIncompleteInventory(): IncompleteInventoryItem[] {
  const files = walk(ROOT);
  const items: IncompleteInventoryItem[] = [];
  let id = 0;

  for (const file of files) {
    const relPath = relative(ROOT, file);
    const releasePath = isReleasePath(relPath);
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { type, regex } of MARKER_PATTERNS) {
        if (!regex.test(line)) continue;
        const classification = classifyItem(relPath, type, line, releasePath);
        items.push({
          id: `inv_${++id}`,
          filePath: relPath,
          lineNumber: i + 1,
          markerType: type,
          matchedText: line.trim().slice(0, 160),
          affectedSystem: inferSystem(relPath),
          severity: classification.severity,
          currentStatus: classification.currentStatus,
          requiredAction: classification.requiredAction,
          blocksRelease: classification.blocksRelease,
          releasePath,
        });
      }
    }
  }

  return items;
}

export function scanFileCount(): number {
  return walk(ROOT).length;
}
