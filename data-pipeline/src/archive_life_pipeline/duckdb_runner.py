from __future__ import annotations

import json
from pathlib import Path

import duckdb

from archive_life_pipeline.paths import PUBLIC_DATA, SQL_DIR


def load_json_table(
    con: duckdb.DuckDBPyConnection, name: str, path: Path, json_path: str = "$"
) -> None:
    if not path.exists():
        return
    con.execute(
        "CREATE OR REPLACE TABLE "
        f"{name} AS SELECT * FROM read_json(?, format='array', maximum_object_size=10485760)",
        [str(path)],
    )


def run_sql_pipeline() -> dict:
    """Execute numbered SQL files against bundled JSON via DuckDB."""
    con = duckdb.connect(":memory:")
    results: list[dict] = []

    search_index = PUBLIC_DATA / "bundles" / "search-index.json"
    if search_index.exists():
        data = json.loads(search_index.read_text())
        entries = data.get("entries", [])
        con.execute(
            "CREATE OR REPLACE TABLE search_index AS "
            "SELECT * FROM (SELECT unnest(?::JSON[]) AS entry)",
            [entries],
        )
        con.execute("""
            CREATE OR REPLACE TABLE taxa AS
            SELECT
              entry.id AS taxon_id,
              entry.commonName AS common_name,
              entry.scientificName AS scientific_name,
              entry.representationTier AS representation_tier,
              entry.lifeStatus AS life_status,
              entry.group AS taxon_group,
              entry.isExtinct AS is_extinct,
              entry.isThreatened AS is_threatened
            FROM search_index
        """)

    hero = PUBLIC_DATA / "bundles" / "hero-species.json"
    if hero.exists():
        data = json.loads(hero.read_text())
        species = data.get("species", [])
        con.execute(
            "CREATE OR REPLACE TABLE hero_species AS "
            "SELECT * FROM (SELECT unnest(?::JSON[]) AS sp)",
            [species],
        )

    sql_files = sorted(SQL_DIR.glob("*.sql"))
    for sql_file in sql_files:
        sql = sql_file.read_text()
        try:
            con.execute(sql)
            results.append({"file": sql_file.name, "status": "ok"})
        except Exception as exc:  # noqa: BLE001
            results.append({"file": sql_file.name, "status": "error", "error": str(exc)})

    gap_rows = []
    try:
        gap_rows = con.execute("SELECT * FROM gap_report").fetchdf().to_dict(orient="records")
    except duckdb.CatalogException:
        pass

    return {"sql_results": results, "gaps": gap_rows}
