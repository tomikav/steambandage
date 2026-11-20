// Autoventa de cromos (opcional, apagada por defecto).
// Los listados quedan pendientes de confirmar en la app móvil de Steam (o por correo).

const STEAM_APP = 753;
const CARD_CONTEXT = 6;

// Comisiones del mercado: Steam 5% + juego 10%, mínimo 1 centavo cada una.
function fees(seller) {
  return Math.max(Math.floor(seller * 0.05), 1) + Math.max(Math.floor(seller * 0.10), 1);
}
// Dado lo que paga el comprador, lo máximo que recibe el vendedor.
function sellerFromBuyer(buyer) {
  let s = Math.max(Math.floor(buyer / 1.15), 1);
  while (s > 1 && s + fees(s) > buyer) s--;
  while (s + 1 + fees(s + 1) <= buyer) s++;
  return s;
}

// "COL$ 1.234,56" / "$0.12 USD" / "0,05€" -> centavos
function parsePrice(str) {
  if (!str) return 0;
  const clean = String(str).replace(/[^\d.,]/g, '');
  if (!clean) return 0;
  const lastSep = Math.max(clean.lastIndexOf('.'), clean.lastIndexOf(','));
  let intPart = clean, dec = '00';
  if (lastSep !== -1 && clean.length - lastSep - 1 === 2) {
    intPart = clean.slice(0, lastSep);
    dec = clean.slice(lastSep + 1);
  }
  return parseInt(intPart.replace(/[.,]/g, '') || '0', 10) * 100 + parseInt(dec, 10);
}

const isCard = (item) =>
  (item.tags || []).some((t) => t.category === 'item_class' && t.internal_name === 'item_class_2');

function getCards(community, steamID) {
  return new Promise((resolve, reject) => {
    community.getUserInventoryContents(steamID, STEAM_APP, CARD_CONTEXT, true, (err, inv) => {
      if (err) return reject(err);
      resolve((inv || []).filter((i) => isCard(i) && i.marketable));
    });
  });
}

function lowestPrice(community, currency, hashName) {
  const url = `https://steamcommunity.com/market/priceoverview/?appid=${STEAM_APP}&currency=${currency}` +
    `&market_hash_name=${encodeURIComponent(hashName)}`;
  return new Promise((resolve, reject) => {
    community.httpRequestGet({ uri: url, json: true }, (err, _res, body) => {
      if (err) return reject(err);
      if (!body || !body.success) return reject(new Error('Sin precio en el mercado'));
      resolve(parsePrice(body.lowest_price || body.median_price));
    });
  });
}

function sellItem(community, steamID, assetid, sellerCents) {
  return new Promise((resolve, reject) => {
    community.httpRequestPost({
      uri: 'https://steamcommunity.com/market/sellitem/',
      headers: { Referer: `https://steamcommunity.com/profiles/${steamID}/inventory/` },
      form: {
        sessionid: community.getSessionID(),
        appid: STEAM_APP, contextid: CARD_CONTEXT, assetid, amount: 1, price: sellerCents,
      },
      json: true,
    }, (err, _res, body) => {
      if (err) return reject(err);
      if (!body || !body.success) return reject(new Error(body && body.message ? body.message : 'Steam rechazó la venta'));
      resolve(body);
    });
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Vende las cartas nuevas (asset ids que no estaban en `known`). Devuelve resumen. */
async function sellNewCards({ community, steamID, currency, known, settings, log }) {
  const cards = await getCards(community, steamID);
  const fresh = cards.filter((c) => !known.has(String(c.assetid)));
  let listed = 0, cents = 0;
  for (const card of fresh) {
    known.add(String(card.assetid));
    try {
      const buyer = await lowestPrice(community, currency, card.market_hash_name);
      const target = settings.sellMode === 'undercut' ? buyer - 1 : buyer;
      if (target < 3) { log('sell', `${card.name}: muy barata, no se lista`); continue; }
      const seller = sellerFromBuyer(target);
      if (seller < settings.minSellCents) { log('sell', `${card.name}: por debajo de tu mínimo`); continue; }
      await sellItem(community, steamID, card.assetid, seller);
      listed++; cents += seller;
      log('sell', `Listada ${card.name} → recibes ${(seller / 100).toFixed(2)}`);
    } catch (e) {
      log('warn', `No se pudo vender ${card.name}: ${e.message}`);
    }
    await wait(1500); // no saturar el mercado (rate limit)
  }
  return { listed, cents };
}

module.exports = { getCards, sellNewCards, sellerFromBuyer, parsePrice };
