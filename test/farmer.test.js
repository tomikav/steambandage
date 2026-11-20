// Simula Steam completo (login, insignias, drops, jugar en otro PC, autoventa)
// para probar el algoritmo sin una cuenta real.  Ejecutar: npm test
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// ---------- Steam falso ----------
const world = {
  games: {
    10: { name: 'Juego Listo', drops: 3, hours: 5 },
    20: { name: 'Juego Nuevo', drops: 2, hours: 0.5 },
  },
  played: [],
  inventory: [],
  listed: [],
};

class FakeUser extends EventEmitter {
  constructor() { super(); FakeUser.last = this; this.steamID = { getSteamID64: () => '7656' }; }
  logOn() {
    setImmediate(() => this.emit('steamGuard', null, (code) => {
      this.code = code;
      this.emit('refreshToken', 'tok-123');
      this.emit('loggedOn', {});
      this.emit('wallet', true, 1, 0);
      this.emit('webSession', 'sid', ['a=b']);
    }, false));
  }
  gamesPlayed(ids) { world.played.push([...ids]); }
  getPersonas(_ids, cb) { cb(null, { 7656: { player_name: 'tomikav', avatar_url_full: 'x' } }); }
  webLogOn() {}
  logOff() {}
}
FakeUser.EPersonaState = { Invisible: 7 };

const badgeRow = (id, g) => `<div class="badge_row is_link">
  <a class="badge_row_overlay" href="https://steamcommunity.com/profiles/7656/gamecards/${id}/"></a>
  <div class="badge_title">${g.name}<span>View details</span></div>
  <div class="badge_title_stats_playtime">&nbsp;${g.hours} hrs on record</div>
  <span class="progress_info_bold">${g.drops ? g.drops + ' card drops remaining' : 'No card drops remaining'}</span></div>`;

class FakeCommunity extends EventEmitter {
  setCookies() {}
  getSessionID() { return 'sid'; }
  httpRequestGet(opts, cb) {
    const url = typeof opts === 'string' ? opts : opts.uri;
    if (url.includes('/badges/')) {
      return cb(null, { statusCode: 200 }, Object.entries(world.games).map(([id, g]) => badgeRow(id, g)).join(''));
    }
    const m = url.match(/gamecards\/(\d+)/);
    if (m) return cb(null, { statusCode: 200 }, badgeRow(m[1], world.games[m[1]]));
    if (url.includes('priceoverview')) return cb(null, { statusCode: 200 }, { success: true, lowest_price: '$0.12' });
    cb(new Error('url desconocida ' + url));
  }
  httpRequestPost(opts, cb) { world.listed.push(opts.form); cb(null, { statusCode: 200 }, { success: true }); }
  getUserInventoryContents(_id, _app, _ctx, _t, cb) { cb(null, world.inventory); }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-'));
const fakeElectron = {
  app: { getPath: () => tmp },
  safeStorage: { isEncryptionAvailable: () => false },
};
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === 'electron') return fakeElectron;
  if (req === 'steam-user') return FakeUser;
  if (req === 'steamcommunity') return FakeCommunity;
  return origLoad.call(this, req, ...rest);
};

const Farmer = require('../electron/steam/farmer');
const store = require('../electron/store');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const card = (assetid) => ({
  assetid, name: `Cromo ${assetid}`, market_hash_name: `10-Cromo ${assetid}`, marketable: true,
  tags: [{ category: 'item_class', internal_name: 'item_class_2' }],
});

test('flujo completo de farmeo', async (t) => {
  const f = new Farmer();
  t.after(() => { clearTimeout(f.timer); clearTimeout(f.newItemsTimer); });

  // login + Steam Guard
  f.login({ accountName: 'tomikav', password: 'x', remember: true });
  await wait(20);
  assert.equal(f.status, 'guard');
  f.submitGuard(' abcde ');
  assert.equal(FakeUser.last.code, 'abcde');
  await wait(50);
  assert.equal(store.loadToken().token, 'tok-123', 'guarda el token');
  assert.equal(f.account.name, 'tomikav');

  // autoStart -> fase solo con el juego que ya tiene horas
  assert.equal(f.status, 'farming');
  assert.equal(f.phase, 'solo');
  assert.deepEqual(world.played.at(-1), [10]);

  // cae un cromo
  world.games[10].drops = 2;
  await f.check();
  assert.equal(f.session.drops, 1);
  assert.ok(f.logs.some((l) => l.kind === 'drop'));

  // juegas en tu PC -> pausa; cierras -> retoma
  FakeUser.last.emit('playingState', true, 10);
  assert.equal(f.status, 'paused');
  assert.equal(f.timer, null);
  FakeUser.last.emit('playingState', false, 0);
  await wait(3300);
  assert.equal(f.status, 'farming');
  assert.deepEqual(world.played.at(-1), [10], 'reenvía gamesPlayed al retomar');

  // se acaban los cromos del juego 10 -> pasa a calentar el 20
  world.games[10].drops = 0;
  await f.check();
  await wait(20);
  assert.equal(f.phase, 'multi');
  assert.deepEqual(world.played.at(-1), [20]);
  assert.equal(f.session.drops, 3);

  // umbral 0 -> farmea solo de una
  f.setSettings({ hoursThreshold: 0 });
  await wait(20);
  assert.equal(f.phase, 'solo');

  // termina todo
  world.games[20].drops = 0;
  await f.check();
  await wait(20);
  assert.equal(f.status, 'done');
  assert.deepEqual(world.played.at(-1), []);
  assert.ok(f.stats.intervals.length >= 1, 'aprende intervalos');

  // la UI recibe un snapshot serializable
  assert.doesNotThrow(() => JSON.stringify(f.snapshot()));
  f.logout();
  assert.equal(store.loadToken(), null);
});

test('autoventa solo vende cromos nuevos', async () => {
  const market = require('../electron/steam/market');
  world.inventory = [card('1')];
  const known = new Set(['1']);
  world.inventory.push(card('2'));
  const r = await market.sellNewCards({
    community: new FakeCommunity(), steamID: '7656', currency: 1, known,
    settings: { sellMode: 'undercut', minSellCents: 0 }, log: () => {},
  });
  assert.equal(r.listed, 1);
  assert.equal(world.listed.at(-1).assetid, '2');
  assert.equal(world.listed.at(-1).price, market.sellerFromBuyer(11));
});

test('precios y comisiones', () => {
  const { parsePrice, sellerFromBuyer } = require('../electron/steam/market');
  assert.equal(parsePrice('COL$ 1.234,56'), 123456);
  assert.equal(parsePrice('$0.12 USD'), 12);
  assert.equal(parsePrice('0,05€'), 5);
  assert.equal(sellerFromBuyer(100), 88);
  assert.equal(sellerFromBuyer(3), 1);
});
