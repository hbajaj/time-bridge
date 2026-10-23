# TimeBridge Release & Rollback Policy — v2.6

## Branches and manual gates

1. Open a feature branch (`feature/reliability-v2.6`) from **the exact v2.5.2 source commit**.
2. All GitHub Actions `TimeBridge quality gates` jobs must pass. Archive test logs and source integrity SHA.
3. Deploy a separate Vercel **preview**. Do not repoint existing staging/production aliases.
4. Execute the post-deploy smoke command and record live holiday API results for `US`, `NG`, `IN`, `GB`, `SA` and an OpenHolidays-supported country (`ZA` or `DE`). Run with no Calendarific key and, if available, with a key. Confirm the `X-Holiday-Source` and `X-Holiday-Coverage` response headers.
5. Manual accessibility assessment: keyboard-only, NVDA, VoiceOver on iOS, 200/400% zoom, reduced motion. Complete product-owner user regression.
6. On approval, create a **versioned staging branch** from the same reviewed SHA; correct Vercel staging domain's branch mapping, then deploy. Confirm staging commit/alias and run live smoke tests.
7. Only after staging owner sign-off, promote that **exact deployment** to production (no rebuild). Confirm production alias SHA and smoke health.

## Halt conditions

- Any incorrect time conversion, DST failure, or calendar marked verified without actual evidence.
- `HOLIDAY_UNVERIFIED` returned from a required country. The planner must withhold recommendations; it must not silently omit that country.
- Broken keyboard journey, critical accessibility error, or unsupported public calendars inaccurately described as complete.
- Source SHA differs from tested SHA, or staging domain points at unexpected branch.
- Failed live HTTPS/API smoke check.

## Rollback

Keep the previous production deployment ID and SHA before promotion. If critical correctness, error budget, or availability incidents occur, use Vercel rollback/alias tools to restore the previous ready production deployment. Verify the alias points at the expected release ID; never claim success before verification.

## Environment and provider configuration

`CALENDARIFIC_API_KEY` is an **optional server-only secret**. Never put it in the browser, Vercel public environment, GitHub commits, release attachments, or logs. Without it, independent OpenHolidays fallback is available only for supported countries. Nager v3 is a compatibility fallback, not a distinct data provider.

## Availability and quality targets (not yet verified)

- 99.9% monthly *core application* availability.
- 99% scheduled holiday lookups verified within 6 seconds for supported countries in an initial observation period, later tightened after real measurements.
- Zero known critical time-zone/DST conversion defects.
- No known critical/high OWASP security defects.
- WCAG 2.2 AA conformance only after independent manual and automated audits.
- CWV LCP <=2.5s, INP <=200ms, CLS <=0.1 at field p75, after RUM collection.
