-- Machine-readable gap report
CREATE OR REPLACE TABLE gap_report AS
SELECT
  'gap_' || taxon_id || '_name' AS gap_id,
  'high' AS severity,
  'taxonomy' AS category,
  taxon_id AS affected_taxon_id,
  NULL AS affected_biome_id,
  NULL AS affected_time_unit_id,
  NULL AS affected_place_id,
  ['scientific_name'] AS missing_fields,
  'Add accepted scientific name from source snapshot' AS recommended_fix,
  false AS blocking_for_release
FROM taxonomy_gaps
WHERE gap IS NOT NULL;
