# Provider Federation Status — Archive of Life

**Updated:** 2026-07-13

| Provider | Official endpoint | Authentication | License | Adapter | Fixture | Live test | In-game use | Current blocker |
|----------|-------------------|---------------|---------|---------|---------|-----------|-------------|-----------------|
| GBIF | `api.gbif.org/v1/occurrence/search` | None (public) | Per-record CC | `gbifProvider` | `gbif-occurrences.json` | Live occurrence | Evidence / occurrence | None for read |
| iNaturalist | `api.inaturalist.org/v1/observations` | None for public read | User / CC varies | `inaturalistProvider` | Empty on fail | Live observations | Evidence | Media licensing for reuse |
| Catalogue of Life | ChecklistBank nameusage | None | COL terms | `colProvider` | search-index | Live taxonomy | Evidence | Dataset id drift |
| WoRMS | Aphia REST | None | CC BY 4.0 | `wormsProvider` | — | Live taxonomy | Marine taxonomy | — |
| PBDB | `paleobiodb.org/data1.2` | None | CC BY 4.0 | `pbdbProvider` | fossil-pbdb | Live fossils | Deep-time evidence | Sparse taxa → fixture |
| Neotoma | `api.neotomadb.org` | None | CC | `neotomaProvider` | reconstructed proxy | Health + search | Paleo context | Incomplete coverage |
| NASA | EONET `eonet.gsfc.nasa.gov` + Earthdata cache | None for EONET | NASA open | `nasaProvider` | nasa_metadata_cache | Live EONET | Env context | Full tiles not in-game |
| OBIS | `api.obis.org/v3/occurrence` | None | OBIS policy | `obisProvider` | — | Live marine occ | Marine evidence | — |
| NOAA | TBD | Varies | Gov | Stub/fixture | blocked-providers.json | Fixture-only | Env stub | Endpoint scope not finalized |
| USGS | TBD | Varies | Gov | Stub/fixture | blocked-providers.json | Fixture-only | Geo stub | Endpoint scope not finalized |
| Smithsonian | Open Access | Varies | CC0/varies | Stub/fixture | blocked-providers.json | Fixture-only | — | Media attribution review |
| EOL | `eol.org/api/search` | None | Varies | `eolProvider` | — | Best-effort live | Reference | API stability |
| IUCN | Red List API | Token | Restrictive | Not runtime live | Authored overlays | — | Conservation badges | Token + license |

## Live domain minimum (gate)

| Domain | Live provider verified |
|--------|------------------------|
| Modern biodiversity occurrence | GBIF + iNaturalist |
| Taxonomy | Catalogue of Life + WoRMS |
| Paleontology / deep time | Paleobiology Database (+ Neotoma when reachable) |
| Environmental / geological context | NASA EONET (live) |
| Marine biodiversity | OBIS + WoRMS |

NOAA / USGS / Smithsonian / IUCN do **not** count toward the live minimum until adapters query live lawfully.
