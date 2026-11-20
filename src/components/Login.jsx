import React, { useState } from 'react';

export function Ornament() {
  return (
    <svg className="ornament" viewBox="0 0 160 14" width="160" height="14">
      <path d="M0 7 H62 M98 7 H160" />
      <path d="M80 1 L86 7 L80 13 L74 7 Z" />
      <circle cx="68" cy="7" r="1.6" /><circle cx="92" cy="7" r="1.6" />
    </svg>
  );
}

export function Login({ s }) {
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
    <div className="center-screen">
      <form className="login card" onSubmit={submit}>
        <div className="brand-big">Steam<em>Bandage</em></div>
        <Ornament />
        <p className="muted small">Farmeo de cromos sin abrir juegos</p>

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
        <p className="muted tiny">
          La contraseña va directo a Steam. Solo se guarda un token cifrado con Windows en tu PC.
        </p>
      </form>
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
