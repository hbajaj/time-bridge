# TimeBridge v3.0 Accessibility Acceptance

Goal: WCAG 2.2 AA. **Not certified.** Automated scripts are checks, not a full WCAG audit.

- Keyboard-only: navigate all three tabs using Left, Right, Home, End; reach Add Clock, participant controls, compact working-hours editor, saved teams, recommendation actions, and holiday calendars.
- Screen readers: independently test on iOS VoiceOver and Windows NVDA for correct role/name/state/status announcements. Non-visible tab panels must not be in tab order.
- Mobile/zoom: 320px viewport and 400% zoom must preserve content with one main scroll and no horizontal overflow.
- Color and theme: test text/background contrast in light and dark, active/focus/disabled indicators, and high-contrast modes.
- Reduced motion: test with prefers-reduced-motion and verify no forced animation or scroll.
- Error recovery: failed holiday verification must be announced and never turn into unverified recommendations.
- Input semantics: label each city/country/time field, meaningful buttons, and sufficient touch target size.

Manual owner verification is still mandatory before public production promotion. File issues for every violation and rerun tests after remediation.
