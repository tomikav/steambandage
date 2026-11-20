// Lee la página de insignias para saber qué juegos tienen cromos pendientes.
const cheerio = require('cheerio');

function get(community, url) {
  return new Promise((resolve, reject) => {
    community.httpRequestGet(url, (err, res, body) => {
      if (err) return reject(err);
      if (res && res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
      if (typeof body === 'string' && /g_steamID = false/.test(body)) {
        return reject(new Error('Sesión web expirada'));
      }
      resolve(body);
    });
  });
}

const num = (txt) => {
  const m = String(txt || '').replace(/,/g, '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
};

function parseRows($) {
  const games = [];
  $('.badge_row').each((_, el) => {
    const row = $(el);
    const dropsTxt = row.find('.progress_info_bold').first().text();
    const drops = /card drops? remaining/i.test(dropsTxt) ? num(dropsTxt) : 0;
    if (!drops) return;

    const href = row.find('a.badge_row_overlay').attr('href') || '';
    const m = href.match(/gamecards\/(\d+)/);
    if (!m) return;
    const appid = parseInt(m[1], 10);

    const title = row.find('.badge_title').first().clone();
    title.find('*').remove(); // quita "View details"
    const name = title.text().replace(/\s+/g, ' ').trim() || `App ${appid}`;
    const hours = num(row.find('.badge_title_stats_playtime').text());

    games.push({ appid, name, drops, hours });
  });
  return games;
}

async function fetchAllBadges(community, steamID) {
  const base = `https://steamcommunity.com/profiles/${steamID}/badges/?l=english`;
  const first = await get(community, `${base}&p=1`);
  const $ = cheerio.load(first);
  let pages = 1;
  $('.pagelink').each((_, a) => { pages = Math.max(pages, parseInt($(a).text(), 10) || 1); });

  const games = parseRows($);
  for (let p = 2; p <= pages; p++) {
    const html = await get(community, `${base}&p=${p}`);
    games.push(...parseRows(cheerio.load(html)));
  }
  return games;
}

async function fetchGameDrops(community, steamID, appid) {
  const html = await get(community, `https://steamcommunity.com/profiles/${steamID}/gamecards/${appid}/?l=english`);
  const $ = cheerio.load(html);
  const txt = $('.progress_info_bold').first().text();
  return /card drops? remaining/i.test(txt) ? num(txt) : 0;
}

module.exports = { fetchAllBadges, fetchGameDrops, get };
