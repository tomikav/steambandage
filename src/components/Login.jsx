import React, { useEffect, useState } from 'react';
import { useNow, clock } from '../util.js';

export function Ornament() {
  return (
    <svg className="ornament" viewBox="0 0 160 14" width="160" height="14">
      <path d="M0 7 H62 M98 7 H160" />
      <path d="M80 1 L86 7 L80 13 L74 7 Z" />
      <circle cx="68" cy="7" r="1.6" /><circle cx="92" cy="7" r="1.6" />
    </svg>
  );
}

function Shield() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" className="shield">
      <path d="M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z" />
      <path d="M8.5 12 L11 14.5 L15.5 9.5" className="tick-path" />
    </svg>
  );
}

function QrBox({ qr, now, connecting }) {
  const st = connecting ? 'connecting' : (qr?.state || 'loading');
  const [zoom, setZoom] = useState(false);
  return (
    <div className={`qr-box st-${st}`}>
      {zoom && st === 'ready' && (
        <div className="qr-zoom" onClick={() => setZoom(false)}>
          <img src={qr.svg} alt="Código QR" />
          <span>Clic para cerrar</span>
        </div>
      )}
      <span className="qc tl" /><span className="qc tr" /><span className="qc bl" /><span className="qc br" />
      {(st === 'ready' || st === 'scanned') && (
        <img className="qr-img" src={qr.svg} alt="Código QR de inicio de sesión"
          title="Clic para ampliar" onClick={() => setZoom(true)} />
      )}
      {(st === 'loading' || st === 'idle') && <div className="loader" />}
      {st === 'connecting' && (
        <div className="qr-overlay solid">
          <div className="loader" />
          <b>Conectando</b>
          <span>Entrando a tu cuenta…</span>
        </div>
      )}
      {st === 'scanned' && (
        <div className="qr-overlay">
          <div className="qr-check">✓</div>
          <b>Escaneado</b>
          <span>Aprueba en tu celular</span>
        </div>
      )}
      {st === 'error' && (
        <div className="qr-overlay">
          <span className="err-txt">{qr.error}</span>
          <button className="btn ghost sm" onClick={() => window.sb.qrStart()}>Reintentar</button>
        </div>
      )}
      {st === 'ready' && qr.expiresAt && (
        <div className="qr-timer">se renueva en {clock(qr.expiresAt - now)} · clic para ampliar</div>
      )}
    </div>
  );
}

function PasswordForm({ s, onBack }) {
  const [user, setUser] = useState(() => { try { return localStorage.getItem('sb-user') || ''; } catch { return ''; } });
  const [pass, setPass] = useState('');
  const [remember, setRemember] = useState(true);
  const busy = s.status === 'connecting';

  const submit = (e) => {
    e.preventDefault();
    if (!user || !pass || busy) return;
    try { localStorage.setItem('sb-user', user.trim()); } catch {}
    window.sb.login({ accountName: user.trim(), password: pass, remember });
  };

  return (
    <form className="login card" onSubmit={submit}>
      <div className="brand-big">Steam<em>Bandage</em></div>
      <Ornament />
      <p className="muted small">Entrar con usuario y contraseña</p>
      <label className="field">
        <span>Usuario de Steam</span>
        <input value={user} onChange={(e) => setUser(e.target.value)} autoFocus={!user} spellCheck={false} />
      </label>
      <label className="field">
        <span>Contraseña</span>
        <input type="password" value={pass} autoFocus={!!user} onChange={(e) => setPass(e.target.value)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <span>Recordar sesión en este PC</span>
      </label>
      {s.error && <div className="err">{s.error}</div>}
      <button className="btn primary wide" disabled={busy || !user || !pass}>
        {busy ? 'Conectando…' : 'Entrar'}
      </button>
      <button type="button" className="link" onClick={onBack}>← Volver al código QR</button>
    </form>
  );
}

export function Login({ s }) {
  const [mode, setMode] = useState('qr');
  const [accounts, setAccounts] = useState([]);
  const now = useNow(1000);

  useEffect(() => { window.sb.accounts().then((a) => setAccounts(a || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (mode !== 'qr') return undefined;
    window.sb.qrStart();
    return () => window.sb.qrCancel();
  }, [mode]);

  if (mode === 'password') {
    return <div className="center-screen"><PasswordForm s={s} onBack={() => setMode('qr')} /></div>;
  }

  const acc = accounts[0];

  return (
    <div className="center-screen">
      <div className="qr-login card">
        <div className="qr-left">
          <QrBox qr={s.qr} now={now} connecting={s.status === 'connecting'} />
        </div>

        <div className="qr-right">
          <div className="brand-big">Steam<em>Bandage</em></div>
          <Ornament />

          {acc ? (
            <div className="acct-detect">
              {acc.avatar
                ? <img src={acc.avatar} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                : <div className="av-ph">{(acc.personaName || '?')[0]}</div>}
              <div>
                <div className="ad-name">{acc.personaName}</div>
                <div className="ad-sub">Cuenta detectada en este PC · escanea con ella</div>
              </div>
            </div>
          ) : (
            <p className="muted small">Inicia sesión con la app de Steam de tu celular.</p>
          )}

          <ol className="steps">
            <li><span>I</span><p>Abre la <b>app de Steam</b> en tu celular</p></li>
            <li><span>II</span><p>Ve a <b>Steam Guard</b> y toca el ícono de <b>escanear</b></p></li>
            <li><span>III</span><p>Apunta al código y toca <b>Aprobar</b></p></li>
          </ol>

          {s.error && <div className="err">{s.error}</div>}

          <div className="trust">
            <Shield />
            <span>SteamBandage <b>nunca ve tu contraseña</b>. Puedes quitarle el acceso cuando quieras desde la app de Steam.</span>
          </div>

          <button type="button" className="link" onClick={() => setMode('password')}>
            ¿No tienes la app? Entrar con contraseña
          </button>
        </div>
      </div>
    </div>
  );
}

export function Guard({ s }) {
  const [code, setCode] = useState('');
  const g = s.guard || {};
  const submit = (e) => {
    e.preventDefault();
    if (code.trim()) window.sb.guard(code);
  };
  return (
    <div className="center-screen">
      <form className="login card" onSubmit={submit}>
        <div className="brand-big">Steam <em>Guard</em></div>
        <Ornament />
        <p className="muted small">
          {g.type === 'email'
            ? <>Te llegó un código al correo <b>…@{g.domain}</b></>
            : <>Aprueba el inicio en la app de Steam, o escribe el código</>}
        </p>
        <input className="code" value={code} maxLength={5} autoFocus spellCheck={false}
          onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXXX" />
        {g.lastCodeWrong && <div className="err">Código incorrecto. Espera al siguiente (30 s).</div>}
        <button className="btn primary wide" disabled={code.trim().length < 5}>Confirmar</button>
      </form>
    </div>
  );
}
