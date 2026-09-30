// Reports actual lore coverage; statistics are deliberately excluded.
const {names,canonicalFaction}=require('../factions');
const facts=require('../data/faction-facts.json').facts;
const target=120;
const rows=names.map(faction=>({faction,facts:new Set(facts.filter(f=>canonicalFaction(f.faction)===faction).map(f=>f.id)).size}));
const deficient=rows.filter(r=>r.facts<target);
console.table(rows.map(r=>({...r,minutes:r.facts*2,missingForMirror:Math.max(0,target-r.facts)})));
console.log(`Goal: ${target} distinct facts per faction, including mirror games; ${rows.length-deficient.length}/${rows.length} factions ready.`);
if(process.argv.includes('--require-four-hours')&&deficient.length)process.exitCode=1;
