# Worldwide administrative and city directory

The TimeBridge country → region → city browser uses the public dataset by
[srestre/world-countries-cities-db](https://github.com/srestre/world-countries-cities-db),
a derivative of the
[Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database)
and other credited data.

- **Snapshot:** srestre repository commit `ab77d11f438f439e3f7ed2680463cbd1f861ec15` (October 2026).
- **License:** Open Database License 1.0 (ODbL); see [the terms](https://opendatacommons.org/licenses/odbl/1-0/).
- **Attribution:** Data from Countries States Cities Database and upstream contributors, including GeoNames and OpenStreetMap. Changes to the dataset or public derivations must comply with applicable attribution and share-alike conditions.
- **Usage:** 250 countries/territories are in `geo/countries.json`. The complete pinned snapshot is imported by `scripts/import-world-directory.py` into **250 versioned static JSON files** under `geo/regions/<ISO2>.json`. The browser loads **only the selected country's file**, not all 156,025 city records at startup. The snapshot's verified totals are in `geo/catalog-stats.json`.
- **Scope:** The dataset reports 156,025 cities/towns and 5,308 administrative regions in the October 2026 snapshot; it is comprehensive **within this source**, but not every inhabited village or settlement in the world. Some countries/territories have no state/city rows, which the picker explicitly shows.
- **Time zones:** Source city coordinates are resolved at selection time via Open-Meteo's timezone=auto function. No city is assigned a made-up time zone when lookup fails. Provider zone boundaries may be approximate near borders and should be confirmed for critical time changes.
- **Holidays:** Region-specific holiday verification is independent of city coverage. National provider support is not evidence of subnational holiday completeness.
- **Caching:** Static country files are served from TimeBridge's own Vercel deployment and can be cached by the host; the source is pinned by commit for repeatable snapshots. Browsing cities requires no external country-directory API.
- **Privacy:** Selecting a country sends an ISO country code to TimeBridge's API. Selecting a city sends its coordinates to TimeBridge, which asks Open-Meteo for its time zone; no device geolocation is requested.
- **Updates:** The source snapshot is intentionally pinned and must be refreshed through a reviewed code change and QA. Country totals are measured per source snapshot, not assumed to stay constant.

User-facing fallback city-name search uses the Open-Meteo/GeoNames geocoding API, also with its respective attribution.
