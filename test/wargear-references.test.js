const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {createReferences,extractSheet,checkedURL,TTL}=require('../remote-lists/references');const {createImporter}=require('../remote-lists/importer');
const root='https://wahapedia.ru/wh40k11ed/factions/space-marines/';
const sheet='<title>Test Squad [11th edition]</title><div>WARGEAR OPTIONS</div><div>Each model may choose a test laser instead of its base rifle.</div><div>ABILITIES</div><div>irrelevant</div><div>UNIT COMPOSITION</div><div>Every model is equipped with: base rifle; fixed blade.</div><div>KEYWORDS</div>';
const index='<title>Space Marines [11th edition]</title><a href="Test-Squad">Test Squad</a>';
async function dir(t){const d=await fs.mkdtemp(path.join(os.tmpdir(),'ref-11-'));t.after(()=>fs.rm(d,{recursive:true,force:true}));return d;}
test('reference cache lasts exactly seven days; an expired source is never served on refresh failure',async t=>{
 let time=1000,calls=0,broken=false;const cacheDir=await dir(t);const refs=createReferences({cacheDir,now:()=>time,fetchImpl:async()=>{calls++;return new Response(broken?'unavailable':sheet,{status:broken?503:200});}});
 await refs.readPage(root+'Test-Squad','sheet');time+=TTL-1;await refs.readPage(root+'Test-Squad','sheet');assert.equal(calls,1);time++;await refs.readPage(root+'Test-Squad','sheet');assert.equal(calls,2);
 time+=TTL;broken=true;await assert.rejects(refs.readPage(root+'Test-Squad','sheet'));assert.equal((await fs.readdir(cacheDir)).filter(x=>x.endsWith('.json')).length,0);
});
test('11th-edition reference extraction and redirects reject old editions and external URLs',async t=>{
 assert.ok(extractSheet(sheet,root+'Test-Squad').text.includes('base rifle'));assert.ok(!extractSheet(sheet,root+'Test-Squad').text.includes('irrelevant'));
 assert.throws(()=>extractSheet(sheet.replace('11th','10th'),root+'Test-Squad'));
 for(const url of ['http://wahapedia.ru/wh40k11ed/factions/space-marines/Test-Squad','https://wahapedia.ru/wh40k10ed/factions/space-marines/Test-Squad','https://evil.example/wh40k11ed/factions/space-marines/Test-Squad'])assert.throws(()=>checkedURL(url));
 const refs=createReferences({cacheDir:await dir(t),fetchImpl:async()=>new Response(null,{status:302,headers:{Location:'https://wahapedia.ru/wh40k10ed/factions/space-marines/Test-Squad'}})});await assert.rejects(refs.readPage(root+'Test-Squad','sheet'));
});
test('faction index resolves exact canonical names, deduplicates repeated units and warns on missing matches',async t=>{
 let calls=0;const refs=createReferences({cacheDir:await dir(t),fetchImpl:async url=>{calls++;return new Response(url===root?index:sheet);}});
 const result=await refs.lookup('space-marines',[{name:'Escuadra',referenceName:'Test Squad'},{name:'Test Squad'},{name:'Unknown'}]);assert.equal(calls,2);assert.equal(result.references.length,1);assert.deepEqual([...result.covered],[0,1]);assert.ok(result.warnings[0].includes('Unknown'));
});
test('second LLM pass summarizes options, preserves quantities and charges reference context before dispatch',async()=>{
 let calls=0;const reserved=[],payloads=[];const raw={name:'Army',faction:'space-marines',warnings:[],units:[{name:'Test Squad',referenceName:'Test Squad',wargear:['2x test laser','2x fixed blade'],characters:[],enhancement:'',notes:'2x test laser; 2x fixed blade'},{name:'Unknown',referenceName:'Unknown',wargear:['special item'],characters:[],enhancement:'',notes:'special item'}]};
 const importer=createImporter({apiKey:'test',references:{lookup:async()=>({references:[{indices:[0],sheet:{text:'test laser is optional; fixed blade is mandatory'}}],covered:new Set([0]),warnings:['Missing Unknown']})},fetchImpl:async(url,opts)=>{payloads.push(JSON.parse(opts.body));const value=calls++===0?raw:{summaries:[{index:0,notes:'2x test laser',warning:''}]};return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};}});
 const result=await importer('Army text',{reserveTokens:n=>reserved.push(n)});assert.equal(calls,2);assert.equal(reserved.length,2);assert.ok(reserved.every(n=>n>4000));assert.ok(payloads[1].input[0].content[0].text.includes('fixed blade is mandatory'));assert.equal(result.units[0].notes,'2× test laser');assert.equal(result.units[1].notes,'');assert.ok(result.warnings.includes('Missing Unknown'));
});
test('budget denied before comparison dispatch cannot trigger a second paid request',async()=>{
 let calls=0;const importer=createImporter({apiKey:'test',references:{lookup:async()=>({references:[],covered:new Set([0]),warnings:[]})},fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({name:'Army',faction:'space-marines',units:[{name:'Test',characters:[],notes:'item'}],warnings:[]})}]}]})};}});let reservation=0;await assert.rejects(importer('text',{reserveTokens:()=>{if(++reservation===2)throw Error('budget limit');}}),/budget limit/);assert.equal(calls,1);
});

test('fixed equipment sheets without WARGEAR OPTIONS are valid and need no paid comparison',async()=>{
 const html='<title>Belisarius Cawl [11th edition]</title><div>UNIT COMPOSITION</div><div>1 Belisarius Cawl</div><div>This model is equipped with: solar atomiser; arc scourge; axe; mechadendrite hive.</div><div>YOUR UNIT COSTS</div><div>220</div><div>KEYWORDS</div>';
 const fixed=extractSheet(html,'https://wahapedia.ru/wh40k11ed/factions/adeptus-mechanicus/Belisarius-Cawl');assert.equal(fixed.hasOptions,false);assert.ok(!fixed.text.includes('220'));
 let calls=0;const raw={name:'Army',faction:'adeptus-mechanicus',warnings:[],units:[{name:'Belisarius Cawl',characters:[],notes:'1× Solar atomiser',wargear:['1× Solar atomiser']},{name:'Kastelan Robots',characters:[],notes:'4× Incendine combustor',wargear:['4× Incendine combustor']}]};
 const importer=createImporter({apiKey:'test',references:{lookup:async()=>({covered:new Set([0,1]),warnings:[],references:[{indices:[0],sheet:fixed},{indices:[1],sheet:{hasOptions:true,text:'Incendine combustor can replace phosphor blaster.'}}]})},fetchImpl:async(_,opts)=>{const payload=JSON.parse(opts.body);if(calls===1){const input=JSON.parse(payload.input[0].content[0].text);assert.deepEqual(input.units.map(u=>u.index),[1]);}const value=calls++===0?raw:{summaries:[{index:1,notes:'4× Incendine combustor',warning:''}]};return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};}});
 const result=await importer('Army');assert.equal(result.units[0].notes,'');assert.equal(result.units[1].notes,'4× Incendine combustor');assert.equal(calls,2);
 const onlyFixed=createImporter({apiKey:'test',references:{lookup:async()=>({covered:new Set([0]),warnings:[],references:[{indices:[0],sheet:fixed}]})},fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({...raw,units:[raw.units[0]]})}]}]})};}});assert.equal((await onlyFixed('Army')).units[0].notes,'');assert.equal(calls,3);
});

test('duplicate weapon lines sum correctly and distinct model qualifiers remain separate',()=>{
 const {aggregateWargear,correctQuantities}=require('../remote-lists/importer');
 assert.deepEqual(aggregateWargear(['1x Heavy reaper autocannon','1x Heavy reaper autocannon']),['2× Heavy reaper autocannon']);
 assert.deepEqual(aggregateWargear(['1x Plasma gun (Champion)','2x Plasma gun (Marines)']),['1× Plasma gun (Champion)','2× Plasma gun (Marines)']);
 assert.equal(correctQuantities('1 heavy reaper autocannon',['1x Heavy reaper autocannon','1x Heavy reaper autocannon']),'2× heavy reaper autocannon');
});
test('Defiler comparison receives every declared choice and corrects an underestimated duplicate count',async()=>{
 let calls=0;const raw={name:'Army',faction:'death-guard',units:[{name:'Defiler',characters:[],wargear:['2x Excruciator cannon','1x Hades battle cannon','1x Heavy reaper autocannon','1x Heavy reaper autocannon','1x Shearing claws'],notes:''}],warnings:[]};
 const importer=createImporter({apiKey:'test',references:{lookup:async()=>({covered:new Set([0]),warnings:[],references:[{indices:[0],sheet:{hasOptions:true,text:'WARGEAR OPTIONS: Hades battle cannon can be replaced; excruciator cannons can be replaced; heavy reaper autocannon can replace heavy baleflamer or heavy missile launcher.'}}]})},fetchImpl:async(_,opts)=>{const payload=JSON.parse(opts.body);if(calls===1){const input=JSON.parse(payload.input[0].content[0].text);assert.ok(input.units[0].wargear.includes('2× Heavy reaper autocannon'));assert.equal(input.originalText,'original export');assert.match(payload.instructions,/TODAS/);}const value=calls++===0?raw:{summaries:[{index:0,notes:'2 Excruciator cannon\n1 Hades battle cannon\n1 Heavy reaper autocannon',warning:''}]};return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};}});
 const result=await importer('original export');assert.equal(result.units[0].notes,'2× Excruciator cannon\n1× Hades battle cannon\n2× Heavy reaper autocannon');assert.ok(!result.units[0].notes.includes('Shearing'));
});

test('verified keywords prioritize epic heroes over monster and character keywords',()=>{
 const html='<title>Mortarion [11th edition]</title><div>UNIT COMPOSITION</div><div>This model is equipped with: Silence.</div><div>KEYWORDS: MONSTER; CHARACTER; EPIC HERO; MORTARION</div><div>FACTION KEYWORDS: DEATH GUARD</div>';
 assert.equal(extractSheet(html,'https://wahapedia.ru/wh40k11ed/factions/death-guard/Mortarion').category,'epic_character');
 assert.equal(extractSheet(html.replace('EPIC HERO;',''),'https://wahapedia.ru/wh40k11ed/factions/death-guard/Mortarion').category,'character');
});
