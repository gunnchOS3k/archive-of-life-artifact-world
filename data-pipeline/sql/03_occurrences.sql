-- Occurrence / place mapping tier check
CREATE OR REPLACE VIEW occurrence_coverage AS
SELECT
  taxon_id,
  representation_tier >= 2 AS place_mapped
FROM taxa;
