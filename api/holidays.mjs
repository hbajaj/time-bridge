/* Same-origin server-side holiday gateway: avoids cross-origin browser requests.
 * No API keys, cookies, location permissions, or user identifiers.
 * Errors fail closed: the meeting planner will not display unverified slots.
 */
import { INDIA_CENTRAL_GAZETTED_2026 } from '../lib/india-2026.mjs';
import { SA_2026_OFFICIAL_CLOSURES } from '../lib/saudi-2026.mjs';
import { SA_2027_OFFICIAL_CLOSURES } from '../lib/saudi-2027.mjs';
const ORIGINS = [
  (country, year) => `https://nagerholidays.com/api/v4/Holidays/${country}/${year}`,
  (country, year) => `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`
];

function isPublicRecord(item, country, year) {
  const types = item?.holidayTypes ?? item?.types;
  return typeof item?.date === 'string'
    && item.date.startsWith(`${year}-`)
    && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    && typeof item?.name === 'string'
    && (!item.countryCode || item.countryCode.toUpperCase() === country)
    && Array.isArray(types)
    && types.some(x => String(x).toLowerCase() === 'public');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error: 'Method not allowed'});
  }
  const country = String(req.query?.country ?? '').toUpperCase();
  const year = Number(req.query?.year);
  if (!/^[A-Z]{2}$/.test(country) || !Number.isInteger(year) || year < 2020 || year > 2100) {
    return res.status(400).json({error: 'Invalid country or year'});
  }
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=3600');
  // DoPT / central-government gazetted dates. State/regional coverage is not complete.
  if (country === 'IN' && year === 2026) {
    res.setHeader('X-Holiday-Coverage', 'India central government gazetted holidays 2026');
    return res.status(200).json(INDIA_CENTRAL_GAZETTED_2026);
  }
  // Official year-specific fallback prevents unsupported-country outages.
  // Saudi aviation closures are a conservative superset for many employers.
  if (country === 'SA' && year === 2026) {
    res.setHeader('X-Holiday-Coverage', 'Saudi official 2026 aviation-sector closures; conservative');
    return res.status(200).json(SA_2026_OFFICIAL_CLOSURES);
  }
  if (country === 'SA' && year === 2027) {
    res.setHeader('X-Holiday-Coverage', 'Saudi official 2027 financial-sector closures; conservative');
    return res.status(200).json(SA_2027_OFFICIAL_CLOSURES);
  }
  for (const buildUrl of ORIGINS) {
    try {
      const response = await fetch(buildUrl(country, year), {
        headers: {Accept: 'application/json'},
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) continue;
      const payload = await response.json();
      if (!Array.isArray(payload) || !payload.some(item => isPublicRecord(item, country, year))) continue;
      return res.status(200).json(payload);
    } catch {
      // Try the secondary upstream; if both fail, block recommendations.
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(502).json({error: `Holiday calendars could not be verified for ${country} ${year}`});
}
