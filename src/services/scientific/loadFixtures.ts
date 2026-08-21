import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ScientificRecordSnapshot } from '@/schema/scientificRecord';
import { WAVE008_FIXTURE_SNAPSHOT_ID } from './fixtures';

export function loadWave008ScientificFixtures(
  root = process.cwd(),
): { snapshot_id: string; retrieved_at: string; records: ScientificRecordSnapshot[] } {
  const path = join(root, 'data/scientific_fixtures', `${WAVE008_FIXTURE_SNAPSHOT_ID}.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

export { WAVE008_FIXTURE_SNAPSHOT_ID, scientificRecordToArchiveDexEntry } from './fixtures';
