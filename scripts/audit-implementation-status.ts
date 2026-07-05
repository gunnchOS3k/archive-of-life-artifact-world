/**
 * Generate implementation_status.json and incomplete_inventory.json
 * Run: npm run audit:implementation
 */
import { writeImplementationReports } from './implementation/write-reports';

const { implementation, inventory, blockingCount } = writeImplementationReports();

console.log('\n=== Implementation Status Audit ===\n');
console.log(`Systems: ${implementation.systems.length}`);
console.log(`  FULLY_IMPLEMENTED: ${implementation.summary.fullyImplemented}`);
console.log(`  PARTIAL_IMPLEMENTATION: ${implementation.summary.partialImplementation}`);
console.log(`  MOCK_SAMPLE_ONLY: ${implementation.summary.mockSampleOnly}`);
console.log(`  BLOCKED_BY_EXTERNAL_DATA: ${implementation.summary.blockedExternalData}`);
console.log(`  SCAFFOLD_ONLY: ${implementation.summary.scaffoldOnly}`);
console.log(`  PLANNED_NOT_STARTED: ${implementation.summary.plannedNotStarted}`);
console.log(`\nIncomplete inventory: ${inventory.itemCount} markers (${blockingCount} release-blocking)`);
console.log('Wrote public/data/status/implementation_status.json');
console.log('Wrote public/data/status/incomplete_inventory.json\n');

if (blockingCount > 0) {
  const blocking = inventory.items.filter((i) => i.blocksRelease && i.currentStatus === 'needs_action');
  console.error('Release-blocking incomplete markers in release-path code:');
  for (const b of blocking.slice(0, 10)) {
    console.error(`  ${b.filePath}:${b.lineNumber} [${b.markerType}] ${b.matchedText}`);
  }
  process.exit(1);
}

process.exit(0);
