// Detecta qué cuentas de Steam hay en este PC leyendo config/loginusers.vdf.
// Solo lee nombre, alias y avatar. No toca sesiones, tokens ni cookies del cliente.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function steamDir() {
  const candidates = [];
  if (process.platform === 'win32') {
    try {
      const out = execFileSync('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], { encoding: 'utf8', windowsHide: true });
      const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
      if (m) candidates.push(m[1].trim().replace(/\//g, '\\'));
    } catch {}
    candidates.push('C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam');
  } else {
    const home = require('os').homedir();
    candidates.push(path.join(home, '.steam', 'steam'), path.join(home, '.local', 'share', 'Steam'),
      path.join(home, 'Library', 'Application Support', 'Steam'));
  }
  return candidates.find((d) => fs.existsSync(path.join(d, 'config', 'loginusers.vdf'))) || null;
}

function parseLoginUsers(text) {
  const users = [];
  const re = /"(\d{17})"\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(text))) {
    const body = m[2];
    const get = (k) => (body.match(new RegExp(`"${k}"\\s*"([^"]*)"`, 'i')) || [])[1] || '';
    users.push({
      steamID: m[1],
      accountName: get('AccountName'),
      personaName: get('PersonaName') || get('AccountName'),
      mostRecent: get('MostRecent') === '1',
      timestamp: parseInt(get('Timestamp'), 10) || 0,
    });
  }
  return users.sort((a, b) => (b.mostRecent - a.mostRecent) || (b.timestamp - a.timestamp));
}

function detectAccounts() {
  try {
    const dir = steamDir();
    if (!dir) return [];
    const users = parseLoginUsers(fs.readFileSync(path.join(dir, 'config', 'loginusers.vdf'), 'utf8'));
    for (const u of users) {
      const av = path.join(dir, 'config', 'avatarcache', `${u.steamID}.png`);
      try { u.avatar = `data:image/png;base64,${fs.readFileSync(av).toString('base64')}`; } catch { u.avatar = null; }
    }
    return users.slice(0, 5);
  } catch {
    return [];
  }
}

module.exports = { detectAccounts, parseLoginUsers };
