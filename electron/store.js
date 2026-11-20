// Persistencia local: config, stats y refresh token cifrado con safeStorage.
const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

const dir = () => app.getPath('userData');
const file = (name) => path.join(dir(), name);

const DEFAULT_SETTINGS = {
  hoursThreshold: 2,      // horas mínimas antes de que Steam suelte cromos (0 = siempre solo)
  maxConcurrent: 32,      // juegos a la vez en la fase de calentamiento
  sortBy: 'drops',        // drops | hours | name
  blacklist: [],          // appids que no se farmean
  autoSell: false,        // DESACTIVADO por defecto
  sellMode: 'undercut',   // undercut (1 centavo menos) | match (mismo precio)
  minSellCents: 0,        // no vender por debajo de esto (en centavos de tu moneda)
  autoStart: true,        // empezar a farmear al iniciar sesión
};

function readJson(name, fallback) {
  try { return { ...fallback, ...JSON.parse(fs.readFileSync(file(name), 'utf8')) }; }
  catch { return { ...fallback }; }
}
function writeJson(name, data) {
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(file(name), JSON.stringify(data, null, 2));
}

module.exports = {
  DEFAULT_SETTINGS,
  getSettings: () => readJson('settings.json', DEFAULT_SETTINGS),
  saveSettings: (s) => writeJson('settings.json', s),
  getStats: () => readJson('stats.json', { totalDrops: 0, intervals: [], earnedCents: 0 }),
  saveStats: (s) => writeJson('stats.json', s),

  saveToken(accountName, token) {
    const payload = JSON.stringify({ accountName, token });
    const data = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(payload)
      : Buffer.from(payload, 'utf8');
    fs.mkdirSync(dir(), { recursive: true });
    fs.writeFileSync(file('session.bin'), data);
  },
  loadToken() {
    try {
      const buf = fs.readFileSync(file('session.bin'));
      const txt = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8');
      return JSON.parse(txt);
    } catch { return null; }
  },
  clearToken() {
    try { fs.unlinkSync(file('session.bin')); } catch {}
  },
};
