import React from 'react';

const ICON = { drop: '✦', pause: '‖', play: '▸', sell: '$', warn: '!', error: '×', done: '✓', info: '·' };
const time = (t) => new Date(t).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

export default function Activity({ logs }) {
  const list = [...logs].reverse();
  return (
    <section className="card activity">
      <header className="card-head"><h3>Actividad</h3></header>
      <div className="log">
        {!list.length && <div className="empty">Nada por aquí todavía.</div>}
        {list.map((l, i) => (
          <div key={l.t + '-' + i} className={`log-row k-${l.kind}`}>
            <span className="log-ic">{ICON[l.kind] || '·'}</span>
            <span className="log-tx">{l.text}</span>
            <span className="log-t">{time(l.t)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
