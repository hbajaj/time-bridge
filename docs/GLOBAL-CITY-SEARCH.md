# Worldwide city lookup for TimeBridge

TimeBridge's **Add Clock** picker searches beyond the built-in 908-city offline starter list.

## How it works
- The first suggestions come from the bundled curated cities and IANA time zones, including Cedar Rapids, Iowa.
- For queries of two or more characters the browser asks TimeBridge's same-origin `/api/cities?name=...` endpoint, debounced by 260ms.
- The endpoint searches Open-Meteo's GeoNames-based worldwide geocoding service and returns validated **city, first-level administrative region (state/province/governorate), country, and IANA time zone**.
- Location names can be qualified with a comma and a full state/province/country name, e.g. `Bandung, West Java`, `Cedar Rapids, Iowa`, `London, United Kingdom`. The upstream provider handles the qualifier.
- The existing meeting-location limit and one-location-per-time-zone rule remain unchanged. City selection uses the provider's ISO country code, not an inference from time zone.
- When the global provider is down, curated suggestions continue to work. The UI identifies the degraded state. Meeting/holiday verification is unchanged.

## Coverage and limits
This is a **worldwide on-demand location search**, not a complete static city roster. GeoNames supplies locations in countries/territories worldwide; the provider may omit small places and updates data on its own schedule. The upstream geocoding API returns a maximum of 100 results per query; TimeBridge currently requests 40. Users narrow ambiguous names with a full state, province, or country name. Typing only a state does not list every city in that state, so do not advertise an exhaustive administrative browsing feature.

## Source and privacy
- Provider documentation: https://open-meteo.com/en/docs/geocoding-api
- GeoNames attribution: https://www.geonames.org/ and https://creativecommons.org/licenses/by/4.0/
- A typed city-query string is sent from the app to the TimeBridge API, then to Open-Meteo; the application does not send device geolocation or user accounts.
- Open-Meteo's public access is intended for non-commercial use; review the service's commercial conditions before commercial deployment.
- Browser CSP stays `connect-src 'self'`; outgoing provider calls run server-side with a fixed destination. Server input is validated and upstream records are sanitized.

## QA
- Unit tests validate non-US searches, state and country preservation, IANA zones, input validation, and graceful upstream failures.
- Mocked browser tests verify a city outside the bundled countries can be added, and linked meeting participants retain their country and region.
- Asynchronous remote results must never displace a newer query's results.
