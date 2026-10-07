const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mergeGame,emptyGame}=require('../game-store');
const read=(round,a={},b={})=>({connected:true,round,updatedAt:round,players:[{name:'A',score:20,...a},{name:'B',score:18,...b}]});
const missions={cp:3,primary:{score:10,max:45},secondary:{score:5,max:45},secondaries:[{name:'Pending',score:0,max:5},{name:'Scored',score:3,max:5}],primaryObjectives:[{name:'Hold',checked:true,counter:null},{name:'Count',checked:null,counter:3}]};
test('next round retains unscored cards and resets objectives for the offscreen player',()=>{
 const before=mergeGame(emptyGame(),read(1,missions,missions));
 let g=mergeGame(before,read(2,{primary:{score:12,max:45},primaryObjectives:[{name:'Hold',checked:true,counter:null}]}));
 assert.deepEqual(g.players[1].secondaries,[missions.secondaries[0]]);
 assert.deepEqual(g.players[1].primaryObjectives,[{name:'Hold',checked:false,counter:null},{name:'Count',checked:null,counter:0}]);
 assert.equal(g.players[1].primary.score,10);assert.equal(g.players[1].cp,3);
 assert.equal(g.players[0].primaryObjectives[0].checked,true);
 assert.equal(g.players[0].primaryObjectives[1].counter,0);
 assert.equal(before.players[1].primaryObjectives[0].checked,true);
 g=mergeGame(JSON.parse(JSON.stringify(g)),read(2,{}, {secondaries:[missions.secondaries[0]]}));
 assert.equal(g.half,null); // Rediscovering a carried card is not a draw.
 assert.equal(g.players[1].primaryObjectives[0].checked,false);
});
test('partial lists preserve unseen missions; complete secondary list removes discarded cards',()=>{
 let g=mergeGame(emptyGame(),read(1,missions));
 g=mergeGame(g,read(2,{secondaries:[{name:'New',score:0,max:5}]}));
 assert.deepEqual(g.players[0].secondaries.map(m=>m.name),['Pending','New']);
 g=mergeGame(g,read(2,{secondaries:[],secondariesComplete:true}));
 assert.deepEqual(g.players[0].secondaries,[]);
});
test('historical rounds, skipped rounds and different players do not inherit missions',()=>{
 const g=mergeGame(emptyGame(),read(3,missions,missions));
 for(const round of [1,5])assert.equal(mergeGame(g,read(round)).players[0].secondaries,null);
 const changed=read(4);changed.players[1].name='C';
 assert.equal(mergeGame(g,changed).players[0].primaryObjectives,null);
});
test('same-name primary conditions retain independent availability through partial reads',()=>{
 const a={name:'Control Central',details:'2VP | End of Your Turn',enabled:true};
 const b={name:'Control Central',details:'8VP | End of Command Phase',enabled:false};
 let g=mergeGame(emptyGame(),read(1,{primaryObjectives:[a,b]}));
 g=mergeGame(g,read(1,{primaryObjectives:[{...b,enabled:true}]}));
 assert.deepEqual(g.players[0].primaryObjectives,[a,{...b,enabled:true}]);
 g=mergeGame(g,read(1,{primaryObjectives:[{...a,enabled:false}]}));
 assert.equal(g.players[0].primaryObjectives[0].enabled,false);
 assert.equal(g.players[0].primaryObjectives[1].enabled,true);
});

test('CP survives round advance and restart until a fresh value including zero arrives',()=>{
 let g=mergeGame(emptyGame(),read(1,{cp:4},{cp:2}));
 g=mergeGame(g,read(2,{cp:5}));
 assert.deepEqual(g.players.map(p=>p.cp),[5,2]);
 assert.equal(g.players[1].observedAt.cp,1);
 g=mergeGame(JSON.parse(JSON.stringify(g)),read(2,{}, {cp:0}));
 assert.deepEqual(g.players.map(p=>p.cp),[5,0]);
 assert.equal(g.players[1].observedAt.cp,2);
 g=mergeGame(g,read(3));
 assert.deepEqual(g.players.map(p=>p.cp),[5,0]);
 const other=read(4);other.players[1].name='C';
 assert.equal(mergeGame(g,other).players[0].cp,null);
 assert.equal(mergeGame(g,read(1)).players[0].cp,null);
});
