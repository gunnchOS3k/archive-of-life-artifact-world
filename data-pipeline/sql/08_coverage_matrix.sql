-- Global coverage matrix view
CREATE OR REPLACE VIEW coverage_matrix AS
SELECT
  t.taxon_id,
  t.scientific_name,
  t.scientific_name AS accepted_name,
  'species' AS rank,
  t.life_status,
  t.representation_tier,
  t.representation_tier >= 1 AS source_coverage,
  t.representation_tier >= 3 AS time_coverage,
  t.representation_tier >= 2 AS place_coverage,
  false AS biome_coverage,
  t.representation_tier >= 4 AS artifact_coverage,
  t.representation_tier >= 1 AS archivedex_coverage,
  false AS lifeling_coverage,
  t.representation_tier >= 5 AS gameplay_coverage,
  'sample' AS data_quality,
  '' AS uncertainty_notes,
  CASE
    WHEN t.scientific_name IS NULL OR t.scientific_name = '' THEN ['missing_name']
    WHEN t.representation_tier < 1 THEN ['missing_tier']
    ELSE []
  END AS gap_flags
FROM taxa t;
