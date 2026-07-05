-- Biome mapping by taxon group (sample heuristic for audit scaffold)
CREATE OR REPLACE VIEW biome_coverage AS
SELECT
  taxon_group AS biome_proxy,
  COUNT(*) AS taxon_count
FROM taxa
GROUP BY taxon_group;
