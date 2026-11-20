import React, { useEffect, useRef, useState } from 'react';
import DropRing from './components/DropRing.jsx';
import Queue from './components/Queue.jsx';
import Activity from './components/Activity.jsx';
import Settings from './components/Settings.jsx';
import { Login, Guard } from './components/Login.jsx';
import { useNow, header, human } from './util.js';

const STATUS = {
  offline: ['Desconectado', ''],
  connecting: ['Conectando', 'warn'],
  guard: ['Steam Guard', 'warn'],
  loading: ['Cargando', 'warn'],
  idle: ['Listo', ''],
  farming: ['Farmeando', 'live'],
  paused: ['En pausa · jugando', 'warn'],
  done: ['Completado', 'ok'],
  error: ['Error', 'bad'],
};

export default function App() {
  const [s, setS] = useState(null);
  const [booted, setBooted] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [burst, setBurst] = useState(null);
  const lastDrops = useRef(null);
  const now = useNow(1000);

  useEffect(() => {
    const off = window.sb.onState(setS);
    window.sb.state().then(async (st) => {
      setS(st);
      if (st.status === 'offline') await window.sb.resume();
      setBooted(true);
    });
    return off;
  }, []);

  // animación "+N cromo" cuando cae uno
  useEffect(() => {
    if (!s) return;
    const d = s.session.drops;
    if (lastDrops.current !== null && d > lastDrops.current) {
      setBurst({ n: d - lastDrops.current, k: Date.now() });
      setTimeout(() => setBurst(null), 2600);
    }
    lastDrops.current = d;
  }, [s?.session.drops]);

  if (!s || !booted) return <div className="center-screen"><div className="loader" /></div>;

  const logged = !!s.account;
  if (s.status === 'guard') return <Shell s={s}><Guard s={s} /></Shell>;
  if (!logged) {
    if (s.status === 'connecting' && !s.error) return <Shell s={s}><div className="center-screen"><div className="loader" /></div></Shell>;
    return <Shell s={s}><Login s={s} /></Shell>;
  }

  const running = ['farming', 'paused'].includes(s.status);
  const solo = s.phase === 'solo' ? s.current[0] : null;
  const hoursOn = s.session.startedAt ? (now - s.session.startedAt) / 3600000 : 0;
  const rate = hoursOn > 0.05 ? s.session.drops / hoursOn : 0;
  const eta = s.totals.drops * s.window.estimateMs;

  return (
    <Shell s={s} onSettings={() => setDrawer(true)}>
      <main className="grid">
        <div className="col-left">
          <section className="card hero">
            {solo && (
              <div className="banner" style={{ backgroundImage: `url(${header(solo.appid)})` }} />
            )}
            <div className="hero-body">
              <DropRing s={s} now={now} />
              {burst && <div key={burst.k} className="burst">+{burst.n} cromo{burst.n > 1 ? 's' : ''}</div>}

              <div className="now-playing">
                {s.status === 'paused' ? (
                  <>
                    <div className="np-kicker">Pausa automática</div>
                    <div className="np-title">Juega tranquilo</div>
                    <div className="muted small">Retoma solo cuando cierres el juego</div>
                  </>
                ) : solo ? (
                  <>
                    <div className="np-kicker">Farmeando</div>
                    <div className="np-title">{solo.name}</div>
                    <div className="muted small">{solo.drops} cromo{solo.drops !== 1 ? 's' : ''} restantes · {solo.hours.toFixed(1)} h jugadas</div>
                  </>
                ) : s.phase === 'multi' ? (
                  <>
                    <div className="np-kicker">Calentamiento</div>
                    <div className="np-title">{s.current.length} juegos sumando horas</div>
                    <div className="muted small">Aquí los cromos casi no caen; es para desbloquearlos</div>
                  </>
                ) : (
                  <>
                    <div className="np-kicker">{s.status === 'done' ? 'Terminado' : 'Listo'}</div>
                    <div className="np-title">{s.status === 'done' ? 'Todo farmeado' : 'Sin farmear'}</div>
                  </>
                )}
              </div>

              <div className="controls">
                {running ? (
                  <button className="btn ghost" onClick={() => window.sb.stop()}>Detener</button>
                ) : (
                  <button className="btn primary" onClick={() => window.sb.start()}>Iniciar farmeo</button>
                )}
                <button className="btn ghost" disabled={!running} onClick={() => window.sb.refresh()}>Revisar ahora</button>
              </div>
            </div>
          </section>

          <section className="stats">
            <Stat label="Esta sesión" value={s.session.drops} unit="cromos" accent />
            <Stat label="Ritmo" value={rate ? rate.toFixed(1) : '—'} unit="por hora" />
            <Stat label="Restantes" value={s.totals.drops} unit={`en ${s.totals.games} juegos`} />
            <Stat label="Tiempo estimado" value={s.totals.drops ? human(eta) : '—'} unit="si se mantiene el ritmo" small />
          </section>
        </div>

        <div className="col-right">
          <Queue s={s} />
          <Activity logs={s.logs} />
        </div>
      </main>
      <Settings s={s} open={drawer} onClose={() => setDrawer(false)} />
    </Shell>
  );
}

function Stat({ label, value, unit, accent, small }) {
  return (
    <div className={`stat card ${accent ? 'accent' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${small ? 'sm' : ''}`}>{value}</div>
      <div className="stat-unit">{unit}</div>
    </div>
  );
}

function Shell({ s, children, onSettings }) {
  const [label, tone] = STATUS[s.status] || STATUS.offline;
  return (
    <div className="app">
      <div className="titlebar">
        <div className="brand">
          <svg viewBox="0 0 20 20" width="16" height="16" className="logo">
            <path d="M10 1 L12.2 7.8 L19 10 L12.2 12.2 L10 19 L7.8 12.2 L1 10 L7.8 7.8 Z" />
          </svg>
          Steam<em>Bandage</em>
        </div>
        <div className={`pill ${tone}`}><i />{label}</div>
        <div className="tb-right">
          {s.account && (
            <div className="acct">
              {s.account.avatar && <img src={s.account.avatar} alt="" />}
              <span>{s.account.name}</span>
            </div>
          )}
          {onSettings && <button className="icon-btn" title="Ajustes" onClick={onSettings}>⚙</button>}
        </div>
      </div>
      {children}
    </div>
  );
}
