-- ArchiveDex minimum field coverage by tier
CREATE OR REPLACE VIEW archivedex_coverage AS
SELECT
  taxon_id,
  representation_tier,
  representation_tier >= 6 AS hero_tier,
  scientific_name IS NOT NULL AS has_name
FROM taxa;
