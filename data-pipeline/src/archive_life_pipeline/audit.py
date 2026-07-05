from __future__ import annotations

import json
from datetime import UTC, datetime

from archive_life_pipeline.duckdb_runner import run_sql_pipeline
from archive_life_pipeline.models import AuditSummary
from archive_life_pipeline.paths import COVERAGE_DIR, PUBLIC_DATA


def run_pipeline_audit() -> AuditSummary:
    public = PUBLIC_DATA
    checks: list[dict] = []
    mock_count = 0

    manifest = json.loads((public / "manifest.json").read_text())
    index = json.loads((public / "bundles" / "search-index.json").read_text())
    hero = json.loads((public / "bundles" / "hero-species.json").read_text())

    checks.append({
        "name": "manifest_present",
        "passed": bool(manifest.get("snapshotId")),
        "message": f"snapshotId={manifest.get('snapshotId')}",
    })

    missing_tier = [e for e in index["entries"] if e.get("representationTier") is None]
    checks.append({
        "name": "representation_tier_present",
        "passed": len(missing_tier) == 0,
        "message": f"{len(missing_tier)} entries missing tier",
    })

    no_prov = [s for s in hero["species"] if not s.get("provenance")]
    checks.append({
        "name": "hero_provenance",
        "passed": len(no_prov) == 0,
        "message": f"{len(no_prov)} hero species missing provenance",
    })

    for sp in hero["species"]:
        for p in sp.get("provenance", []):
            if p.get("isMockData"):
                mock_count += 1

    sql_out = run_sql_pipeline()
    failed_sql = [r for r in sql_out["sql_results"] if r["status"] == "error"]
    checks.append({
        "name": "sql_pipeline",
        "passed": len(failed_sql) == 0,
        "message": f"{len(failed_sql)} SQL file errors",
    })

    passed = sum(1 for c in checks if c["passed"])
    failed = len(checks) - passed
    summary = AuditSummary(
        generated_at=datetime.now(UTC),
        passed=passed,
        failed=failed,
        checks=checks,
        mock_sample_count=mock_count,
        gap_count=len(sql_out.get("gaps", [])),
    )

    COVERAGE_DIR.mkdir(parents=True, exist_ok=True)
    (COVERAGE_DIR / "pipeline_audit_summary.json").write_text(summary.model_dump_json(indent=2))
    return summary
