import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { SYSTEM_REGISTRY, summarizeSystems } from './systems';
import { scanIncompleteInventory, scanFileCount, STATUS_DIR, ROOT } from './scan-incomplete';
import type { ImplementationStatusReport, IncompleteInventoryReport } from './types';

export function buildImplementationReports(): {
  implementation: ImplementationStatusReport;
  inventory: IncompleteInventoryReport;
  blockingCount: number;
} {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'public/data/manifest.json'), 'utf-8'));
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
  const items = scanIncompleteInventory();
  const blocking = items.filter((i) => i.blocksRelease && i.currentStatus === 'needs_action');

  const implementation: ImplementationStatusReport = {
    snapshotId: manifest.snapshotId,
    generatedAt: new Date().toISOString(),
    gameVersion: pkg.version,
    summary: summarizeSystems(SYSTEM_REGISTRY),
    systems: SYSTEM_REGISTRY,
  };

  const inventory: IncompleteInventoryReport = {
    generatedAt: new Date().toISOString(),
    totalScannedFiles: scanFileCount(),
    itemCount: items.length,
    releasePathItemCount: items.filter((i) => i.releasePath).length,
    blockingItemCount: blocking.length,
    items,
  };

  return { implementation, inventory, blockingCount: blocking.length };
}

export function writeImplementationReports(): {
  implementation: ImplementationStatusReport;
  inventory: IncompleteInventoryReport;
  blockingCount: number;
} {
  const reports = buildImplementationReports();
  mkdirSync(STATUS_DIR, { recursive: true });
  writeFileSync(
    join(STATUS_DIR, 'implementation_status.json'),
    JSON.stringify(reports.implementation, null, 2)
  );
  writeFileSync(
    join(STATUS_DIR, 'incomplete_inventory.json'),
    JSON.stringify(reports.inventory, null, 2)
  );
  return reports;
}
