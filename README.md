# AeroTrack

A dark aviation dashboard prototype using an actual OpenStreetMap basemap and live aircraft state data from the OpenSky Network's public API.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). Build with `npm run build`.

## Data and limitations

- Aircraft markers and position details are fetched from OpenSky's `/api/states/all` API for the visible map bounds and refreshed at a conservative 30-second interval. Public API access, browser CORS, availability, coverage, and rate limits may vary. If the provider blocks a request, the dashboard reports the error rather than showing fabricated aircraft.
- The map tiles are from OpenStreetMap and attribution is shown on the map.
- OpenSky state vectors do not reliably provide origin/destination, schedules, or ATC audio. These are explicitly shown as unavailable, not guessed. The Future tab explains that schedules require a separate licensed provider.
- Squawks 7500, 7600, and 7700 are flagged from the reported transponder code. This is informational only, not a verified emergency alert service.
- No ATC stream is embedded; only a feed explicitly authorized for redistribution should be added.
- This app is not for navigation, dispatch, or emergency response. Review OpenSky and OpenStreetMap terms before deployment or commercial use.
