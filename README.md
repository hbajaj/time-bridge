# TimeBridge

A lightweight, privacy-conscious global meeting planner. Three focused tabs: World Clocks, Meetings, Public Holidays. Supports a permanent visitor-local clock, 0–8 chosen meeting locations, working-hour preferences, daylight-saving transitions, shared meetings, and holiday-aware recommendations.

## Version 2.6 — Reliability hardening candidate

The main enhancements in this version are strict holiday-source validation, independent fallback for OpenHolidays-supported countries, optional Calendarific provider configuration, source-provenance displays, CI quality gates, a source-size budget, and an explicit release/rollback policy.

## Run checks

Requires Node.js 22+. No JavaScript runtime packages are required for the app.

```bash
npm run check
```

For browser tests, install Python 3.12+, Playwright, and Chromium:

```bash
python -m pip install playwright==1.56.0
python -m playwright install chromium
PYTHONPATH=qa npm run test:browser
```

The default browser tests use synthetic calendars. A separate served-page suite attempts to test real ES modules and Content Security Policy against a local server; restrictive browser environments may block localhost navigation. In CI such a block is a **failure**, not a pass.

After an approved preview/staging deploy, check actual HTTPS holiday data with:

```bash
node scripts/smoke.mjs https://<approved-vercel-deployment-url>
```

## Release safety

**No automatic staging or production deployments.** See [release gates](docs/RELEASE.md) and [architecture/known limitations](docs/ARCHITECTURE.md). A green test run does not establish global holiday completeness, WCAG 2.2 AA certification, or field Core Web Vitals. All require additional evidence.

Holiday API key: an optional `CALENDARIFIC_API_KEY` environment variable is read on the server only. Do not add it to this repository or expose it to the browser. Without it, OpenHolidays gives a genuinely independent fallback only in the documented supported countries.

## v3.0 features

- Verified holiday provenance with independent fallbacks only where supported.
- Saved meeting teams stored only in this browser, with working hours.
- Transparent working-hours fit explanations and three ranking preferences.
- Keyboard-friendly three-tab UI; explicit manual accessibility gates and operations runbook.
- See `docs/V3-RELEASE.md`, `docs/ACCESSIBILITY.md`, and `docs/OBSERVABILITY.md`.
