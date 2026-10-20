# Time Bridge

A world clock and meeting planner. Compare the time across zones, scrub forward or back up to 24 hours, and see at a glance which hours fall inside everyone's working day.

## Features

- Live clocks for any city or IANA time zone, with UTC offset and difference from your base zone
- 24-hour day/night strip per zone, aligned to the base zone's day; click any hour to jump to it
- Time shift slider (±24h, 15-minute steps) for planning meetings
- 12h / 24h toggle
- Copyable summary of the selected time in every zone, ready to paste into an invite
- Zone list and format preference saved in the browser

## Run locally

No build step. Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Status

Early prototype. Next steps: split into modules, add tests for the time-zone math, set up CI and hosting.
