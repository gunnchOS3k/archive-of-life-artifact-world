from __future__ import annotations

import argparse
import json
import sys

from archive_life_pipeline.audit import run_pipeline_audit
from archive_life_pipeline.duckdb_runner import run_sql_pipeline
from archive_life_pipeline.snapshot import build_snapshot_manifest
from archive_life_pipeline.source_import import (
    IMPORTERS,
    audit_sources,
    import_all,
    import_source,
    list_sources,
    validate_sources,
    write_status_reports,
)


def main() -> None:
    parser = argparse.ArgumentParser(prog="archive-pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("sql", help="Run SQL validation pipeline")
    sub.add_parser("audit", help="Run pipeline audit")
    sub.add_parser("build-snapshot", help="Build release snapshot manifest")
    sub.add_parser("validate-snapshots", help="Validate configured source snapshots")
    sub.add_parser("status", help="Show pipeline and source import status")
    sub.add_parser("export-bundles", help="Export bundle checksum manifest")

    import_parser = sub.add_parser("import", help="Import external source snapshot")
    import_parser.add_argument("source", choices=[*IMPORTERS.keys(), "all"])

    sub.add_parser("source-list", help="List source import status")
    sub.add_parser("source-validate", help="Validate source configuration")
    sub.add_parser("source-audit", help="Audit source imports and write status JSON")

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

    if args.command == "validate-snapshots":
        result = validate_sources()
        for c in result["checks"]:
            icon = "✓" if c["passed"] else "○"
            print(f"{icon} {c['source']}: configured={c['configured']} imported={c['imported']}")
        print(f"\nValid: {result['valid']}")
        sys.exit(0)

    if args.command == "status":
        sources = list_sources()
        print(json.dumps(sources, indent=2))
        sys.exit(0)

    if args.command == "export-bundles":
        out = build_snapshot_manifest()
        print(json.dumps(out, indent=2))
        sys.exit(0)

    if args.command == "import":
        if args.source == "all":
            results = import_all()
            for r in results:
                print(f"{r.source}: {r.status} ({r.record_count} records)")
            write_status_reports()
            sys.exit(0)
        try:
            rec = import_source(args.source)
            print(f"✓ {rec.source}: {rec.status} — {rec.record_count} records")
            write_status_reports()
            sys.exit(0)
        except (FileNotFoundError, OSError) as exc:
            print(f"✗ {args.source}: {exc}")
            write_status_reports()
            sys.exit(1)

    if args.command == "source-list":
        print(json.dumps(list_sources(), indent=2))
        sys.exit(0)

    if args.command == "source-validate":
        result = validate_sources()
        print(json.dumps(result, indent=2))
        sys.exit(0 if result["valid"] else 0)

    if args.command == "source-audit":
        write_status_reports()
        audit = audit_sources()
        print(f"Imported: {audit['importedCount']} · Blocked: {audit['blockedCount']}")
        sys.exit(0)


if __name__ == "__main__":
    main()
