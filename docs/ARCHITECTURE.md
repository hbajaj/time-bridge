# TimeBridge v2.6 — architecture

- UI: static HTML and ES modules, CSP blocks remote script and remote client data calls.
- Scheduling: deterministic browser Intl and IANA time-zone rules; users' meeting participants and working hours saved in localStorage. The three tabs remain separate views of a shared participant set.
- Holiday gateway `/api/holidays?country=CC&year=YYYY`: same-origin server function, strict input validation, sanitized holiday record normalizers, bounded provider timeouts, 6-hour in-process and edge caches, no account data or geolocation sent upstream.
- Source 1: Nager.Holidays v4. Distinct source for some countries: OpenHolidays API. Optional commercial Calendarific key enables independent fallback for others; key stays server-side. Nager v3 is last-resort compatibility only. Published year-specific India/Saudi government snapshots are conservative and labeled as limited coverage.
- Holiday API preserves existing JSON array contract. Response headers `X-Holiday-Source`, `X-Holiday-Coverage`, `X-Holiday-Verified-At` provide provenance. Browser caches verified arrays and metadata for 12 hours. Unknown / stale / bad calendars fail closed; no meeting recommendation.
- CI: GitHub Actions verifies JS syntax, no dangerous inline script/eval, no hardcoded holiday key, JS/CSS budgets, Node scheduling + API/provider tests, and isolated Chromium functional tests. No automatic deploy.
- Operations: optional `node scripts/smoke.mjs <https-url>` probes deployed homepage and holiday gateway and enforces record validity. Human regression and manual staging/production approval required.

## Known limitations

- Regional holidays apply to different subdivisions. The country-level conservative calendar intentionally blocks any regional holiday returned, rather than assume participants share the same subdivision.
- Religious-calendar and last-minute declarations may change. Snapshot data is not a substitute for full local employer calendars.
- No promise of world-wide independent fallback without a configured independent provider; see `docs/RELEASE.md`.
- No performance field telemetry has been instrumented; budget checks are source-size tests, not verified Core Web Vitals.
