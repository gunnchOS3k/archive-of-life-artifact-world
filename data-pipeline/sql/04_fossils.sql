-- Fossil taxa time mapping placeholder
CREATE OR REPLACE VIEW fossil_coverage AS
SELECT
  taxon_id,
  is_extinct,
  representation_tier >= 3 AS time_mapped
FROM taxa
WHERE is_extinct = true;
