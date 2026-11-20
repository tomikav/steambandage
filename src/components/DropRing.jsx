import React from 'react';
import { clock, ago, inTime, human } from '../util.js';

const SIZE = 340;
const C = SIZE / 2;
const TICKS = 72;

function polar(r, a) {
  const rad = ((a - 90) * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
}

/**
 * Indicador de la "ventana de caída".
 * - Fase solo: avanza con el tiempo desde el último cromo vs el intervalo estimado.
 * - Fase calentamiento: avanza con las horas acumuladas vs el umbral.
 * El barrido giratorio = la sesión latiendo con el servidor; el pulso = un check en curso.
 */
export default function DropRing({ s, now }) {
  const { window: w, phase, status, current, settings } = s;
  const paused = status === 'paused';
  const farming = status === 'farming';
  const done = status === 'done';

  let progress = 0, label = 'EN ESPERA', big = '—', sub = 'Inicia el farmeo para empezar', over = false;

  if (paused) {
    label = 'EN PAUSA';
    big = 'Jugando';
    sub = s.blockedName ? s.blockedName : 'Retoma solo cuando cierres el juego';
  } else if (done) {
    progress = 1; label = 'COMPLETADO'; big = '✦'; sub = 'No quedan cromos pendientes';
  } else if (farming && phase === 'solo' && w.startedAt) {
    const elapsed = now - w.startedAt;
    progress = Math.min(1, elapsed / w.estimateMs);
    over = elapsed >= w.estimateMs;
    label = 'PRÓXIMO CROMO';
    big = over ? 'Inminente' : clock(w.estimateMs - elapsed);
    sub = over
      ? <>lleva {clock(elapsed)}<br />puede caer en cualquier momento</>
      : <>ventana de ~{human(w.estimateMs)}<br />{w.samples >= 2 ? `${w.samples} caídas medidas` : 'estimación inicial'}</>;
  } else if (farming && phase === 'multi' && current.length) {
    const th = Math.max(0.1, Number(settings.hoursThreshold) || 2);
    const extra = w.startedAt ? (now - w.startedAt) / 3600000 : 0;
    const minH = Math.min(...current.map((g) => g.hours)) + extra;
    progress = Math.min(1, minH / th);
    label = 'CALENTANDO HORAS';
    big = `${minH.toFixed(1)} / ${th.toFixed(1)} h`;
    sub = <>{current.length} juegos a la vez<br />luego pasan a farmeo individual</>;
  } else if (s.status === 'loading' || s.status === 'connecting') {
    label = 'CONECTANDO'; big = '···'; sub = 'Hablando con Steam';
  }

  const lit = Math.round(progress * TICKS);
  const rArc = 128;
  const circ = 2 * Math.PI * rArc;

  return (
    <div className={`ring ${paused ? 'is-paused' : ''} ${over ? 'is-over' : ''} ${done ? 'is-done' : ''}`}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
        <defs>
          <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff4d6d" />
            <stop offset="100%" stopColor="#8e0f2a" />
          </linearGradient>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(194,24,58,0.10)" />
            <stop offset="70%" stopColor="rgba(194,24,58,0.02)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <circle cx={C} cy={C} r={150} fill="url(#core)" />

        {/* ticks exteriores */}
        {Array.from({ length: TICKS }).map((_, i) => {
          const a = (i / TICKS) * 360;
          const major = i % 6 === 0;
          const [x1, y1] = polar(major ? 150 : 153, a);
          const [x2, y2] = polar(160, a);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              className={i < lit ? 'tick on' : 'tick'} strokeWidth={major ? 2 : 1.2} />
          );
        })}

        {/* pista + arco */}
        <circle cx={C} cy={C} r={rArc} className="track" />
        <circle cx={C} cy={C} r={rArc} className="arc" stroke="url(#arc)" filter="url(#glow)"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
          transform={`rotate(-90 ${C} ${C})`} />

        {/* aguja en la punta del arco */}
        {progress > 0 && progress < 1 && (() => {
          const [x, y] = polar(rArc, progress * 360);
          return <circle cx={x} cy={y} r={4.5} className="head" />;
        })()}

        {/* barrido = latido de la sesión */}
        {farming && (
          <g className="sweep">
            <path d={`M ${C} ${C} L ${C} ${C - 118} A 118 118 0 0 1 ${polar(118, 38).join(' ')} Z`} />
          </g>
        )}

        {/* ornamento */}
        <g className="orn" transform={`translate(${C} ${C - 74})`}>
          <path d="M-22 0 H-6 M6 0 H22" />
          <path d="M0 -5 L4 0 L0 5 L-4 0 Z" />
        </g>
      </svg>

      {w.checking && <span className="pulse" />}

      <div className="ring-center">
        <div className="ring-label">{label}</div>
        <div className="ring-big">{big}</div>
        <div className="ring-sub">{sub}</div>
      </div>

      <div className="server-line">
        <span className={`dot ${farming ? 'live' : ''} ${w.checking ? 'busy' : ''}`} />
        {paused ? 'esperando a que cierres el juego'
          : w.checking ? 'consultando a Steam…'
          : <>último check {ago(w.lastCheck, now)} · próximo {inTime(w.nextCheck, now)}</>}
      </div>
    </div>
  );
}
