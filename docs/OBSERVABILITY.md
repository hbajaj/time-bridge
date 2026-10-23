# TimeBridge v3.0 Operational Monitoring & Privacy

## Initial SLOs (goals, not achieved metrics)
- Core web app availability: >=99.9%/month measured with an external synthetic monitor.
- Holiday calendar provider verification: aim >=99% successful responses for **supported** country/year requests, after measuring an observation period. Unsupported provider coverage is not an outage.
- Verified scheduling: 0 knowingly unverified holiday-free recommendations.
- User experience: LCP <=2.5s, INP <=200ms, CLS <=0.1 at p75 after a real-user dataset is available.

## Signals
- Synthetic GET /, /api/holidays?country=IN&year=2026 and an independently covered country/year. Record HTTP status, source and coverage headers, p50/p95 latency, and data freshness.
- Provider upstream failures must not log API keys or precise user data.
- Server failures: use Vercel dashboard/error budget; set alerts at sustained 5xx spikes and verification failures.
- Browser RUM requires a separate consent/privacy review before instrumentation. Do not collect meeting participants, countries, local clock selection or shared links as analytics identifiers by default.

## Incidents
1. Confirm failure scope, provider source, year and region.
2. Preserve fail-closed scheduling behavior.
3. Roll back to previous tested Vercel deployment if bad code caused regression; keep official calendars/current country limitations visible.
4. Document root cause and test evidence before re-release.
