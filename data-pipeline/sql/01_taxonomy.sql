-- Taxonomy coverage validation
CREATE OR REPLACE VIEW taxonomy_gaps AS
SELECT
  taxon_id,
  scientific_name,
  CASE WHEN scientific_name IS NULL OR scientific_name = '' THEN 'missing_scientific_name' END AS gap
FROM taxa
WHERE scientific_name IS NULL OR scientific_name = '';
