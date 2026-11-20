import { useEffect, useState } from 'react';

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export const clock = (ms) => {
  const t = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const ago = (t, now) => {
  if (!t) return '—';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`;
  return `hace ${Math.floor(s / 3600)}h`;
};

export const inTime = (t, now) => {
  if (!t) return '—';
  const s = Math.max(0, Math.round((t - now) / 1000));
  if (s < 60) return `en ${s}s`;
  return `en ${Math.ceil(s / 60)}m`;
};

export const human = (ms) => {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
};

export const header = (appid) => `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;
export const capsule = (appid) => `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/capsule_184x69.jpg`;
