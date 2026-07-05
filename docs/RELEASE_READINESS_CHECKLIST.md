# Release readiness checklist

Run before tagging a sample or production release:

```bash
npm run generate:time-atlas
npm run generate:bundles
npm run typecheck
npm run audit:data
npm run audit:coverage
npm run audit:archivedex
npm run audit:implementation
npm run audit:release
npm run build
npm run pipeline:all
```

## Gates (`npm run audit:release`)

Release fails if:

- [ ] Any player-facing system is `SCAFFOLD_ONLY` or `PLANNED_NOT_STARTED`
- [ ] Tier 4+ records lack artifact templates
- [ ] Tier 6 records lack educational sections
- [ ] Hero species lack provenance
- [ ] Mock/sample data counted as source-verified coverage
- [ ] Release-path code contains unresolved TODO/FIXME/scaffold markers
- [ ] Documented npm scripts missing from `package.json`
- [ ] Mock source snapshots marked `approvedForUse`
- [ ] CI workflow missing `audit:release`

## Honest release claims

You **may** claim:

- Playable educational prototype with sample biodiversity data
- Ethical artifact collection and expedition gameplay
- ArchiveDex, Time Atlas, and Earth Layer with mock/sample labeling
- Audited sample-scope coverage matrix

You **may not** claim:

- Complete global species coverage
- Production Catalogue of Life / GBIF / IUCN integration
- Live NASA Earthdata layers without ingestion
- Source-verified scientific completeness

## Artifacts to archive per release

- `public/data/status/release_readiness_report.json`
- `public/data/manifest.json` snapshot ID
- Git commit SHA
- CI run URL

See `docs/RELEASE_SNAPSHOT_POLICY.md`.
