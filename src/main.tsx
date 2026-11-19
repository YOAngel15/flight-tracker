import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const aircraftSeed = [
  { id:'N784UA', call:'UAL784', type:'Boeing 787-9', lat:40.64, lng:-73.78, alt:37000, speed:489, from:'KJFK', to:'EGLL', status:'En route' },
  { id:'DLH441', call:'DLH441', type:'Airbus A350-900', lat:41.8, lng:-66.2, alt:39000, speed:502, from:'EDDF', to:'KATL', status:'En route' },
  { id:'BAW117', call:'BAW117', type:'Boeing 777-300ER', lat:51.47, lng:-0.45, alt:0, speed:0, from:'EGLL', to:'KJFK', status:'Arriving' },
  { id:'AFR006', call:'AFR006', type:'Airbus A380-800', lat:48.85, lng:2.35, alt:12000, speed:255, from:'LFPG', to:'KJFK', status:'Approaching' },
  { id:'SWA204', call:'SWA204', type:'Boeing 737-800', lat:33.64, lng:-84.43, alt:24000, speed:412, from:'KATL', to:'KLAX', status:'En route' }
];

function PlaneIcon({ heading=0, emergency=false }) {
  return <div className="plane-marker" style={{transform:`rotate(${heading}deg)`}}><svg viewBox="0 0 24 24" width="18" height="18"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill={emergency?'#ff5555':'#49aaff'}/></svg></div>
}

function App() {
  const [selected, setSelected] = useState(aircraftSeed[0]);
  const [query, setQuery] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [time, setTime] = useState(new Date());
  const [live, setLive] = useState(true);
  useEffect(()=>{const i=setInterval(()=>setTime(new Date()),1000); return()=>clearInterval(i)},[]);
  const filtered = aircraftSeed.filter(a => `${a.id} ${a.call} ${a.from} ${a.to}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="app">
    <header>
      <div className="brand"><div className="brand-mark">A</div><span>AEROTRACK</span></div>
      <div className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search flight, airport or aircraft" /></div>
      <div className="header-right"><button className="live-btn" onClick={()=>setLive(!live)}><i className={live?'on':''}/>{live?'LIVE':'PAUSED'}</button><span className="utc">UTC {time.toISOString().slice(11,19)}</span><button className="avatar">YA</button></div>
    </header>

    <aside className="sidebar">
      <div className="tabs"><button className="active">TRACKED</button><button>FUTURE</button></div>
      <div className="filters"><button className={emergencyOnly?'filter active-filter':'filter'} onClick={()=>setEmergencyOnly(!emergencyOnly)}>⚠ Emergency</button><button className="filter">◉ {filtered.length} aircraft</button></div>
      <div className="flight-list">
        {filtered.map(a=><button key={a.id} className={`flight-row ${selected.id===a.id?'selected':''}`} onClick={()=>setSelected(a)}>
          <PlaneIcon heading={45}/><div className="row-main"><strong>{a.call}</strong><span>{a.type}</span></div><div className="route"><b>{a.from}</b><span>→</span><b>{a.to}</b></div>
        </button>)}
      </div>
    </aside>

    <main className="map" onClick={()=>{}}>
      <div className="map-grid"/><div className="map-land"/>
      {aircraftSeed.map((a,i)=><button key={a.id} className="map-aircraft" style={{left:`${18+i*15}%`,top:`${28+(i%3)*17}%`}} onClick={()=>setSelected(a)}><PlaneIcon heading={i*47}/><span>{a.call}</span></button>)}
      <div className="map-controls"><button>＋</button><button>−</button><button>⌖</button></div>
      <div className="legend"><span><i className="blue"/>En route</span><span><i className="amber"/>Approach</span><span><i className="red"/>Emergency</span></div>
      <div className="weather"><b>WEATHER</b><button>☁</button><button>Wind</button></div>
    </main>

    <section className="details">
      <div className="details-head"><div><span className="status-dot"/><b>{selected.call}</b><span className="small">{selected.id}</span></div><button>×</button></div>
      <div className="altitude"><div><small>ALTITUDE</small><strong>{selected.alt.toLocaleString()}</strong><span> ft</span></div><div><small>GROUND SPEED</small><strong>{selected.speed}</strong><span> kts</span></div></div>
      <div className="route-card"><div><small>DEPARTURE</small><strong>{selected.from}</strong><span>Scheduled 14:25</span></div><div className="route-line"><i/><b>{selected.status}</b><i/></div><div><small>ARRIVAL</small><strong>{selected.to}</strong><span>Estimated 21:48</span></div></div>
      <div className="info-grid"><div><small>AIRCRAFT</small><b>{selected.type}</b></div><div><small>HEADING</small><b>047°</b></div><div><small>VERTICAL SPEED</small><b>+128 fpm</b></div><div><small>SQUAWK</small><b>2000</b></div></div>
      <button className="atc"><span>◉</span><div><b>Listen to ATC</b><small>Nearest station · 121.650 MHz</small></div><span>›</span></button>
    </section>
  </div>
}

createRoot(document.getElementById('root')!).render(<App/>);
