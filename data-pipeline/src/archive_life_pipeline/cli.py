from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from archive_life_pipeline.audit import run_pipeline_audit
from archive_life_pipeline.duckdb_runner import run_sql_pipeline
from archive_life_pipeline.science_db import build_durable_science_duckdb
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
    sub.add_parser("build-science-db", help="Build durable DuckDB science snapshot")
    sub.add_parser("validate-snapshots", help="Validate configured source snapshots")
    sub.add_parser("status", help="Show pipeline and source import status")
    sub.add_parser("export-bundles", help="Export bundle checksum manifest")

    import_parser = sub.add_parser("import", help="Import external source snapshot")
    import_parser.add_argument("source", choices=[*IMPORTERS.keys(), "all"])

    sub.add_parser("source-list", help="List source import status")
    sub.add_parser("source-validate", help="Validate source configuration")
    sub.add_parser("source-audit", help="Audit source imports and write status JSON")

    from archive_life_pipeline.global_ingestion.bulk_import import SUPPORTED_SOURCES

    bulk = sub.add_parser(
        "bulk-import",
        help="Streaming bulk import of approved local source snapshots",
    )
    bulk.add_argument("source", choices=[*SUPPORTED_SOURCES, "all"])
    bulk.add_argument("--input", type=Path, default=None)
    bulk.add_argument("--snapshot-id", default="local-unapproved")
    bulk.add_argument("--source-version", default="unknown")
    bulk.add_argument("--chunk-size", type=int, default=5_000)
    bulk.add_argument("--resume", action="store_true")
    bulk.add_argument(
        "--checkpoint-dir",
        type=Path,
        default=Path("artifacts/global_ingestion/checkpoints"),
    )
    bulk.add_argument(
        "--output-dir",
        type=Path,
        default=Path("artifacts/global_ingestion/normalized"),
    )
    bulk.add_argument("--max-records", type=int, default=None)
    bulk.add_argument("--dry-run", action="store_true")

    gkip = sub.add_parser(
        "run-global-ingestion-program",
        help="Run Global Knowledge Ingestion engineering gates and write artifacts",
    )
    gkip.add_argument(
        "--artifact-dir",
        type=Path,
        default=None,
        help="Defaults to <repo>/artifacts/global_ingestion",
    )
    gkip.add_argument("--skip-scale", action="store_true")
    gkip.add_argument(
        "--scale-tiers",
        default="100000,1000000,5000000",
        help="Comma-separated synthetic scale tiers",
    )

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

    if args.command == "build-science-db":
        meta = build_durable_science_duckdb()
        print(
            f"DuckDB science snapshot: taxa={meta['taxa']} "
            f"sha256={meta['sha256'][:12]}… globalCompleteClaim={meta['globalCompleteClaim']}"
        )
        sys.exit(0)

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

    if args.command == "bulk-import":
        from archive_life_pipeline.global_ingestion.bulk_import import (
            BulkImportOptions,
            bulk_import,
            bulk_import_all,
        )

        opts = BulkImportOptions(
            source=args.source,
            input_path=args.input,
            snapshot_id=args.snapshot_id,
            source_version=args.source_version,
            chunk_size=args.chunk_size,
            resume=args.resume,
            checkpoint_dir=args.checkpoint_dir,
            output_dir=args.output_dir,
            max_records=args.max_records,
            dry_run=args.dry_run,
        )
        if args.source == "all":
            results = bulk_import_all(opts)
            for r in results:
                print(json.dumps(r.to_dict()))
            blocked = sum(1 for r in results if r.status == "BLOCKED_EXTERNAL_DATA")
            print(
                f"\nCompleted={len(results) - blocked} blocked_external={blocked}",
                file=sys.stderr,
            )
            sys.exit(0)
        result = bulk_import(opts)
        print(json.dumps(result.to_dict(), indent=2))
        sys.exit(0 if result.completed or result.status == "BLOCKED_EXTERNAL_DATA" else 1)

    if args.command == "run-global-ingestion-program":
        from archive_life_pipeline.global_ingestion.program_runner import run_program

        tiers = [int(x) for x in str(args.scale_tiers).split(",") if x.strip()]
        artifact_dir = args.artifact_dir
        if artifact_dir is None:
            # cli.py -> archive_life_pipeline -> src -> data-pipeline -> repo
            artifact_dir = Path(__file__).resolve().parents[3] / "artifacts" / "global_ingestion"
        status = run_program(
            artifact_dir=artifact_dir,
            run_scale=not args.skip_scale,
            scale_tiers=tiers,
        )
        print(json.dumps(status, indent=2))
        sys.exit(0)


if __name__ == "__main__":
    main()
