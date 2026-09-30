const {randomUUID} = require('node:crypto');
const catalog = require('./data/faction-facts.json').facts;
const DURATION = 15000;
const INTERVAL = 120000;
const key = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const {factionKey, canonicalFaction} = require('./factions');
function validRate(row) {
  return row && Number.isInteger(row.total) && row.total > 0 && row.winRate != null && row.winRate !== '' && Number.isFinite(Number(row.winRate)) && Number(row.winRate) >= 0 && Number(row.winRate) <= 100;
}
const percent = n => Number(n).toLocaleString('es-ES', {maximumFractionDigits:1}) + ' %';
const sample = n => `${n} partidas${n < 10 ? ' · muestra pequeña' : ''}`;
function buildPool(layout, stats, settings) {
  const players = [layout?.left, layout?.right].filter(p => canonicalFaction(p?.faction)).map(p=>({...p,faction:canonicalFaction(p.faction)}));
  const selected = new Set(players.map(p => factionKey(p.faction)));
  const pool = settings.lore ? catalog.filter(f => selected.has(factionKey(f.faction))).map(f => ({...f, kind:'lore', weight:2, title:'¿Sabías qué?:', footer:f.sourceTitle})) : [];
  if (!settings.meta || !stats?.period || !Array.isArray(stats.factions) || !Array.isArray(stats.factionDetails)) return pool;
  const sourceDate = /^\d{4}-\d{2}-\d{2}/.exec(stats.fetchedAt || '')?.[0];
  const footer = `Listhammer · ${stats.period}${sourceDate ? ' · copia ' + sourceDate : ''}`;
  function add(id, text, row, sourceUrl, weight = 1) {
    if (!validRate(row)) return;
    pool.push({id:'meta:'+id, kind:'meta', title:'¿Sabías qué?:', text, footer:footer+' · '+sample(row.total), sourceTitle:'Listhammer', sourceUrl:sourceUrl || stats.sourceUrl, weight});
  }
  for (const id of selected) {
    const row = stats.factions.find(f => factionKey(f.faction) === id);
    if (validRate(row)) add('overall:'+id, `${canonicalFaction(row.faction)} registra un ${percent(row.winRate)} de victorias en el período de Listhammer.`, row, row.sourceUrl);
  }
  if (players.length === 2) {
    const [left, right] = players;
    const a = factionKey(left.faction), b = factionKey(right.faction);
    const detail = stats.factionDetails.find(f => factionKey(f.faction) === a);
    const matchup = detail?.matchups?.find(m => factionKey(m.opponentFaction) === b);
    // A mirrored matchup is omitted by the source, never inferred as 50%.
    if (a !== b && validRate(matchup)) {
      const pair = [a,b].sort().join(':');
      add('matchup:'+pair, `En este cruce, ${left.faction} obtuvo un ${percent(matchup.winRate)} de victorias frente a ${right.faction}.`, matchup, detail.sourceUrl, 4);
      if (Number.isFinite(matchup.avgDifferential) && matchup.differentialGames >= 10) {
        const diff = matchup.avgDifferential;
        const value = Math.abs(diff).toLocaleString('es-ES',{maximumFractionDigits:1});
        add('differential:'+pair, `${left.faction} promedió ${value} puntos ${diff < 0 ? 'menos' : 'más'} que ${right.faction} en sus enfrentamientos.`, {...matchup,total:matchup.differentialGames}, detail.sourceUrl, 3);
      }
      if (validRate(matchup.goingFirst) && matchup.goingFirst.total >= 10) {
        add('first:'+a+':'+b, `Cuando jugó primero, ${left.faction} ganó el ${percent(matchup.goingFirst.winRate)} de sus partidas contra ${right.faction}.`, matchup.goingFirst, detail.sourceUrl, 3);
      }
      // Also retain the other faction's first-turn record when the source has a sufficient sample.
      const reverse = stats.factionDetails.find(f => factionKey(f.faction) === b);
      const first = reverse?.matchups?.find(m => factionKey(m.opponentFaction) === a)?.goingFirst;
      if (validRate(first) && first.total >= 10) add('first:'+b+':'+a, `Cuando jugó primero, ${right.faction} ganó el ${percent(first.winRate)} de sus partidas contra ${left.faction}.`, first, reverse.sourceUrl, 3);
    }
    const formations = [...new Set(players.map(p => p.formation || 'Take and Hold'))];
    for (const formation of formations) {
      const row = stats.dispositions?.overall?.find(r => r.disposition === formation);
      if (validRate(row)) add('disposition:'+key(formation), `La disposición ${formation} registra un ${percent(row.winRate)} de victorias entre todas las facciones.`, row);
    }
    if (formations.length === 2) {
      const row = stats.dispositions?.matchups?.find(r => r.disposition === formations[0] && r.opponentDisposition === formations[1]);
      if (validRate(row)) add('dispositions:'+formations.map(key).sort().join(':'), `${formations[0]} obtuvo un ${percent(row.winRate)} de victorias contra ${formations[1]}, contando todas las facciones.`, row, null, 2);
    }
  }
  return pool;
}
class Announcements {
  constructor({layout, stats, saved = {}, save = () => {}, emit = () => {}, now = Date.now, random = Math.random}) {
    Object.assign(this, {layout, stats, save, emit, now, random});
    this.settings = {enabled: saved.settings?.enabled === true, lore:saved.settings?.lore !== false, meta:saved.settings?.meta !== false};
    this.seen = new Set(Array.isArray(saved.seen) ? saved.seen.filter(s => typeof s === 'string') : []);
    this.lastId = saved.lastId || null;
    this.sessionId = saved.sessionId || randomUUID();
    this.cycle = Number.isInteger(saved.cycle) && saved.cycle > 0 ? saved.cycle : 1;
    this.active = null;
    this.nextAt = this.settings.enabled ? now() + INTERVAL : null;
  }
  pool() { return buildPool(this.layout(), this.stats(), this.settings); }
  persist() { this.save({schemaVersion:1,sessionId:this.sessionId,settings:this.settings,seen:[...this.seen],lastId:this.lastId,cycle:this.cycle}); }
  status() {
    const pool = this.pool();
    const remaining = pool.filter(f=>!this.seen.has(f.id)).length;
    const selected = [this.layout()?.left?.faction, this.layout()?.right?.faction].filter(Boolean);
    const unmatchedFactions = [...new Set(selected.filter(name=>!canonicalFaction(name)))];
    return {unmatchedFactions, exhausted:pool.length > 0 && remaining === 0, cyclic:true, loreTotal:pool.filter(f=>f.kind==='lore').length, metaTotal:pool.filter(f=>f.kind==='meta').length, fourHourReady:remaining >= 120, settings:this.settings,sessionId:this.sessionId,cycle:this.cycle,total:pool.length,remaining:pool.filter(f=>!this.seen.has(f.id)).length,coverageMinutes:pool.length*INTERVAL/60000,remainingMinutes:pool.filter(f=>!this.seen.has(f.id)).length*INTERVAL/60000,nextAt:this.nextAt,active:this.current(),statsAvailable:!!this.stats()?.factions?.length};
  }
  current() { return this.active?.expiresAt > this.now() ? {...this.active,remainingMs:this.active.expiresAt-this.now()} : null; }
  refresh() { this.emit('status',this.status()); }
  configure(input) {
    if (!input || typeof input !== 'object' || Object.keys(input).some(k => !['enabled','lore','meta'].includes(k) || typeof input[k] !== 'boolean')) throw new Error('Configuración de mensajes no válida.');
    const enabled = this.settings.enabled;
    this.settings = {...this.settings,...input};
    if (this.settings.enabled && !this.settings.lore && !this.settings.meta) { this.settings.enabled = false; }
    if (enabled !== this.settings.enabled) this.nextAt = this.settings.enabled ? this.now()+INTERVAL : null;
    this.persist(); this.refresh();
  }
  show(item) {
    const now = this.now();
    this.active = {...item,token:randomUUID(),startedAt:now,expiresAt:now+DURATION};
    if (this.settings.enabled) this.nextAt = now+INTERVAL;
    this.emit('toast',this.current()); this.refresh();
    return this.current();
  }
  manual(text) {
    if (typeof text !== 'string' || !text.trim() || text.trim().length > 280) throw new Error('Escribe un mensaje de 1 a 280 caracteres.');
    return this.show({kind:'manual',title:'EN DIRECTO',text:text.trim().replace(/\s+/g, ' '),footer:''});
  }
  next() {
    const pool = this.pool();
    if (!pool.length) throw new Error('No hay datos disponibles para estas facciones y opciones. Activa curiosidades o estadísticas y guarda las facciones del encuentro.');
    let choices = pool.filter(f=>!this.seen.has(f.id));
    if (!choices.length) {
      // Start another pass through the current pool, retaining history for other matchups.
      for (const item of pool) this.seen.delete(item.id);
      this.cycle += 1;
      choices = pool.length > 1 ? pool.filter(f=>f.id !== this.lastId) : pool;
    }
    let draw = this.random()*choices.reduce((sum,f)=>sum+f.weight,0);
    const chosen = choices.find(f=>(draw-=f.weight)<0) || choices.at(-1);
    this.seen.add(chosen.id); this.lastId = chosen.id;
    this.persist();
    return this.show(chosen);
  }
  tick(hasAudience) {
    if (!this.settings.enabled || this.now() < this.nextAt) return;
    this.nextAt = this.now()+INTERVAL;
    if (hasAudience && !this.current() && this.pool().length > 0) this.next();
    else this.refresh();
  }
  reset() {
    this.seen.clear(); this.lastId=null; this.cycle=1; this.sessionId=randomUUID();
    this.active=null; this.nextAt=this.settings.enabled ? this.now()+INTERVAL : null;
    this.persist(); this.emit('toast',null); this.refresh();
  }
}
module.exports = {Announcements,buildPool,factionKey,DURATION,INTERVAL};
