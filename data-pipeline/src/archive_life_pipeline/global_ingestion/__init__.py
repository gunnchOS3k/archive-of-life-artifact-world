"""Global Knowledge Ingestion Program — catalogue-scale engineering substrate.

Engineering completion does not equal scientific completeness.
GLOBAL_DATA_COMPLETE and ALL_SPECIES_INGESTED remain false without approved
source snapshots.
"""

from __future__ import annotations

PROGRAM_ID = "ARCHIVE_GLOBAL_KNOWLEDGE_INGESTION_PROGRAM"
TRANSFORM_VERSION = "gkip-1.0.0"
SCHEMA_VERSION = "gkip-canonical-1.0.0"

SCIENTIFIC_TRUTH_DEFAULTS = {
    "GLOBAL_DATA_COMPLETE": False,
    "ALL_SPECIES_INGESTED": False,
    "GLOBAL_KNOWN_TAXON_INDEX_COMPLETE_FOR_SNAPSHOT": False,
    "ALL_CATALOGUED_TAXA_INGESTED_FOR_SNAPSHOT": False,
    "ALL_FOSSIL_TAXA_INGESTED_FOR_SNAPSHOT": False,
    "GLOBAL_OCCURRENCE_COVERAGE_COMPLETE": False,
    "GLOBAL_DEEP_TIME_COVERAGE_COMPLETE": False,
    "GLOBAL_MEDIA_RIGHTS_COMPLETE": False,
    "HUMAN_SCIENTIFIC_REVIEW_COMPLETE": False,
}

INITIAL_SOURCES = ("col", "gbif", "pbdb", "neotoma", "ics", "iucn")
