const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mergeGame,emptyGame}=require('../game-store');
const reading=(round,a,b,extra={})=>({connected:true,round,players:[{name:'A',score:a,...extra},{name:'B',score:b}]});
test('automatic halves follow scoring, survive restart/disconnect and cannot rewind within a round',()=>{
 let g=mergeGame(emptyGame(),reading(1,0,0));assert.equal(g.half,null);
 g=mergeGame(g,reading(1,5,0));assert.equal(g.half,'top');
 g=mergeGame(JSON.parse(JSON.stringify(g)),reading(1,5,4));assert.equal(g.half,'bottom');
 g=mergeGame(g,reading(1,6,4));assert.equal(g.half,'bottom');
 g=mergeGame(g,{connected:false});assert.equal(g.half,'bottom');
 g=mergeGame(g,reading(2,6,4));assert.equal(g.half,null);
 g=mergeGame(g,reading(2,8,4));assert.equal(g.half,'top');
 g=mergeGame(g,reading(1,99,99));assert.equal(g.half,null);
 g=mergeGame(g,reading(2,8,4));assert.equal(g.half,'top');
});
test('round 5 uses app order even when the bottom player scores first after connecting',()=>{
 let g=mergeGame(emptyGame(),reading(5,60,65));
 assert.equal(g.half,null);assert.equal(g.turn.firstPlayer,'A');
 g=mergeGame(g,reading(5,60,70));assert.equal(g.half,'bottom');assert.equal(g.turn.activePlayer,'B');
 g=mergeGame(g,reading(5,62,70));assert.equal(g.half,'bottom');assert.equal(g.turn.activePlayer,'B');
});
test('midgame top scoring and swapped overlay sides keep Tabletop Battles turn order',()=>{
 const {swapPlayers,matchPlayers,roundLabel}=require('../public/match-view');
 let g=mergeGame(emptyGame(),reading(5,60,65));g=mergeGame(g,reading(5,65,65));
 assert.equal(g.half,'top');
 const layout=swapPlayers({left:{name:'A'},right:{name:'B'}});
 assert.deepEqual(matchPlayers(layout,g).map(p=>p.name),['B','A']);
 assert.match(roundLabel(layout,g,true),/TOP/);assert.equal(g.turn.firstPlayer,'A');
});
test('legacy learned order is discarded before using new activity',()=>{
 let g=reading(5,60,65);g.turn={firstPlayer:'B',activePlayer:'B',half:'top',highestRound:5,seen:{},eligible:true};
 g=mergeGame(g,reading(5,60,65));assert.equal(g.half,null);assert.equal(g.turn.firstPlayer,'A');
 g=mergeGame(g,reading(5,60,70));assert.equal(g.half,'bottom');
});
test('scroll discovery, CP, decreases, and simultaneous scoring do not select a turn',()=>{
 let g=mergeGame(emptyGame(),reading(1,0,0));
 g=mergeGame(g,reading(1,0,0,{cp:4,secondaries:[{name:'Newly visible',score:3}]}));assert.equal(g.half,null);
 g=mergeGame(g,reading(1,0,0,{cp:2,secondaries:[{name:'Newly visible',score:2}]}));assert.equal(g.half,null);
 g=mergeGame(g,reading(1,1,1));assert.equal(g.half,null);
});
test('individual mission scoring and checked primary objectives trigger detection',()=>{
 for(const [before,after] of [
  [{secondaries:[{name:'Mission',score:0}]},{secondaries:[{name:'Mission',score:2}]}],
  [{primaryObjectives:[{name:'Hold',checked:false}]},{primaryObjectives:[{name:'Hold',checked:true}]}],
  [{primary:{score:0}},{primary:{score:5}}],
  [{secondary:{score:0}},{secondary:{score:5}}]
 ]){
  let g=mergeGame(emptyGame(),reading(1,0,0,before));
  g=mergeGame(g,reading(1,0,0,after));assert.equal(g.half,'top');
 }
});
test('different players reset turn inference',()=>{
 let g=mergeGame(emptyGame(),reading(1,0,0));g=mergeGame(g,reading(1,2,0));
 g=mergeGame(g,{connected:true,round:3,players:[{name:'C',score:20},{name:'D',score:30}]});
 assert.equal(g.half,null);assert.equal(g.turn.firstPlayer,'C');
});

test('known half survives background reading and restart without fresh scoring',()=>{
 let g=mergeGame(emptyGame(),reading(1,0,0));g=mergeGame(g,reading(1,5,0));
 g=mergeGame(g,{connected:false,phoneConnected:true,error:'Otra pantalla'});
 g=mergeGame(JSON.parse(JSON.stringify(g)),reading(1,5,0));assert.equal(g.half,'top');
});
test('new unscored secondary identifies current player after complete baseline',()=>{
 const card=(name)=>({name,score:0});
 let g=mergeGame(emptyGame(),reading(1,0,0,{secondaries:[],secondariesComplete:true}));
 g=mergeGame(g,reading(1,0,0,{secondaries:[card('Burden of Trust')],secondariesComplete:true}));
 assert.equal(g.half,'top');
 let r=reading(1,0,0);r.players[1].secondaries=[];r.players[1].secondariesComplete=true;g=mergeGame(g,r);
 r=reading(1,0,0);r.players[1].secondaries=[card('Cleanse')];r.players[1].secondariesComplete=true;
 g=mergeGame(JSON.parse(JSON.stringify(g)),r);assert.equal(g.half,'bottom');
});
test('partial addition after empty baseline detects a draw but initial readings do not',()=>{
 let g=mergeGame(emptyGame(),reading(1,0,0,{secondaries:[],secondariesComplete:true}));
 g=mergeGame(g,reading(1,0,0,{secondaries:[{name:'Hidden',score:0}]}));assert.equal(g.half,'top');
 let h=mergeGame(emptyGame(),reading(5,50,60,{secondaries:[{name:'Existing',score:0}],secondariesComplete:true}));assert.equal(h.half,null);
 h=mergeGame(h,reading(6,50,60,{secondaries:[{name:'New round',score:0}],secondariesComplete:true}));assert.equal(h.half,null);
});

test('first unscored bottom card in a partial reading switches without scoring',()=>{
 let g=mergeGame(emptyGame(),reading(1,0,0));
 g=mergeGame(g,reading(1,3,0));assert.equal(g.half,'top');
 const r=reading(1,3,0);r.players[1].secondaries=[{name:'Cleanse',score:0}];
 g=mergeGame(JSON.parse(JSON.stringify(g)),r);
 assert.equal(g.half,'bottom');assert.equal(g.turn.activePlayer,'B');
});
test('partial card history survives scrolling, disappearance and restart',()=>{
 let g=mergeGame(emptyGame(),reading(1,0,0,{secondaries:[{name:'Known',score:0}]}));
 g=mergeGame(g,reading(1,0,0,{secondaries:[],secondariesComplete:true}));
 g=mergeGame(g,{connected:false});
 g=mergeGame(JSON.parse(JSON.stringify(g)),reading(1,0,0,{secondaries:[{name:'Known',score:0}]}));
 assert.equal(g.half,null);
 g=mergeGame(g,reading(1,0,0,{secondaries:[{name:'New',score:0}]}));
 assert.equal(g.half,'top');assert.deepEqual(g.turn.cards.A,['Known','New']);
 g=mergeGame(g,reading(2,0,0,{secondaries:[{name:'Known',score:0}]}));
 assert.equal(g.half,null);assert.deepEqual(g.turn.cards.A,['Known','New']);
});
