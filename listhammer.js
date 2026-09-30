const fs = require('node:fs/promises');
const path = require('node:path');
const {setTimeout: delay} = require('node:timers/promises');
const ORIGIN = 'https://listhammer.info';

// Decode only JSON reference data; never execute scripts from the source page.
function pageData(html) {
  const script = html.match(/<script\b[^>]*\bid=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!script) throw new Error('Listhammer cambió de formato: faltan los datos de la página.');
  const values = JSON.parse(script[1]);
  const active = new Set();
  function decode(index, depth = 0) {
    if (index === -1) return null;
    if (!Number.isInteger(index) || index < 0 || index >= values.length || depth > 80 || active.has(index)) throw new Error('Referencias de Listhammer no válidas.');
    active.add(index);
    const value = values[index];
    let result = value;
    if (Array.isArray(value)) {
      if (typeof value[0] === 'string') {
        if (!['ShallowReactive', 'Reactive', 'Ref', 'ShallowRef'].includes(value[0])) throw new Error('Formato de Listhammer no compatible.');
        result = decode(value[1], depth + 1);
      } else result = value.map(i => decode(i, depth + 1));
    } else if (value && typeof value === 'object') {
      result = Object.fromEntries(Object.entries(value).map(([key, i]) => [key, decode(i, depth + 1)]));
    }
    active.delete(index);
    return result;
  }
  let root = values[0];
  if (Array.isArray(root)) root = values[root[1]];
  let data = values[root.data];
  if (Array.isArray(data)) data = values[data[1]];
  // Recent lists contain player information and are deliberately excluded.
  return Object.entries(data).filter(([key]) => !key.startsWith('recentLists')).map(([, i]) => decode(i));
}
function period(html) {
  const value = html.match(/>\s*(\d{1,2} [A-Z][a-z]{2} - \d{1,2} [A-Z][a-z]{2} \d{4})\s*</);
  if (!value) throw new Error('No se pudo identificar el período de Listhammer.');
  return value[1];
}
function normalize(name) {
  return name.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/\(Astartes\)/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function checkRows(rows, key) {
  if (!Array.isArray(rows) || rows.some(r => !r || typeof r[key] !== 'string' || !Number.isFinite(r.total) || r.total < 0 || !Number.isFinite(Number(r.winRate)) || Number(r.winRate) < 0 || Number(r.winRate) > 100)) throw new Error('Tabla de estadísticas de Listhammer no válida.');
  return rows;
}
function parseOverview(html) {
  const data = pageData(html);
  const factions = data.find(d => Array.isArray(d?.result) && d.result[0]?.faction)?.result;
  const dispositions = data.find(d => Array.isArray(d?.overall) && d.overall[0]?.disposition);
  if (!factions?.length || !dispositions?.overall?.length) throw new Error('Faltan tablas de facciones o disposiciones.');
  checkRows(factions, 'faction'); checkRows(dispositions.overall, 'disposition'); checkRows(dispositions.matchups, 'opponentDisposition');
  const links = new Map();
  for (const match of html.matchAll(/<a\b[^>]*href="(\/factions\/[a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const label = match[2].replace(/<[^>]*>/g, '').trim();
    links.set(normalize(label), match[1]);
  }
  return {period: period(html), factions: factions.map(row => {
    const link = links.get(normalize(row.faction));
    if (!link) throw new Error(`Falta el enlace de ${row.faction}.`);
    return {...row, sourceUrl: ORIGIN + link};
  }), dispositions: {overall: dispositions.overall, matchups: dispositions.matchups}};
}
function parseFaction(html, expectedName, expectedPeriod) {
  const data = pageData(html).find(d => d?.faction === expectedName && d.gameType === '40k' && d.headline);
  if (!data || period(html) !== expectedPeriod) throw new Error(`Datos o período incompatibles para ${expectedName}.`);
  checkRows(data.matchups, 'opponentFaction');
  // Explicit allowlist avoids storing player names, lists or identifiers.
  return Object.fromEntries(['faction', 'headline', 'overall', 'players', 'undefeated', 'xMinus1', 'overrep', 'eventWins', 'eventCount', 'weekly', 'matchups', 'dispositions', 'detachments'].filter(k => k in data).map(k => [k, data[k]]));
}
async function download(url) {
  const response = await fetch(url, {signal: AbortSignal.timeout(20000), redirect: 'error', headers: {'User-Agent': 'wargaming-overlay (local statistics cache)', Accept: 'text/html'}});
  if (!response.ok) throw new Error(`Listhammer respondió HTTP ${response.status} (${url}).`);
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) throw new Error('La página de Listhammer supera el tamaño permitido.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function syncStats(dataDir, {fetchPage = download, pause = () => delay(250), log = console.log} = {}) {
  const destination = path.join(dataDir, 'listhammer-stats.json');
  log('Listhammer: descargando estadísticas en segundo plano…');
  const overview = parseOverview(await fetchPage(ORIGIN + '/stats'));
  const details = [];
  for (const row of overview.factions) {
    await pause();
    const detail = parseFaction(await fetchPage(row.sourceUrl), row.faction, overview.period);
    for (const key of ['wins', 'losses', 'total', 'winRate']) {
      if (Number(detail.headline[key]) !== Number(row[key])) throw new Error(`Listhammer cambió durante la descarga (${row.faction}). Reintenta al iniciar de nuevo.`);
    }
    details.push({...detail, sourceUrl: row.sourceUrl});
  }
  const snapshot = {schemaVersion: 1, sourceUrl: ORIGIN + '/stats', fetchedAt: new Date().toISOString(), selection: {window: 'This Weekend', period: overview.period, includeRTTs: false, gameType: '40k', edition: 11, points: 2000, minimumRounds: 5, minimumPlayers: 16, mirrorMatchesExcluded: true}, ...overview, factionDetails: details};
  await fs.mkdir(dataDir, {recursive: true});
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n');
    await fs.rename(temporary, destination);
  } finally { await fs.rm(temporary, {force: true}); }
  log(`Listhammer: ${details.length} facciones y ${overview.dispositions.overall.length} disposiciones guardadas en ${destination}`);
  return snapshot;
}
module.exports = {pageData, parseOverview, parseFaction, syncStats};
