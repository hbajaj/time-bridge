/* Browser-only visitor time zone formatting. No geolocation, APIs or user storage. */
export function createVisitorClock(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return null;
  let clock, date, shortZone, dayId;
  try {
    const common = { timeZone };
    clock = new Intl.DateTimeFormat('en-US', { ...common, hour: 'numeric', minute: '2-digit', hour12: true });
    date = new Intl.DateTimeFormat('en-US', { ...common, weekday: 'short', month: 'short', day: 'numeric' });
    shortZone = new Intl.DateTimeFormat('en-GB', { ...common, hour: 'numeric', timeZoneName: 'short' });
    dayId = new Intl.DateTimeFormat('en-CA', { ...common, year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch { return null; }
  const name = timeZone === 'Etc/UTC' || timeZone === 'UTC' ? 'UTC' : timeZone.split('/').at(-1).replace(/_/g, ' ').replace(/^Katmandu$/, 'Kathmandu');
  const asDate = ms => new Date(ms);
  const abbreviation = ms => (shortZone.formatToParts(asDate(ms)).find(part => part.type === 'timeZoneName')?.value || timeZone).replace(/^GMT\+0(?::00)?$/,'GMT');
  const localDateId = ms => {
    const values = Object.fromEntries(dayId.formatToParts(asDate(ms)).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
    return `${values.year}-${values.month}-${values.day}`;
  };
  const at = ms => ({
    time: clock.format(asDate(ms)),
    date: date.format(asDate(ms)),
    abbreviation: abbreviation(ms),
    zoneLabel: `${name} · ${abbreviation(ms)}`
  });
  const rangeText = (startMs, duration) => {
    const endMs = startMs + duration * 60000;
    const start = at(startMs), end = at(endMs);
    const endDate = localDateId(startMs) === localDateId(endMs) ? '' : `${end.date} · `;
    return `${start.date} · ${start.time} ${start.abbreviation} – ${endDate}${end.time} ${end.abbreviation}`;
  };
  return { timeZone, name, at, rangeText };
}
