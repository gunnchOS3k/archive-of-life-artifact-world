from __future__ import annotations

import argparse
import sys

from archive_life_pipeline.audit import run_pipeline_audit
from archive_life_pipeline.duckdb_runner import run_sql_pipeline
from archive_life_pipeline.snapshot import build_snapshot_manifest


def main() -> None:
    parser = argparse.ArgumentParser(prog="archive-pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("sql", help="Run SQL validation pipeline")
    sub.add_parser("audit", help="Run pipeline audit")
    sub.add_parser("build-snapshot", help="Build release snapshot manifest")

    args = parser.parse_args()

    if args.command == "sql":
        out = run_sql_pipeline()
        errors = [r for r in out["sql_results"] if r["status"] == "error"]
        for r in out["sql_results"]:
            icon = "✓" if r["status"] == "ok" else "✗"
            print(f"{icon} {r['file']}")
            if r.get("error"):
                print(f"  {r['error']}")
        sys.exit(1 if errors else 0)

    if args.command == "audit":
        summary = run_pipeline_audit()
        for c in summary.checks:
            icon = "✓" if c["passed"] else "✗"
            print(f"{icon} {c['name']}: {c['message']}")
        print(f"\n{summary.passed}/{summary.passed + summary.failed} checks passed")
        sys.exit(1 if summary.failed else 0)

    if args.command == "build-snapshot":
        out = build_snapshot_manifest()
        print(
            f"Snapshot manifest written: {out['dataSnapshotId']} "
            f"({len(out['bundleChecksums'])} bundles)"
        )
        sys.exit(0)


if __name__ == "__main__":
    main()
