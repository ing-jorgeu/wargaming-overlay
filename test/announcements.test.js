const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Announcements, buildPool, factionKey, DURATION, INTERVAL} = require('../announcements');
const catalog = require('../data/faction-facts.json').facts;
const count = (...factions) => catalog.filter(f=>factions.includes(f.faction)).length;
const layout = {left:{faction:'World Eaters',formation:'Purge the Foe'},right:{faction:'Necrons',formation:'Take and Hold'}};
const rate = {total:20,winRate:'60.00'};
const stats = {period:'3 Sep - 8 Sep 2026',fetchedAt:'2026-09-09T00:00:00Z',sourceUrl:'https://listhammer.info/stats',factions:[{faction:'World Eaters',...rate},{faction:'Necrons',...rate}],factionDetails:[{faction:'World Eaters',sourceUrl:'https://listhammer.info/factions/world-eaters',matchups:[{opponentFaction:'Necrons',...rate,avgDifferential:-3.2,differentialGames:20,goingFirst:{total:12,winRate:'58.33'}}]}],dispositions:{overall:[{disposition:'Purge the Foe',...rate}],matchups:[{disposition:'Purge the Foe',opponentDisposition:'Take and Hold',...rate}]}};
function setup(saved) {
  let time=100000, stored;
  const events=[];
  const engine = new Announcements({layout:()=>layout,stats:()=>stats,saved,now:()=>time,random:()=>0,save:s=>stored=JSON.parse(JSON.stringify(s)),emit:(...e)=>events.push(e)});
  return {engine,events,setTime:t=>time=t,stored:()=>stored};
}
test('all 28 selectable factions have short, sourced Spanish facts and unique IDs',()=>{
  const {names} = require('../factions');
  const factions = new Set(catalog.map(f=>f.faction));
  for(const name of names)assert.ok(count(name)>=20, name+' needs at least 20 approved facts');
  assert.deepEqual([...factions].sort(),[...names].sort());
  assert.equal(new Set(catalog.map(f=>f.id)).size,catalog.length);
  assert.equal(new Set(catalog.map(f=>f.text)).size,catalog.length);
  for(const f of catalog){assert.ok(f.text.length<=280);assert.match(f.sourceUrl,/^https:\/\/(www\.warhammer-community\.com|wh40k\.lexicanum\.com)\//);assert.ok(names.includes(f.faction));}

});
test('pool only includes selected factions, actual matchup and explicitly global dispositions',()=>{
  const pool=buildPool(layout,stats,{lore:true,meta:true});
  assert.equal(pool.filter(f=>f.kind==='lore').length,count('World Eaters','Necrons'));
  assert.ok(pool.some(f=>f.id.startsWith('meta:matchup:')&&f.text.includes('World Eaters')&&f.text.includes('Necrons')));
  assert.ok(pool.find(f=>f.id.startsWith('meta:differential:')).text.includes('menos'));
  assert.ok(pool.filter(f=>f.id.includes('disposition')).every(f=>f.text.includes('todas las facciones')));
  assert.ok(pool.filter(f=>f.kind==='meta').every(f=>f.footer.includes(stats.period)&&f.footer.includes('partidas')));
  assert.equal(factionKey('Space Marines (Astartes)'),factionKey('Space Marines'));
  assert.equal(factionKey('Imperial Agents'),factionKey('Agents of the Imperium'));
  assert.equal(factionKey('Genestealer Cult'),factionKey('Genestealer Cults'));
});
test('missing stats, zero samples and mirror matchups never invent percentages',()=>{
  assert.equal(buildPool(layout,null,{lore:true,meta:true}).length,count('World Eaters','Necrons'));
  const empty=structuredClone(stats);empty.factions.forEach(r=>r.total=0);empty.factionDetails[0].matchups[0].total=0;empty.dispositions={};
  assert.equal(buildPool(layout,empty,{lore:false,meta:true}).length,0);
  const mirror=buildPool({left:layout.left,right:layout.left},stats,{lore:true,meta:true});
  assert.equal(mirror.filter(f=>f.kind==='lore').length,count('World Eaters'));assert.ok(!mirror.some(f=>f.id.startsWith('meta:matchup:')));
  const small=structuredClone(stats);small.factionDetails[0].matchups[0].goingFirst.total=1;
  assert.ok(!buildPool(layout,small,{meta:true}).some(f=>f.id.startsWith('meta:first:')));
});
test('manual notices last 15 seconds, never consume facts, and share the automatic countdown',()=>{
  const {engine,setTime,stored}=setup();engine.configure({enabled:true});
  const first=engine.manual('Hola\n  mundo <b>texto</b>');assert.equal(first.text,'Hola mundo <b>texto</b>');
  assert.equal(first.expiresAt-first.startedAt,DURATION);assert.equal(stored().seen.length,0);
  setTime(110000);assert.equal(engine.current().remainingMs,5000);
  setTime(115000);assert.equal(engine.current(),null);
  assert.throws(()=>engine.manual(' '));assert.throws(()=>engine.manual('x'.repeat(281)));
});
test('automatic interval is two minutes, needs overlay audience and respects the toggle',()=>{
  const {engine,setTime,events}=setup();engine.configure({enabled:true});
  setTime(100000+INTERVAL-1);engine.tick(true);assert.equal(events.filter(e=>e[0]==='toast').length,0);
  setTime(100000+INTERVAL);engine.tick(false);assert.equal(engine.seen.size,0);
  setTime(100000+2*INTERVAL);engine.tick(true);assert.equal(engine.seen.size,1);
  engine.configure({enabled:false});setTime(100000+3*INTERVAL);engine.tick(true);assert.equal(engine.seen.size,1);
  engine.next();assert.equal(engine.seen.size,2);
});
test('each cycle is unique across restarts and exhaustion starts a new cycle',()=>{
  const {engine,stored}=setup();const total=engine.pool().length;
  const first=engine.next();const restored=setup(stored()).engine;
  const ids=[first.id,...Array.from({length:total-1},()=>restored.next().id)];
  assert.equal(new Set(ids).size,total);assert.equal(restored.status().remaining,0);
  assert.equal(restored.status().exhausted,true);
  const next=restored.next();assert.notEqual(next.id,ids.at(-1));assert.equal(restored.cycle,2);
  const cycle2=[next.id,...Array.from({length:total-1},()=>restored.next().id)];
  assert.equal(new Set(cycle2).size,total);assert.equal(restored.seen.size,total);
  restored.reset();assert.equal(restored.seen.size,0);assert.equal(restored.cycle,1);assert.equal(restored.current(),null);
});
test('disabling and re-enabling content does not reset the session history',()=>{
  const {engine}=setup();engine.configure({meta:false});const first=engine.next();engine.configure({meta:true,lore:false});engine.next();engine.configure({lore:true,meta:false});assert.notEqual(engine.next().id,first.id);
});

test('all configured names and source aliases match exactly, with no fuzzy crossover',()=>{
  const {names,alternateNames,canonicalFaction}=require('../factions');
  const sourceNames = names.map(name=>({
    'Space Marines':'Space Marines (Astartes)',
    'Agents of the Imperium':'Imperial Agents',
    'Genestealer Cults':'Genestealer Cult'
  }[name] || name));
  assert.equal(new Set(names.map(factionKey)).size,names.length);
  for(const name of names){
    assert.equal(canonicalFaction(name),name);
    assert.equal(canonicalFaction('  '+name.toUpperCase()+'  '),name);
    for(const alias of alternateNames[name] || []) assert.equal(canonicalFaction(alias),name);
  }
  for(const unknown of [null,undefined,'','Custom','Chaos','Marines','Space Marines Blue','Aeldari Test','Imperial','Daemons']) assert.equal(canonicalFaction(unknown),null);
  // Every ordered pair checks the selected perspective rather than assuming complementary rates.
  for(let i=0;i<names.length;i++) for(let j=0;j<names.length;j++) {
    const sampleStats={period:'test',factions:sourceNames.map((faction,k)=>({faction,total:100,winRate:k+1})),factionDetails:sourceNames.map((faction,k)=>({faction,matchups:sourceNames.map((opponentFaction,l)=>({opponentFaction,total:100,winRate:k*2+l/100}))}))};
    const selected={left:{faction:names[i]},right:{faction:names[j]}};
    const pool=buildPool(selected,sampleStats,{lore:true,meta:true});
    const expected=new Set([names[i],names[j]]);
    assert.ok(pool.filter(f=>f.kind==='lore').every(f=>expected.has(f.faction)));
    assert.equal(pool.filter(f=>f.id.startsWith('meta:overall:')).length,expected.size);
    const match=pool.find(f=>f.id.startsWith('meta:matchup:'));
    if(i===j) assert.equal(match,undefined);
    else {
      const percent=(i*2+j/100).toLocaleString('es-ES',{maximumFractionDigits:1})+' %';
      assert.equal(match.text,`En este cruce, ${names[i]} obtuvo un ${percent} de victorias frente a ${names[j]}.`);
    }
  }
  assert.deepEqual(buildPool({left:{faction:'Custom'},right:{faction:'unknown'}},stats,{lore:true,meta:true}),[]);
});
test('four-hour stream cycles automatically across reloads without adjacent repeats',()=>{
  let time=0, saved, ids=[];
  const options={layout:()=>({left:{faction:'Aeldari'},right:{faction:'Chaos Daemons'}}),stats:()=>null,now:()=>time,random:()=>0.37,save:s=>saved=structuredClone(s),emit:(event,toast)=>{if(event==='toast'&&toast)ids.push(toast.id);}};
  let engine=new Announcements(options);engine.configure({enabled:true,meta:false});
  const total=engine.pool().length;
  assert.equal(engine.status().fourHourReady,total>=120);
  for(let i=0;i<120;i++){time+=INTERVAL;engine.tick(true);if(i%13===0)engine=new Announcements({...options,saved});}
  assert.equal(ids.length,120);
  for(let i=0;i<ids.length;i+=total)assert.equal(new Set(ids.slice(i,i+total)).size,ids.slice(i,i+total).length);
  assert.ok(ids.every((id,i)=>i===0||id!==ids[i-1]));
  assert.equal(engine.cycle,Math.ceil(120/total));
});
test('Genestealer Cult alias vs Thousand Sons loads 52 audited lore facts plus available stats',()=>{
 const selected={left:{faction:'Genestealer Cult'},right:{faction:'Thousand sons'}};
 const snapshot={period:'test',factions:[{faction:'Genestealer Cults',...rate},{faction:'Thousand Sons',...rate}],factionDetails:[]};
 const pool=buildPool(selected,snapshot,{lore:true,meta:true});
 assert.equal(pool.filter(f=>f.kind==='lore').length,52);
 assert.equal(pool.filter(f=>f.kind==='meta').length,2);
});
test('single-item pools repeat and empty pools do not emit',()=>{
 const {engine,setTime,events}=setup();engine.configure({enabled:true});
 engine.pool=()=>[{id:'one',text:'Uno',weight:1}];engine.next();
 setTime(100000+INTERVAL);engine.tick(true);assert.equal(engine.cycle,2);assert.equal(engine.lastId,'one');
 engine.pool=()=>[];const before=events.length;setTime(100000+2*INTERVAL);engine.tick(true);
 assert.ok(events.slice(before).every(e=>e[0]!=='toast'));assert.throws(()=>engine.next(),/No hay datos/);
});
test('coverage is truthful for smaller and mirror pools, and unknown names are visible',()=>{
  const engine=new Announcements({layout:()=>({left:{faction:'Aeldari'},right:{faction:'Aeldari'}}),stats:()=>null});
  assert.equal(engine.status().remaining,count('Aeldari'));assert.equal(engine.status().fourHourReady,false);
  assert.equal(engine.status().remainingMinutes,count('Aeldari')*2);
  const unknown=new Announcements({layout:()=>({left:{faction:'unmapped'}}),stats:()=>null});
  assert.deepEqual(unknown.status().unmatchedFactions,['unmapped']);
});
