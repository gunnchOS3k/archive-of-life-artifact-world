# Dimension matrix

| Dimension | Status | Evidence | Blocker |
|---|---|---|---|
| build | PASS | npm run typecheck + build |  |
| launch | PASS | vite build artifact |  |
| save_load | PARTIAL | local persistence / snapshot fixtures | HUMAN_VALIDATION_REQUIRED |
| menus | PARTIAL | UI routes covered by vitest/playwright when run | HUMAN_VALIDATION_REQUIRED |
| input | PARTIAL | web pointer/keyboard | HUMAN_VALIDATION_REQUIRED |
| pause_resume | NOT_APPLICABLE | not a pause-combat game loop |  |
| crash_recovery | PARTIAL | reload + snapshot reproduction fixtures | HUMAN_VALIDATION_REQUIRED |
| persistence | PARTIAL | local persistence / snapshot fixtures | HUMAN_VALIDATION_REQUIRED |
| frame_pacing | BLOCKED | browser perf needs device/lab | PHYSICAL_HARDWARE_REQUIRED |
| leaks | BLOCKED | heap soak needs longer browser session | PHYSICAL_HARDWARE_REQUIRED |
| loading | PASS | vite build artifact |  |
| asset_validation | PASS | npm run audit:provenance |  |
| resolution | PARTIAL | responsive web | HUMAN_VALIDATION_REQUIRED |
| audio | NOT_APPLICABLE | no commercial audio loop claim |  |
| a11y | HUMAN_VALIDATION_REQUIRED | axe/automation incomplete vs disabled users | HUMAN_VALIDATION_REQUIRED |
| local_multiplayer | NOT_APPLICABLE | single-user archive explorer |  |
| networking | PARTIAL | offline-first + optional live ingest blocked by claim firewall | HUMAN_VALIDATION_REQUIRED |
| offline | PASS | fixture/offline scientific pack doctrine |  |
| install_update | PARTIAL | web deploy / PWA paths if present | HUMAN_VALIDATION_REQUIRED |
| android | PARTIAL | Capacitor/native-run tooling may exist; device required | PHYSICAL_HARDWARE_REQUIRED |
