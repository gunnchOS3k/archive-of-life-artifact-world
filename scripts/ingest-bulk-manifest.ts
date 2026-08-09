import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { buildBulkSnapshotManifest } from '../src/services/ingestion/bulk/BulkSnapshotManifest';

const OUT = join(process.cwd(), 'public/data/claims');
mkdirSync(OUT, { recursive: true });
const manifest = buildBulkSnapshotManifest({
  snapshotId: 'archive-bulk-manifest',
  snapshotVersion: '2.2.0-cont-vii',
});
writeFileSync(join(OUT, 'bulk_snapshot_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(
  'Wrote bulk_snapshot_manifest.json sources=',
  manifest.sources.length,
  'globalCompleteClaim=',
  manifest.globalCompleteClaim,
  'engineRcScope=',
  manifest.engineRcScope,
);
