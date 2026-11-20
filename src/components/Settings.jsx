import React from 'react';

function Toggle({ on, onChange }) {
  return (
    <button type="button" className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <i />
    </button>
  );
}

export default function Settings({ s, open, onClose }) {
  const st = s.settings;
  const set = (patch) => window.sb.settings(patch);

  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'open' : ''}`}>
        <header className="card-head">
          <h3>Ajustes</h3>
          <button className="icon-btn" onClick={onClose}>×</button>
        </header>

        <div className="group">
          <div className="group-title">Farmeo</div>
          <div className="row">
            <div><b>Horas antes de farmear solo</b><p>Steam no suelta cromos hasta ~2 h jugadas. 0 = siempre de a uno.</p></div>
            <input type="number" min="0" max="10" step="0.5" value={st.hoursThreshold}
              onChange={(e) => set({ hoursThreshold: Math.max(0, parseFloat(e.target.value) || 0) })} />
          </div>
          <div className="row">
            <div><b>Juegos a la vez (calentamiento)</b><p>Máximo que permite Steam: 32.</p></div>
            <input type="number" min="1" max="32" value={st.maxConcurrent}
              onChange={(e) => set({ maxConcurrent: Math.min(32, Math.max(1, parseInt(e.target.value, 10) || 1)) })} />
          </div>
          <div className="row">
            <div><b>Orden</b></div>
            <select value={st.sortBy} onChange={(e) => set({ sortBy: e.target.value })}>
              <option value="drops">Más cromos primero</option>
              <option value="hours">Más horas primero</option>
              <option value="name">Alfabético</option>
            </select>
          </div>
          <div className="row">
            <div><b>Empezar al abrir</b><p>Arranca solo al iniciar sesión.</p></div>
            <Toggle on={st.autoStart} onChange={(v) => set({ autoStart: v })} />
          </div>
        </div>

        <div className="group">
          <div className="group-title">Autoventa</div>
          <div className="row">
            <div><b>Vender cromos nuevos</b><p>Los lista en el mercado. Debes confirmarlos en la app móvil de Steam.</p></div>
            <Toggle on={st.autoSell} onChange={(v) => set({ autoSell: v })} />
          </div>
          <div className={`sub ${st.autoSell ? '' : 'disabled'}`}>
            <div className="row">
              <div><b>Precio</b></div>
              <select value={st.sellMode} disabled={!st.autoSell} onChange={(e) => set({ sellMode: e.target.value })}>
                <option value="undercut">Más bajo − 1 centavo</option>
                <option value="match">Igual al más bajo</option>
              </select>
            </div>
            <div className="row">
              <div><b>Mínimo a recibir</b><p>En tu moneda. No vende por debajo.</p></div>
              <input type="number" min="0" step="0.01" disabled={!st.autoSell} defaultValue={(st.minSellCents / 100).toFixed(2)}
                onBlur={(e) => set({ minSellCents: Math.round((parseFloat(e.target.value) || 0) * 100) })} />
            </div>
          </div>
        </div>

        <div className="group">
          <div className="group-title">Cuenta</div>
          <button className="btn ghost wide" onClick={() => { onClose(); window.sb.logout(); }}>Cerrar sesión</button>
        </div>
      </aside>
    </>
  );
}
