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
 const result=await importer('Army text',{reserveTokens:n=>reserved.push(n)});assert.equal(calls,2);assert.equal(reserved.length,2);assert.ok(reserved.every(n=>n>4000));assert.ok(payloads[1].input[0].content[0].text.includes('fixed blade is mandatory'));assert.equal(result.units[0].notes,'2x test laser');assert.equal(result.units[1].notes,'special item');assert.ok(result.warnings.includes('Missing Unknown'));
});
test('budget denied before comparison dispatch cannot trigger a second paid request',async()=>{
 let calls=0;const importer=createImporter({apiKey:'test',references:{lookup:async()=>({references:[],covered:new Set([0]),warnings:[]})},fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({name:'Army',faction:'space-marines',units:[{name:'Test',characters:[],notes:'item'}],warnings:[]})}]}]})};}});let reservation=0;await assert.rejects(importer('text',{reserveTokens:()=>{if(++reservation===2)throw Error('budget limit');}}),/budget limit/);assert.equal(calls,1);
});
