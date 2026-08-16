#!/usr/bin/env npx tsx
/** Emit STREAM-B-PKT-003 Archive artifacts. */
import { emitStreamBPkt003Artifacts } from '../src/systems/streamBPkt003';

const state = emitStreamBPkt003Artifacts();
console.log(
  JSON.stringify(
    {
      packet: state.packet,
      conflicts: (state.scientific_ingest as { conflicts: unknown[] }).conflicts.length,
      lifeling_ok: (state.lifeling_progression as { progressionOk: boolean }).progressionOk,
      diversity_ok: (state.expedition_diversity as { diversityOk: boolean }).diversityOk,
      HUMAN_PLAYTEST_VALIDATED: state.HUMAN_PLAYTEST_VALIDATED,
      GLOBAL_DATA_COMPLETE: state.GLOBAL_DATA_COMPLETE,
      ALL_SPECIES_INGESTED: state.ALL_SPECIES_INGESTED,
    },
    null,
    2,
  ),
);
