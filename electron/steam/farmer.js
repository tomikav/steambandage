// Núcleo del farmeo. Inicia sesión como un cliente de Steam aparte (sin abrir juegos),
// reporta "jugando X" y sigue los cromos pendientes desde la página de insignias.
//
// Algoritmo (2 fases, igual de eficiente que ASF):
//   1. SOLO: juegos con >= hoursThreshold horas se farmean de a uno (ahí sí caen cromos).
//   2. CALENTAMIENTO: si no hay ninguno listo, se ponen hasta 32 juegos a la vez para
//      sumarles horas hasta pasar el umbral; luego pasan a SOLO.
// Si juegas en tu PC, Steam bloquea esta sesión -> se pausa sola y retoma al cerrar el juego.

const { EventEmitter } = require('events');
const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const store = require('../store');
const { fetchAllBadges, fetchGameDrops } = require('./badges');
const market = require('./market');

const MIN = 60 * 1000;
const SOLO_CHECK = 5 * MIN;
const MULTI_CHECK = 10 * MIN;
const DEFAULT_INTERVAL = 30 * MIN;
const LOGON_ID = 0x5bad0e; // distinto al del cliente oficial para no echarlo

const ERRORS = {
  5: 'Usuario o contraseña incorrectos',
  65: 'Código de Steam Guard incorrecto',
  84: 'Demasiados intentos. Espera unos minutos',
  88: 'Código de la app móvil incorrecto',
  6: 'Sesión abierta en otro lado (LoggedInElsewhere)',
};

class Farmer extends EventEmitter {
  constructor() {
    super();
    this.settings = store.getSettings();
    this.stats = store.getStats();
    this.logs = [];
    this.reset();
  }

  reset() {
    clearTimeout(this.timer);
    clearTimeout(this.newItemsTimer);
    if (this.client) {
      this.client.removeAllListeners();
      this.client.on('error', () => {}); // evita crash por errores tardíos
      try { this.client.logOff(); } catch {}
    }
    this.client = null;
    this.reconnecting = false;
    this.community = new SteamCommunity();
    this.status = 'offline';
    this.error = null;
    this.account = null;
    this.guard = null;
    this.guardCb = null;
    this.queue = [];
    this.current = [];
    this.phase = null;
    this.blocked = false;
    this.blockedApp = 0;
    this.running = false;
    this.webReady = false;
    this.windowStart = null;   // inicio de la ventana de caída actual
    this.lastCheck = null;
    this.nextCheck = null;
    this.checking = false;
    this.currency = 1;
    this.knownAssets = null;
    this.session = { drops: 0, startedAt: null, sold: 0, soldCents: 0 };
    this.remember = false;
    this.accountName = null;
  }

  // ---------- estado para la UI ----------
  estimateMs() {
    const iv = this.stats.intervals.filter((x) => x > 3 * MIN && x < 3 * 60 * MIN).slice(-15);
    if (iv.length < 2) return DEFAULT_INTERVAL;
    const s = [...iv].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  snapshot() {
    return {
      status: this.status,
      error: this.error,
      account: this.account,
      guard: this.guard,
      phase: this.phase,
      current: this.current,
      queue: this.queue,
      blocked: this.blocked,
      blockedApp: this.blockedApp,
      blockedName: this.queue.find((g) => g.appid === this.blockedApp)?.name || null,
      window: {
        startedAt: this.windowStart,
        estimateMs: this.estimateMs(),
        lastCheck: this.lastCheck,
        nextCheck: this.nextCheck,
        checking: this.checking,
        samples: this.stats.intervals.length,
      },
      session: this.session,
      totals: {
        drops: this.queue.reduce((a, g) => a + g.drops, 0),
        games: this.queue.length,
        lifetime: this.stats.totalDrops,
      },
      settings: this.settings,
      logs: this.logs.slice(-60),
      now: Date.now(),
    };
  }

  push() {
    clearTimeout(this.pushT);
    this.pushT = setTimeout(() => this.emit('state', this.snapshot()), 30);
  }

  log(kind, text) {
    this.logs.push({ t: Date.now(), kind, text });
    if (this.logs.length > 200) this.logs.shift();
    this.push();
  }

  // ---------- login ----------
  makeClient() {
    const c = new SteamUser({ renewRefreshTokens: true, autoRelogin: true });
    this.client = c;

    c.on('steamGuard', (domain, cb, lastCodeWrong) => {
      this.guardCb = cb;
      this.guard = { type: domain ? 'email' : 'mobile', domain, lastCodeWrong: !!lastCodeWrong };
      this.status = 'guard';
      this.push();
    });

    c.on('refreshToken', (token) => {
      if (this.remember && this.accountName) store.saveToken(this.accountName, token);
    });

    c.on('loggedOn', () => {
      this.guard = null;
      this.error = null;
      this.status = 'loading';
      const id = c.steamID.getSteamID64();
      this.account = { steamID: id, name: this.accountName || c.accountInfo?.name || id, avatar: null };
      this.log('info', 'Sesión iniciada en Steam');
      c.setPersona(SteamUser.EPersonaState.Invisible); // no te cambia el estado a tus amigos
      c.getPersonas([c.steamID], (err, personas) => {
        const p = personas && personas[id];
        if (p) {
          this.account.name = p.player_name || this.account.name;
          this.account.avatar = p.avatar_url_full || p.avatar_url_medium || null;
          this.push();
        }
      });
    });

    c.on('wallet', (_has, currency) => { this.currency = currency || 1; });

    c.on('webSession', (_sid, cookies) => {
      this.community.setCookies(cookies);
      const first = !this.webReady;
      this.webReady = true;
      if (first) {
        this.status = 'idle';
        this.push();
        if (this.settings.autoStart) this.start();
      } else if (this.reconnecting) {
        this.reconnecting = false;
        if (this.running) { this.current = []; this.refresh(); }
        else { this.status = 'idle'; this.push(); }
      }
    });

    this.community.on('sessionExpired', () => {
      this.log('warn', 'Sesión web expirada, renovando…');
      c.webLogOn();
    });

    c.on('playingState', (blocked, playingApp) => this.onPlayingState(blocked, playingApp));

    c.on('newItems', (count) => {
      if (count > 0 && this.running && this.phase === 'solo') {
        clearTimeout(this.newItemsTimer);
        this.newItemsTimer = setTimeout(() => this.check(), 4000);
      }
    });

    c.on('disconnected', (eresult, msg) => {
      this.log('warn', `Desconectado de Steam (${msg || eresult}), reconectando…`);
      clearTimeout(this.timer); this.timer = null; this.nextCheck = null;
      this.reconnecting = true; // al volver, se reenvía gamesPlayed y sigue el loop
      this.status = 'connecting';
      this.push();
    });

    c.on('error', (err) => {
      const msg = ERRORS[err.eresult] || err.message;
      if ([5, 8, 15, 18].includes(err.eresult) || /token/i.test(err.message)) store.clearToken();
      this.log('error', msg);
      const keep = this.settings;
      this.reset();
      this.settings = keep;
      this.status = 'offline';
      this.error = msg;
      this.push();
    });

    return c;
  }

  login({ accountName, password, remember }) {
    this.reset();
    this.remember = !!remember;
    this.accountName = accountName;
    this.status = 'connecting';
    this.push();
    this.makeClient().logOn({ accountName, password, logonID: LOGON_ID, machineName: 'SteamBandage' });
  }

  resume() {
    const saved = store.loadToken();
    if (!saved) return false;
    this.reset();
    this.remember = true;
    this.accountName = saved.accountName;
    this.status = 'connecting';
    this.push();
    this.makeClient().logOn({ refreshToken: saved.token, logonID: LOGON_ID, machineName: 'SteamBandage' });
    return true;
  }

  submitGuard(code) {
    if (!this.guardCb) return;
    const cb = this.guardCb;
    this.guardCb = null;
    this.status = 'connecting';
    this.push();
    cb(String(code).trim());
  }

  logout() {
    store.clearToken();
    try { this.client?.gamesPlayed([]); this.client?.logOff(); } catch {}
    const keep = this.settings;
    this.reset();
    this.settings = keep;
    this.push();
  }

  // ---------- control ----------
  async start() {
    if (!this.webReady) return;
    this.running = true;
    this.session.startedAt = this.session.startedAt || Date.now();
    this.log('info', 'Farmeo iniciado');
    if (this.settings.autoSell && !this.knownAssets) await this.snapshotInventory();
    await this.refresh();
  }

  stop() {
    this.running = false;
    clearTimeout(this.timer); this.timer = null;
    this.nextCheck = null;
    this.current = [];
    this.phase = null;
    this.windowStart = null;
    try { this.client?.gamesPlayed([]); } catch {}
    this.status = 'idle';
    this.log('info', 'Farmeo detenido');
  }

  setSettings(patch) {
    const prev = this.settings;
    this.settings = { ...this.settings, ...patch };
    store.saveSettings(this.settings);
    if (patch.autoSell && !prev.autoSell && this.running) this.snapshotInventory();
    const needsRepick = ['hoursThreshold', 'maxConcurrent', 'sortBy', 'blacklist'].some((k) => k in patch);
    if (needsRepick && this.running && !this.blocked) this.refresh();
    else this.push();
  }

  skip(appid) {
    const bl = new Set(this.settings.blacklist);
    bl.has(appid) ? bl.delete(appid) : bl.add(appid);
    this.setSettings({ blacklist: [...bl] });
  }

  // ---------- loop ----------
  sortQueue(list) {
    const by = this.settings.sortBy;
    return [...list].sort((a, b) =>
      by === 'name' ? a.name.localeCompare(b.name)
        : by === 'hours' ? b.hours - a.hours
          : b.drops - a.drops || b.hours - a.hours);
  }

  async refresh() {
    if (!this.running) return;
    this.checking = true; this.push();
    try {
      const games = await fetchAllBadges(this.community, this.account.steamID);
      const bl = new Set(this.settings.blacklist);
      this.queue = this.sortQueue(games).map((g) => ({ ...g, skipped: bl.has(g.appid) }));
      this.lastCheck = Date.now();
      this.checking = false;
      this.pick();
    } catch (e) {
      this.checking = false;
      this.log('warn', `No pude leer tus insignias: ${e.message}`);
      if (/expirada/.test(e.message)) this.client.webLogOn();
      this.schedule(2 * MIN);
    }
  }

  pick() {
    if (!this.running) return;
    if (this.blocked) { this.status = 'paused'; this.push(); return; }

    const active = this.queue.filter((g) => !g.skipped && g.drops > 0);
    if (!active.length) {
      this.current = []; this.phase = null; this.windowStart = null;
      this.client.gamesPlayed([]);
      this.status = 'done';
      this.running = false;
      this.nextCheck = null;
      this.log('done', 'No quedan cromos por farmear. ✦');
      return;
    }

    const th = Number(this.settings.hoursThreshold) || 0;
    const ready = active.filter((g) => g.hours >= th);
    const prevIds = this.current.map((g) => g.appid).join(',');

    if (ready.length) {
      this.phase = 'solo';
      this.current = [ready[0]];
    } else {
      this.phase = 'multi';
      this.current = active.slice(0, Math.max(1, Math.min(32, this.settings.maxConcurrent)));
    }

    const ids = this.current.map((g) => g.appid);
    if (ids.join(',') !== prevIds) {
      this.windowStart = Date.now();
      this.client.gamesPlayed(ids);
      this.log('play', this.phase === 'solo'
        ? `Farmeando ${this.current[0].name} (${this.current[0].drops} cromos)`
        : `Calentando horas en ${ids.length} juegos a la vez`);
    }
    this.status = 'farming';
    this.schedule(this.phase === 'solo' ? SOLO_CHECK : MULTI_CHECK);
  }

  schedule(ms) {
    clearTimeout(this.timer);
    this.nextCheck = Date.now() + ms;
    this.timer = setTimeout(() => { this.timer = null; this.check(); }, ms);
    this.push();
  }

  async check() {
    if (!this.running || this.blocked || this.checking) return;
    if (this.phase !== 'solo' || !this.current[0]) return this.refresh();

    const game = this.current[0];
    this.checking = true; this.push();
    try {
      const left = await fetchGameDrops(this.community, this.account.steamID, game.appid);
      this.lastCheck = Date.now();
      this.checking = false;
      if (left < game.drops) this.onDrop(game, game.drops - left);
      game.drops = left;
      const q = this.queue.find((g) => g.appid === game.appid);
      if (q) q.drops = left;
      if (left <= 0) {
        this.log('done', `${game.name} completado`);
        this.queue = this.queue.filter((g) => g.appid !== game.appid);
        this.current = [];
        if (this.settings.autoSell) this.autoSell();
        return this.refresh();
      }
      this.schedule(SOLO_CHECK);
    } catch (e) {
      this.checking = false;
      this.log('warn', `Check falló: ${e.message}`);
      if (/expirada/.test(e.message)) this.client.webLogOn();
      this.schedule(2 * MIN);
    }
  }

  onDrop(game, n) {
    const now = Date.now();
    if (this.windowStart) {
      // si hubo varios cromos juntos, se reparte el intervalo
      const each = (now - this.windowStart) / n;
      for (let i = 0; i < n; i++) this.stats.intervals.push(each);
      this.stats.intervals = this.stats.intervals.slice(-50);
    }
    this.windowStart = now;
    this.session.drops += n;
    this.stats.totalDrops += n;
    store.saveStats(this.stats);
    this.emit('drop', { game: game.name, count: n });
    this.log('drop', `+${n} cromo${n > 1 ? 's' : ''} de ${game.name}`);
    if (this.settings.autoSell) this.autoSell();
  }

  onPlayingState(blocked, app) {
    const was = this.blocked;
    this.blocked = !!blocked;
    this.blockedApp = blocked ? app : 0;
    if (blocked && !was) {
      clearTimeout(this.timer); this.timer = null; this.nextCheck = null;
      if (this.running) {
        this.status = 'paused';
        this.windowStart = null;
        const name = this.queue.find((g) => g.appid === app)?.name;
        this.log('pause', `Estás jugando${name ? ' ' + name : ''} — farmeo en pausa`);
      }
      this.push();
    } else if (!blocked && was) {
      if (this.running) {
        this.log('play', 'Cerraste el juego, retomando farmeo');
        this.current = []; // fuerza volver a mandar gamesPlayed
        setTimeout(() => this.refresh(), 3000);
      }
      this.push();
    }
  }

  // ---------- autoventa ----------
  async snapshotInventory() {
    try {
      const cards = await market.getCards(this.community, this.account.steamID);
      this.knownAssets = new Set(cards.map((c) => String(c.assetid)));
    } catch (e) {
      this.knownAssets = new Set();
      this.log('warn', `No pude leer tu inventario: ${e.message}`);
    }
  }

  async autoSell() {
    if (this.selling) return;
    this.selling = true;
    try {
      if (!this.knownAssets) await this.snapshotInventory();
      await new Promise((r) => setTimeout(r, 8000)); // el inventario tarda en reflejar el cromo
      const r = await market.sellNewCards({
        community: this.community, steamID: this.account.steamID, currency: this.currency,
        known: this.knownAssets, settings: this.settings, log: (k, t) => this.log(k, t),
      });
      if (r.listed) {
        this.session.sold += r.listed;
        this.session.soldCents += r.cents;
        this.stats.earnedCents += r.cents;
        store.saveStats(this.stats);
        this.log('sell', `${r.listed} listado(s) — confírmalos en la app móvil de Steam`);
      }
    } catch (e) {
      this.log('warn', `Autoventa: ${e.message}`);
    } finally {
      this.selling = false;
    }
  }
}

module.exports = Farmer;
