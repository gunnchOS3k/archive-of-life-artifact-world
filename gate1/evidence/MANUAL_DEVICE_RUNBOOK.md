# Manual Device Runbook — Archive of Life (Gate 1)

Statuses target: `CORE_LOOP_IMPLEMENTED` · `CORE_LOOP_AUTOMATED_EVIDENCE_PASS` · `PHYSICAL_PLAYTEST_PENDING`

## Preconditions
- Branch: `cursor/gate-1-integrated-development-platform`
- Device charged; screen recording permission granted
- Log collector ready: `gate1/tools/log_collector.*`

## Core loop (must complete — launch alone is insufficient)
1. Launch
2. Enter biome
3. Encounter scientifically identified organism (fixture dataset)
4. Observation / capture
5. Artifact created
6. Collection + field journal updated
7. Source/provenance shown
8. Save
9. Reload and verify persistence

## Pass criteria
- Every step above observed on device
- JSONL events collected (or manual checklist signed) with schema fields present
- Save/results screen captured; rematch/restart verified
- Accessibility spot-checks completed (`gate1/evidence/accessibility_checks.json`)

## Fail criteria
- Soft-lock, crash, missing results, or inability to rematch/restart
- Using copyrighted ripped audio (Beat Link) or claiming complete species coverage (Archive of Life)
