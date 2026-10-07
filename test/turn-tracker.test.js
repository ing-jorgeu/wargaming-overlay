const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mergeGame,emptyGame}=require('../game-store');
const read=(round,a={},b={})=>({connected:true,round,players:[{name:'A',score:0,...a},{name:'B',score:0,...b}]});
const cards=(...names)=>({secondaries:names.map(name=>({name,score:0}))});
const start=()=>mergeGame(emptyGame(),read(1));
const top=()=>mergeGame(start(),read(1,cards('A1')));
test('only drawing cards selects top and bottom, and bottom cannot rewind',()=>{
 let g=top();assert.equal(g.half,'top');
 g=mergeGame(g,read(1,{},cards('B1')));assert.equal(g.half,'bottom');assert.equal(g.turn.activePlayer,'B');
 g=mergeGame(g,read(1,cards('A2')));assert.equal(g.half,'bottom');assert.equal(g.turn.activePlayer,'B');
});
test('all scoring and objective changes leave turn unchanged, including opponents secondaries',()=>{
 for(const base of [start(),top()]){
  let g=mergeGame(base,read(1,{}, {...cards('B1'),secondaries:[{name:'B1',score:3}],primary:{score:3},secondary:{score:3},primaryObjectives:[{name:'Hold',checked:false,counter:0}]}));
  assert.equal(g.half,base.half);
  g=mergeGame(g,read(1,{}, {score:20,cp:4,primary:{score:8},secondary:{score:10},secondaries:[{name:'B1',score:5}],primaryObjectives:[{name:'Hold',checked:true,counter:4}]}));
  assert.equal(g.half,base.half);
 }
});
test('partial cards persist across scrolling, disconnect and restart without false draws',()=>{
 let g=mergeGame(emptyGame(),read(1,cards('Known')));
 g=mergeGame(g,read(1,{secondaries:[],secondariesComplete:true}));
 g=mergeGame(g,{connected:false});
 g=mergeGame(JSON.parse(JSON.stringify(g)),read(1,cards('Known')));assert.equal(g.half,null);
 g=mergeGame(g,read(1,cards('New')));assert.equal(g.half,'top');
 g=mergeGame(JSON.parse(JSON.stringify(g)),read(1));assert.equal(g.half,'top');
});
test('new round resets half, carried cards do not select a turn, and historical reads cannot alter it',()=>{
 let g=mergeGame(top(),read(1,{},cards('B1')));
 g=mergeGame(g,read(2));assert.equal(g.half,null);
 g=mergeGame(g,read(2,{},cards('B1')));assert.equal(g.half,null);
 g=mergeGame(g,read(2,cards('A2')));assert.equal(g.half,'top');
 g=mergeGame(g,read(1,{},cards('Old')));assert.equal(g.half,null);
 g=mergeGame(g,read(2));assert.equal(g.half,'top');
});
test('initial lists, simultaneous draws and disabled cards do not select a player',()=>{
 let g=mergeGame(emptyGame(),read(5,cards('Existing'),cards('ExistingB')));assert.equal(g.half,null);
 g=mergeGame(g,read(5,cards('NewA'),cards('NewB')));assert.equal(g.half,null);
 g=mergeGame(g,read(5,{secondaries:[{name:'Disabled',score:0,enabled:false}]}));assert.equal(g.half,null);
});
test('app order selects bottom in round 5 and overlay swaps change color only',()=>{
 const {swapPlayers,roundLabel}=require('../public/match-view');
 let g=mergeGame(emptyGame(),read(5));g=mergeGame(g,read(5,{},cards('B1')));
 assert.equal(g.half,'bottom');
 const layout={left:{name:'A'},right:{name:'B'}};
 assert.match(roundLabel(layout,g,true),/BOTTOM · ROJO/);
 assert.match(roundLabel(swapPlayers(layout),g,true),/BOTTOM · AZUL/);
});
test('old scoring policy half is discarded while card history is retained',()=>{
 let g=top();delete g.turn.detectionSource;g.turn.half='bottom';g.turn.activePlayer='B';
 g=mergeGame(g,read(1,cards('A1')));assert.equal(g.half,null);
 g=mergeGame(g,read(1,cards('A2')));assert.equal(g.half,'top');
 const r=read(2);r.players[1].name='C';g=mergeGame(g,r);assert.equal(g.half,null);
});
