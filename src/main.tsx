import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

type Aircraft = {
  icao24: string;
  callsign: string;
  country: string;
  lastContact: number;
  longitude: number;
  latitude: number;
  altitude: number | null;
  onGround: boolean;
  speed: number | null;
  heading: number | null;
  verticalRate: number | null;
  squawk: string | null;
};

type OpenSkyResponse = { time: number; states: (Array<string | number | boolean | null>)[] | null };
type Bounds = { lamin: number; lomin: number; lamax: number; lomax: number };

const API_URL = 'https://opensky-network.org/api/states/all';
const REFRESH_MS = 30_000;

function fromOpenSky(row: OpenSkyResponse['states'][number]): Aircraft | null {
  const longitude = row[5];
  const latitude = row[6];
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return null;
  return {
    icao24: String(row[0] ?? '').toUpperCase(),
    callsign: String(row[1] ?? '').trim() || 'Unknown callsign',
    country: String(row[2] ?? 'Unknown'),
    lastContact: Number(row[4] ?? 0),
    longitude,
    latitude,
    altitude: typeof row[7] === 'number' ? row[7] : (typeof row[13] === 'number' ? row[13] as number : null),
    onGround: Boolean(row[8]),
    speed: typeof row[9] === 'number' ? row[9] : null,
    heading: typeof row[10] === 'number' ? row[10] : null,
    verticalRate: typeof row[11] === 'number' ? row[11] : null,
    squawk: row[14] == null ? null : String(row[14]),
  };
}

function MapBoundsListener({ onBounds }: { onBounds: (bounds: Bounds) => void }) {
  const map = useMap();
  const report = useCallback((bounds: LatLngBounds) => {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    onBounds({ lamin: Math.max(-85, sw.lat), lomin: sw.lng, lamax: Math.min(85, ne.lat), lomax: ne.lng });
  }, [onBounds]);
  useMapEvents({ moveend: (event) => report(event.target.getBounds()), zoomend: () => report(map.getBounds()) });
  useEffect(() => { report(map.getBounds()); }, [map, report]);
  return null;
}

function RecenterButton() {
  const map = useMap();
  return <button className="map-control" title="Return to world view" onClick={() => map.setView([25, 0], 3)}>◎</button>;
}

function EmergencyLabel({ code }: { code: string | null }) {
  if (!code || !['7500', '7600', '7700'].includes(code)) return null;
  const labels: Record<string, string> = { '7500': 'UNLAWFUL INTERFERENCE (7500)', '7600': 'RADIO FAILURE (7600)', '7700': 'GENERAL EMERGENCY (7700)' };
  return <span className="emergency-badge">⚠ {labels[code]}</span>;
}

function App() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'live' | 'future'>('live');
  const [now, setNow] = useState(Date.now());
  const lastRequest = useRef(0);
  const inFlight = useRef(false);

  const selected = aircraft.find((plane) => plane.icao24 === selectedId) ?? aircraft[0] ?? null;
  const emergencyCount = aircraft.filter((plane) => ['7500', '7600', '7700'].includes(plane.squawk ?? '')).length;
  const filtered = aircraft.filter((plane) => {
    const matchesQuery = `${plane.icao24} ${plane.callsign} ${plane.country} ${plane.squawk ?? ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (!emergencyOnly || ['7500', '7600', '7700'].includes(plane.squawk ?? ''));
  });

  const loadFlights = useCallback(async (area: Bounds) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(aircraft.length === 0);
    const params = new URLSearchParams(Object.entries(area).map(([key, value]) => [key, String(value)]));
    try {
      const response = await fetch(`${API_URL}?${params.toString()}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(response.status === 429 ? 'The live data provider rate-limited this request. Wait a little before refreshing.' : `Live flight data is unavailable (HTTP ${response.status}).`);
      const data = await response.json() as OpenSkyResponse;
      setAircraft((data.states ?? []).map(fromOpenSky).filter((plane): plane is Aircraft => plane !== null));
      setUpdatedAt(Date.now());
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load live flight data. Check your connection and try again.');
    } finally {
      setLoading(false);
      inFlight.current = false;
      lastRequest.current = Date.now();
    }
  }, [aircraft.length]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!bounds) return;
    const refresh = () => {
      const wait = Math.max(0, REFRESH_MS - (Date.now() - lastRequest.current));
      window.setTimeout(() => { if (!document.hidden) void loadFlights(bounds); }, wait);
    };
    void loadFlights(bounds);
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [bounds, loadFlights]);

  const onBounds = useCallback((next: Bounds) => setBounds(next), []);

  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">✈</div><div><strong>AEROTRACK</strong><small>LIVE AIR TRAFFIC</small></div></div>
      <label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search callsign, ICAO24, country" /></label>
      <div className="header-right"><span className="live-indicator"><i /> LIVE DATA</span><span className="utc">UTC {new Date(now).toISOString().slice(11, 19)}</span></div>
    </header>

    <aside className="sidebar">
      <div className="tabs"><button className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}>LIVE AIRCRAFT</button><button className={tab === 'future' ? 'active' : ''} onClick={() => setTab('future')}>FUTURE</button></div>
      {tab === 'live' ? <>
        <div className="data-source"><span className="source-dot" /> OpenSky Network <span className="source-tag">LIVE</span></div>
        <div className="filters"><button className={emergencyOnly ? 'filter active-filter' : 'filter'} onClick={() => setEmergencyOnly(!emergencyOnly)}>⚠ Emergencies {emergencyCount}</button><span className="aircraft-count">{filtered.length.toLocaleString()} aircraft</span></div>
        {loading && aircraft.length === 0 && <div className="empty-state">Connecting to live ADS-B data…</div>}
        {error && <div className="error-box"><strong>Live feed unavailable</strong><span>{error}</span><button onClick={() => bounds && void loadFlights(bounds)}>Retry</button></div>}
        {!loading && !error && filtered.length === 0 && <div className="empty-state">{emergencyOnly ? 'No emergency squawks in this map area.' : 'No aircraft reported in this map area. Zoom out or pan the map.'}</div>}
        <div className="flight-list">{filtered.slice(0, 300).map((plane) => <button key={plane.icao24} className={`flight-row ${selected?.icao24 === plane.icao24 ? 'selected' : ''}`} onClick={() => setSelectedId(plane.icao24)}>
          <span className={`plane-symbol ${['7500', '7600', '7700'].includes(plane.squawk ?? '') ? 'plane-emergency' : ''}`}>✈</span><span className="row-main"><strong>{plane.callsign}</strong><small>{plane.icao24} · {plane.country}</small></span><span className="row-meta">{plane.onGround ? 'GROUND' : plane.altitude == null ? '—' : `${Math.round(plane.altitude * 3.28084).toLocaleString()} ft`}<small>{plane.squawk ? `SQ ${plane.squawk}` : ''}</small></span>
        </button>)}</div>
      </> : <div className="future-panel"><span className="future-icon">◷</span><strong>Future flight schedules</strong><p>Live ADS-B shows aircraft that are transmitting now. Scheduled future flights need a separate licensed timetable provider, which is not configured.</p><span className="honest-label">No scheduled flights are being simulated.</span></div>}
    </aside>

    <main className="map-wrap">
      <MapContainer center={[25, 0]} zoom={3} minZoom={2} maxZoom={12} worldCopyJump className="leaflet-map" zoomControl={false} preferCanvas>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapBoundsListener onBounds={onBounds} />
        {aircraft.map((plane) => {
          const isEmergency = ['7500', '7600', '7700'].includes(plane.squawk ?? '');
          const isSelected = selected?.icao24 === plane.icao24;
          return <CircleMarker key={plane.icao24} center={[plane.latitude, plane.longitude]} radius={isSelected ? 7 : 4} pathOptions={{ color: isEmergency ? '#ff555d' : isSelected ? '#ffffff' : '#32b5ff', fillColor: isEmergency ? '#ff555d' : '#32b5ff', fillOpacity: 0.9, weight: isSelected ? 2 : 1 }} eventHandlers={{ click: () => setSelectedId(plane.icao24) }} />;
        })}
        <div className="leaflet-top leaflet-right map-extra-control"><div className="leaflet-control"><RecenterButton /></div></div>
      </MapContainer>
      <div className="map-status"><span className="map-layer-title">WORLD AIR TRAFFIC</span><span>{updatedAt ? `Updated ${Math.max(0, Math.floor((now - updatedAt) / 1000))}s ago` : 'Waiting for data'}</span></div>
      <div className="legend"><span><i className="blue" /> Live aircraft</span><span><i className="red" /> Emergency squawk</span></div>
      <div className="map-attribution-note">Map © OpenStreetMap contributors</div>
    </main>

    <section className="details">
      {selected ? <>
        <div className="details-head"><div><span className="status-dot" /><strong>{selected.callsign}</strong><small>{selected.icao24}</small></div><span className="live-pill">LIVE</span></div>
        <EmergencyLabel code={selected.squawk} />
        <div className="detail-grid"><div><small>BAROMETRIC ALTITUDE</small><strong>{selected.altitude == null ? '—' : Math.round(selected.altitude * 3.28084).toLocaleString()}<em> ft</em></strong></div><div><small>GROUND SPEED</small><strong>{selected.speed == null ? '—' : Math.round(selected.speed * 1.94384)}<em> kts</em></strong></div><div><small>HEADING</small><strong>{selected.heading == null ? '—' : `${Math.round(selected.heading)}°`}</strong></div><div><small>VERTICAL RATE</small><strong>{selected.verticalRate == null ? '—' : `${Math.round(selected.verticalRate * 196.85)} fpm`}</strong></div></div>
        <div className="route-card"><small>FLIGHT ROUTE</small><div className="route-placeholder"><span>{selected.country}</span><i /><span>Destination unavailable</span></div><p>OpenSky position data does not include departure or arrival airports. Route details are not estimated.</p></div>
        <div className="info-block"><div><small>POSITION SOURCE</small><b>ADS-B / Mode S · OpenSky Network</b></div><div><small>LAST CONTACT</small><b>{selected.lastContact ? `${Math.max(0, now / 1000 - selected.lastContact).toFixed(0)} seconds ago` : 'Unavailable'}</b></div><div><small>TRANSPONDER SQUAWK</small><b>{selected.squawk ?? 'Not reported'}</b></div><div><small>ON GROUND</small><b>{selected.onGround ? 'Yes' : 'No'}</b></div></div>
        <div className="disclaimer">Informational data only. Coverage and freshness vary; this is not for navigation, dispatch, or emergency response.</div>
        <div className="atc-card"><span>◉</span><div><b>ATC audio not connected</b><small>Only an authorized, redistributable feed can be added.</small></div></div>
      </> : <div className="empty-details"><span>✈</span><strong>Select an aircraft</strong><p>Click a live aircraft marker or a flight in the list to inspect its ADS-B data.</p></div>}
    </section>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
