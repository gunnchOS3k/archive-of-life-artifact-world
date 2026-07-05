-- Source snapshot registry (loaded from JSON in application layer)
CREATE OR REPLACE VIEW source_snapshots AS
SELECT * FROM (VALUES
  ('col-sample', 'catalogue_of_life', 'taxonomy', 'mock-sample-2026-07', false, true),
  ('gbif-sample', 'gbif', 'occurrence', 'mock-sample-2026-07', false, true),
  ('iucn-sample', 'iucn', 'conservation', 'mock-sample-2026-07', false, true),
  ('pbdb-sample', 'paleobiodb', 'fossil', 'mock-sample-2026-07', false, true),
  ('ics-sample', 'ics_chronostratigraphic', 'time', 'ICS-Chart-v2024/12', false, true)
) AS t(id, source_name, source_category, version, approved_for_use, is_mock_data);
