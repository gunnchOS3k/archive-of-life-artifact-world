# Archive of Life — Wave008 scientific record evidence gate (integrity-repaired)
.PHONY: wave008 wave008-prepare wave008-browser wave008-python wave008-python-ab verify test

wave008-prepare:
	@mkdir -p public/data/scientific_fixtures artifacts/engineering_wave008
	@cp -f data/scientific_fixtures/wave008-scientific-fixture-v1.json public/data/scientific_fixtures/
	@rm -f artifacts/engineering_wave008/_browser_harness.html

wave008-browser: wave008-prepare
	node scripts/engineering_wave008/run_browser_e2e.mjs

wave008-python:
	npm run pipeline:install
	npm run pipeline:lint
	npm run pipeline:test
	npm run pipeline:build-snapshot
	npm run pipeline:audit

wave008-python-ab:
	@mkdir -p artifacts/engineering_wave008/pipeline_ab/A artifacts/engineering_wave008/pipeline_ab/B
	@cd data-pipeline && uv run archive-pipeline build-snapshot && cp -f exports/release_snapshot_manifest.json ../artifacts/engineering_wave008/pipeline_ab/A/
	@cd data-pipeline && uv run archive-pipeline build-snapshot && cp -f exports/release_snapshot_manifest.json ../artifacts/engineering_wave008/pipeline_ab/B/
	@python3 scripts/engineering_wave008/compare_pipeline_ab.py

wave008:
	npm run typecheck
	@$(MAKE) wave008-python
	@$(MAKE) wave008-python-ab
	@$(MAKE) wave008-browser
	npx vitest run tests/engineering_wave008/wave008_scientific_records.test.ts
	@test -f artifacts/engineering_wave008/WAVE008_RESULT.json
	@test -f artifacts/engineering_wave008/WAVE008_INTEGRITY_REPAIR_RESULT.json
	@test -f artifacts/engineering_wave008/REQUIREMENT_RESULTS.json
	@test -f artifacts/engineering_wave008/REQUIREMENT_EVALUATOR_MATRIX.json
	@test -f artifacts/engineering_wave008/EVALUATOR_INTEGRITY_RESULT.json
	@test -f artifacts/engineering_wave008/BEHAVIORAL_NEGATIVE_CONTROL_RESULT.json
	@test -f artifacts/engineering_wave008/COMPLETION_GATE_NEGATIVE_CONTROL_RESULT.json
	@test -f artifacts/engineering_wave008/ARCHIVEDEX_BROWSER_E2E_RESULT.json
	@test -f artifacts/engineering_wave008/CLAIM_BOUNDARIES.json
	@test -f artifacts/engineering_wave008/COVERAGE_SCOPE_RESULT.json
	@test -f artifacts/engineering_wave008/CANONICAL_IDENTIFIER_RESULT.json
	@test -f artifacts/engineering_wave008/SCIENTIFIC_NAME_RESULT.json
	@test -f artifacts/engineering_wave008/TAXONOMIC_AUTHORITY_RESULT.json
	@test -f artifacts/engineering_wave008/SOURCE_ORGANIZATION_RESULT.json
	@test -f artifacts/engineering_wave008/SOURCE_RECORD_ID_RESULT.json
	@test -f artifacts/engineering_wave008/LICENSE_TERMS_RESULT.json
	@test -f artifacts/engineering_wave008/RETRIEVAL_DATE_RESULT.json
	@test -f artifacts/engineering_wave008/SOURCE_VERSION_RESULT.json
	@test -f artifacts/engineering_wave008/GEOGRAPHIC_PROVENANCE_RESULT.json
	@test -f artifacts/engineering_wave008/TIME_RANGE_RESULT.json
	@test -f artifacts/engineering_wave008/UNCERTAINTY_RESULT.json
	@test -f artifacts/engineering_wave008/EDITORIAL_STATUS_RESULT.json
	@test -f artifacts/engineering_wave008/CITATION_UI_RESULT.json
	@test -f artifacts/engineering_wave008/SOURCE_INTEGRATION_TRUTH_RESULT.json
	@test -f artifacts/engineering_wave008/SNAPSHOT_MANIFEST_RESULT.json
	@test -f artifacts/engineering_wave008/SNAPSHOT_REPRODUCTION_RESULT.json
	@test -f artifacts/engineering_wave008/FIELD_PROVENANCE_RESULT.json
	@test -f artifacts/engineering_wave008/EXTERNAL_TEXT_SAFETY_RESULT.json
	@test -f artifacts/engineering_wave008/SOURCE_PROVENANCE_RESULT.json
	@python3 -c "import json; r=json.load(open('artifacts/engineering_wave008/ARCHIVEDEX_BROWSER_E2E_RESULT.json')); assert r.get('playwright_ran') is True; assert r.get('playwright_skipped') is False; assert r.get('ok') is True; assert r.get('runtime')=='vite_preview'; assert r.get('vite_product_runtime') is True"
	@python3 -c "import json; r=json.load(open('artifacts/engineering_wave008/WAVE008_RESULT.json')); assert r.get('UNCONDITIONAL_TRUE_CLASSIFIERS',1)==0; assert r.get('UNCONDITIONAL_TRUE_CLASSIFIERS_COMPUTED') is True; assert r.get('BEHAVIORAL_NEGATIVE_CONTROLS_PASS') is True; assert r.get('BEHAVIORAL_NEGATIVE_CONTROL_COUNT',0)>=22; assert r.get('FIXTURE_ONLY_SOURCE_VERIFIED_COUNT',1)==0; assert r.get('OS_PLATFORM_020_UNTOUCHED') is True; assert r.get('BASELINE_COUNTS_UPDATED') is False; assert r.get('PLAYWRIGHT_SKIPPED') is False; assert r.get('claim_flags',{}).get('ALL_KNOWN_LIFE_COMPLETE') is False; assert r.get('claim_flags',{}).get('GBIF_LIVE_INTEGRATION') is False; assert r.get('AUTHENTIC_EXTERNAL_SOURCE_SNAPSHOTS_PRESENT') is False"
	@python3 -c "import json; r=json.load(open('artifacts/engineering_wave008/WAVE008_INTEGRITY_REPAIR_RESULT.json')); assert r.get('WAVE008_PREMERGE_INTEGRITY_REPAIR') in ('PASS','PARTIAL'); assert r.get('STATIC_HARNESS_CLOSURE') is False"

verify:
	npm run verify

test:
	npm test
