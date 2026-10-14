const {test}=require('node:test'),assert=require('node:assert/strict');
const {linkPlayers,validateUnits}=require('../rosters');
test('player identity survives edits, restarts, swaps and identical display names',()=>{
 let s=linkPlayers({left:{name:'A'},right:{name:'B'}});assert.notEqual(s.left.rosterId,s.right.rosterId);
 const restarted=linkPlayers(JSON.parse(JSON.stringify(s)),s);assert.deepEqual(restarted,s);
 const swapped=linkPlayers({left:{...s.right,name:'New B'},right:{...s.left,name:'New A'}},s);
 assert.equal(swapped.left.rosterId,s.right.rosterId);
 assert.equal(linkPlayers({left:{...swapped.left,name:'Same'},right:{...swapped.right,name:'Same'}},swapped).right.rosterId,s.left.rosterId);
});
test('roster validation bounds input, rejects duplicate IDs and keeps order and multiple characters',()=>{
 const unit={name:'Squad',enhancement:'Gift',characters:['Captain','Lieutenant'],notes:'Hold',deepStrike:true,destroyed:false};
 const clean=validateUnits([unit,{...unit,name:'Second'}]);assert.notEqual(clean[0].id,clean[1].id);assert.equal(clean[1].name,'Second');
 for(const bad of [[{...unit,name:''}],[{...unit,characters:'one'}],[{...unit,notes:'x'.repeat(161)}],[{...unit,deepStrike:'yes'}],[...Array(81)].map(()=>unit),[{...unit,id:'dup'},{...unit,id:'dup'}]])assert.throws(()=>validateUnits(bad));
 assert.deepEqual(validateUnits([]),[]);
});
test('only consecutive matching names group, preserving every individual unit and status',()=>{
 const {groupUnits}=require('../public/roster-view');
 const a={id:'a',name:'Rubric Marines',destroyed:true},b={id:'b',name:'rubric  marines',deepStrike:true},c={id:'c',name:'Rhino'},d={id:'d',name:'Rubric Marines'};
 const groups=groupUnits([a,b,c,d]);assert.deepEqual(groups.map(g=>g.units.map(u=>u.id)),[['a','b'],['c'],['d']]);assert.equal(groups[0].units[0].destroyed,true);assert.equal(groups[0].units[1].deepStrike,true);
 assert.deepEqual(groupUnits([]),[]);
});
test('background accepts optional HTTP(S) image URLs, rejects scripts and embedded credentials',()=>{
 const {validateBackground}=require('../rosters');assert.equal(validateBackground(''),'');assert.equal(validateBackground('https://example.com/bg.jpg'),'https://example.com/bg.jpg');
 for(const value of ['javascript:alert(1)','file:///private/file','data:image/png;base64,xxx','https://user:secret@example.com/image',42])assert.throws(()=>validateBackground(value));
});

test('battleshocked is optional for old lists, preserves true and rejects invalid values',()=>{
 const unit={name:'Squad',characters:[],deepStrike:false,destroyed:false};
 assert.equal(validateUnits([unit])[0].battleshocked,false);
 assert.equal(validateUnits([{...unit,battleshocked:true}])[0].battleshocked,true);
 assert.throws(()=>validateUnits([{...unit,battleshocked:'yes'}]));
});
test('overlay status edits preserve list content and other units while allowing independent flags',()=>{
 const {updateUnitStatus}=require('../rosters');const roster={revision:4,name:'List',backgroundUrl:'https://example.com/bg',units:[{id:'a',name:'Squad',characters:['Captain'],notes:'note',destroyed:false,deepStrike:true,battleshocked:false},{id:'b',name:'Squad',destroyed:false}]};
 const next=updateUnitStatus(roster,'a',{battleshocked:true});assert.equal(next.revision,5);assert.equal(next.units[0].battleshocked,true);assert.equal(next.units[0].deepStrike,true);assert.equal(next.units[0].notes,'note');assert.equal(next.units[1],roster.units[1]);assert.equal(roster.units[0].battleshocked,false);assert.equal(next.name,roster.name);
 assert.equal(updateUnitStatus(next,'a',{battleshocked:false}).units[0].battleshocked,false);
 for(const bad of [{},{name:'different'},{destroyed:'true'},[]])assert.throws(()=>updateUnitStatus(roster,'a',bad));assert.throws(()=>updateUnitStatus(roster,'missing',{destroyed:true}));
});

test('default display order prioritizes epic characters, characters, led units and leaves vehicles last',()=>{
 const {sortUnits}=require('../public/roster-view');const units=[{name:'Tank',category:'vehicle',characters:[]},{name:'Troops',characters:[]},{name:'Captain',category:'character',characters:[]},{name:'Mortarion',category:'epic_character',characters:[]},{name:'Led squad',category:'unit',characters:['Leader','Support']},{name:'Monster',category:'monster',characters:[]},{name:'Second captain',category:'character',characters:[]}];
 assert.deepEqual(sortUnits(units).map(u=>u.name),['Mortarion','Captain','Second captain','Led squad','Troops','Tank','Monster']);assert.equal(units[0].name,'Tank');
 const valid={name:'Mortarion',category:'epic_character',characters:[],deepStrike:false,destroyed:false};assert.equal(validateUnits([valid])[0].category,'epic_character');assert.throws(()=>validateUnits([{...valid,category:'invalid'}]));
});

test('legacy Death Guard rosters without categories still follow the requested order',()=>{
 const {sortUnits}=require('../public/roster-view');const units=[{name:'Blightlord Terminators',characters:['Lord of Virulence']},{name:'Plague Marines',characters:['Malignant Plaguecaster','Biologus Putrifier']},{name:'Daemon Prince of Nurgle',characters:[]},{name:'Mortarion',characters:[]},{name:'Tallyman',characters:[]},{name:'Typhus',characters:[]},{name:'Chaos Rhino',characters:[]},{name:'Defiler',characters:[]},{name:'Poxwalkers',characters:[]}];
 assert.deepEqual(sortUnits(units).map(u=>u.name),['Mortarion','Typhus','Daemon Prince of Nurgle','Tallyman','Blightlord Terminators','Plague Marines','Poxwalkers','Chaos Rhino','Defiler']);
 assert.equal(validateUnits([{name:'Mortarion',characters:[],deepStrike:false,destroyed:false}])[0].category,'epic_character');
});
