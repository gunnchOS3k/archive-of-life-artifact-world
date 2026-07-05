-- Conservation overlay gaps (threatened taxa should be filterable)
CREATE OR REPLACE VIEW conservation_coverage AS
SELECT
  taxon_id,
  is_threatened,
  representation_tier
FROM taxa;
