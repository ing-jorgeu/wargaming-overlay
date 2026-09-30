const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {parseOverview, parseFaction, syncStats} = require('../listhammer');
const dates = '3 Sep - 8 Sep 2026';
const numbers = {wins: 2, losses: 1, total: 3, winRate: '66.67'};
function html(data, date = dates) {
  const flat = [];
  function encode(value) {
    if (value === undefined) return -1;
    const i = flat.length; flat.push(null);
    flat[i] = Array.isArray(value) ? value.map(encode) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k,v]) => [k, encode(v)])) : value;
    return i;
  }
  encode({data});
  return `<p>${date}</p><a href="/factions/world-eaters">World Eaters</a><script id="__NUXT_DATA__" type="application/json">${JSON.stringify(flat)}</script>`;
}
const overview = html({randomKey: {result: [{faction: 'World Eaters', ...numbers}]}, anotherKey: {overall: [{disposition:'Disruption', ...numbers}], matchups: [{disposition:'Disruption', opponentDisposition:'Reconnaissance', ...numbers}]}});
const faction = html({changedKey: {faction:'World Eaters', gameType:'40k', headline: numbers, overall: {...numbers, total: 30}, matchups:[{opponentFaction:'Necrons', ...numbers}], playerName:'must not persist'}, 'recentLists-test': {playerName:'private'}});
test('reads faction, disposition and directional matchup stats with period; excludes player data', () => {
  assert.equal(parseOverview(overview).dispositions.matchups[0].opponentDisposition, 'Reconnaissance');
  const result = parseFaction(faction, 'World Eaters', dates);
  assert.equal(result.matchups[0].winRate, '66.67');
  assert.equal(result.overall.total, 30);
  assert.equal(result.playerName, undefined);
  assert.throws(() => parseFaction(faction, 'World Eaters', 'other dates'));
  assert.throws(() => parseOverview('<html>Unavailable</html>'));
  assert.throws(() => parseOverview(overview.replace('66.67', 'invalid')));
});
test('saves a complete snapshot and retains it on network or inconsistent data failure', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'overlay-stats-'));
  t.after(() => fs.rm(directory, {recursive:true, force:true}));
  const options = {fetchPage: async url => url.endsWith('/stats') ? overview : faction, pause: async () => {}, log: () => {}};
  await syncStats(directory, options);
  const file = path.join(directory, 'listhammer-stats.json');
  const saved = await fs.readFile(file, 'utf8');
  assert.equal(JSON.parse(saved).factionDetails.length, 1);
  assert.ok(!saved.includes('playerName'));
  await assert.rejects(syncStats(directory, {...options, fetchPage: async url => {if (url.endsWith('/stats')) return overview; throw new Error('HTTP 429');}}), /429/);
  assert.equal(await fs.readFile(file, 'utf8'), saved);
  await assert.rejects(syncStats(directory, {...options, fetchPage: async url => url.endsWith('/stats') ? overview : faction.replace('66.67','50.00')}), /cambió/);
  assert.equal(await fs.readFile(file, 'utf8'), saved);
});
