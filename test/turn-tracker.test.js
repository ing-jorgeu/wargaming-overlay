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
test('midgame connection waits for order evidence, never assumes scoreboard order',()=>{
 let g=mergeGame(emptyGame(),reading(3,20,25));
 g=mergeGame(g,reading(3,20,30));assert.equal(g.half,null);
 g=mergeGame(g,reading(4,20,30));g=mergeGame(g,reading(4,20,32));
 assert.equal(g.half,'top');assert.equal(g.turn.firstPlayer,'B');
 g=mergeGame(g,reading(4,25,32));assert.equal(g.half,'bottom');
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
 assert.equal(g.half,null);assert.equal(g.turn.firstPlayer,null);
});
