-- Time range tier validation
CREATE OR REPLACE VIEW time_coverage AS
SELECT
  taxon_id,
  representation_tier >= 3 AS time_mapped,
  life_status
FROM taxa;
