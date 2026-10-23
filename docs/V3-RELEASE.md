# TimeBridge v3.0 staging release candidate

v3.0 combines reliability hardening (v2.6), minimalist three-tab user experience and accessibility foundations (v2.7), and saved teams/transparent meeting preferences (v2.8).

## Release gate list
1. GitHub source commit must match local SHA-256 release manifest and approved candidate ZIP.
2. GitHub Actions CI static/unit and Chromium jobs must pass, or release is marked blocked/unverified.
3. Deploy a preview build, verify commit identity and URL; run live website/API smoke tests with appropriate authorizations.
4. Deploy versioned staging branch only after candidate integrity checks and approval. Align project domain mapping to the versioned staging branch to avoid unexpected changes.
5. Run manual iOS Safari and Windows browser accessibility tests; obtain product-owner regression approval.
6. Do **not** promote to production without a subsequent explicit request and passing release gates.

## Feature scope
- Permanent visitor local clock; unified participant list shared by World Clocks and Meetings; independent country verification.
- Flexible 1–8 meeting locations and working hours.
- Best balance, earliest available, or strict in-hours meeting modes, with a transparent heuristic working-hours fit score. Score is not a probability or external user-tested fairness guarantee.
- Saved named team configurations (up to 10) stored locally. No login, tracking, sync or cloud account. Shared links do not automatically save the recipient's team.
- Public holiday sources: independent OpenHolidays fallback where supported; optional server-only Calendarific; government snapshots for specified years; explicit error when verification fails. Regional/public-sector holidays may remain incomplete.

## Known limitations
- Real worldwide independent calendar fallback is unavailable in some countries without a configured provider key.
- Some observed/lunar holidays are declared late and are not always predictable.
- This release has not passed independent WCAG, security penetration test, real Core Web Vitals, or 30-day SLO observation.
