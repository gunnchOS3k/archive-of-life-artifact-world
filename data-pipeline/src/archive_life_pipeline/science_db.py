"""Durable DuckDB science snapshot export for Cont VI."""

from __future__ import annotations

import hashlib
import json

import duckdb

from archive_life_pipeline.paths import PUBLIC_DATA, REPO_ROOT


def build_durable_science_duckdb() -> dict:
    """Write public/data/science/archive_science.duckdb with indexed tables from bundles."""
    science_dir = PUBLIC_DATA / "science"
    science_dir.mkdir(parents=True, exist_ok=True)
    db_path = science_dir / "archive_science.duckdb"
    if db_path.exists():
        db_path.unlink()

    con = duckdb.connect(str(db_path))
    con.execute(
        """
        CREATE TABLE taxa (
          taxon_id VARCHAR PRIMARY KEY,
          scientific_name VARCHAR,
          accepted_name VARCHAR,
          common_name VARCHAR,
          program_tier VARCHAR,
          region_id VARCHAR,
          biome VARCHAR,
          era_id VARCHAR,
          is_playable BOOLEAN,
          source_primary VARCHAR
        );
        CREATE TABLE synonyms (
          taxon_id VARCHAR,
          synonym_name VARCHAR,
          accepted_name VARCHAR
        );
        CREATE TABLE provenance (
          taxon_id VARCHAR,
          source VARCHAR,
          license VARCHAR,
          citation VARCHAR,
          is_live BOOLEAN
        );
        CREATE TABLE geo_occurrence (
          taxon_id VARCHAR,
          region_id VARCHAR,
          lat DOUBLE,
          lon DOUBLE
        );
        CREATE TABLE time_ranges (
          taxon_id VARCHAR,
          era_id VARCHAR,
          era_label VARCHAR
        );
        """
    )

    regions_raw = json.loads((PUBLIC_DATA / "bundles" / "regions.json").read_text())
    regions = {r["id"]: r.get("biome") for r in regions_raw}
    enc = json.loads((PUBLIC_DATA / "bundles" / "encounter-taxa.json").read_text()).get(
        "species", []
    )
    heroes = json.loads((PUBLIC_DATA / "bundles" / "hero-species.json").read_text()).get(
        "species", []
    )

    for s in enc:
        region = s.get("region")
        con.execute(
            "INSERT INTO taxa VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                s["id"],
                s.get("scientificName"),
                s.get("scientificName"),
                s.get("commonName"),
                s.get("programTier", "E_Encounter"),
                region,
                regions.get(region) if region else None,
                "deep_time" if s.get("isExtinct") else "holocene",
                s.get("isPlayable", True) is not False,
                "encounter-bundle",
            ],
        )
        con.execute(
            "INSERT INTO time_ranges VALUES (?, ?, ?)",
            [s["id"], "deep_time" if s.get("isExtinct") else "holocene", "bundle"],
        )
        if region:
            con.execute(
                "INSERT INTO geo_occurrence VALUES (?, ?, NULL, NULL)",
                [s["id"], region],
            )

    for s in heroes:
        region = s.get("region")
        extinct = bool(s.get("isExtinct") or s.get("conservationStatus") == "Extinct")
        # Skip if encounter already inserted same id
        exists = con.execute(
            "SELECT 1 FROM taxa WHERE taxon_id = ?", [s["id"]]
        ).fetchone()
        if exists:
            continue
        con.execute(
            "INSERT INTO taxa VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                s["id"],
                s.get("scientificName"),
                s.get("scientificName"),
                s.get("commonName"),
                "F_Flagship",
                region,
                regions.get(region) if region else None,
                "deep_time" if extinct else "holocene",
                True,
                "hero-bundle",
            ],
        )

    con.execute("CREATE INDEX idx_taxa_name ON taxa(scientific_name)")
    con.execute("CREATE INDEX idx_taxa_region ON taxa(region_id)")
    con.execute("CREATE INDEX idx_taxa_biome ON taxa(biome)")
    con.execute("CREATE INDEX idx_taxa_tier ON taxa(program_tier)")
    con.execute("CREATE INDEX idx_time_era ON time_ranges(era_id)")

    count = con.execute("SELECT COUNT(*) FROM taxa").fetchone()[0]
    con.close()

    digest = hashlib.sha256(db_path.read_bytes()).hexdigest()
    meta = {
        "engine": "duckdb",
        "path": "public/data/science/archive_science.duckdb",
        "taxa": count,
        "sha256": digest,
        "globalCompleteClaim": False,
        "repoRoot": str(REPO_ROOT),
    }
    (science_dir / "duckdb_snapshot_meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    return meta
