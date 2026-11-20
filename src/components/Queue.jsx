import React from 'react';
import { capsule } from '../util.js';

export default function Queue({ s }) {
  const th = Math.max(0.1, Number(s.settings.hoursThreshold) || 2);
  const activeIds = new Set(s.current.map((g) => g.appid));

  return (
    <section className="card queue">
      <header className="card-head">
        <h3>Cola</h3>
        <span className="muted small">{s.totals.games} juegos · {s.totals.drops} cromos</span>
      </header>

      <div className="queue-list">
        {!s.queue.length && <div className="empty">Aún no hay datos. Inicia el farmeo para leer tus insignias.</div>}
        {s.queue.map((g) => {
          const active = activeIds.has(g.appid);
          const pct = Math.min(100, (g.hours / th) * 100);
          return (
            <div key={g.appid} className={`q-row ${active ? 'active' : ''} ${g.skipped ? 'skipped' : ''}`}>
              <img src={capsule(g.appid)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              <div className="q-info">
                <div className="q-name" title={g.name}>{g.name}</div>
                <div className="q-meta">
                  <div className="hours-bar" title={`${g.hours} h jugadas`}>
                    <i style={{ width: `${pct}%` }} className={pct >= 100 ? 'ready' : ''} />
                  </div>
                  <span>{g.hours.toFixed(1)} h</span>
                </div>
              </div>
              <div className="q-drops">
                {Array.from({ length: Math.min(g.drops, 6) }).map((_, i) => <b key={i} />)}
                {g.drops > 6 && <em>+{g.drops - 6}</em>}
              </div>
              <button className="icon-btn" title={g.skipped ? 'Volver a incluir' : 'Saltar este juego'}
                onClick={() => window.sb.skip(g.appid)}>{g.skipped ? '↺' : '×'}</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
