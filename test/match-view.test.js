const {test} = require('node:test');
const assert = require('node:assert/strict');
const {swapPlayers, matchPlayers, roundLabel} = require('../public/match-view');

test('swapping keeps every player field and live score linked by app identity', () => {
  const layout = {title:'Final', roundHalf:'bottom',
    left:{name:'Ana', appName:'  ALPHA ', faction:'Orks', formation:'Take and Hold', detachments:['First','Second'], color:'#123456', extra:{future:true}},
    right:{name:'Luis', appName:'Beta', faction:'Necrons', formation:'Reconnaissance', detachments:['Third'], color:'#abcdef'}};
  const game={round:3,players:[{name:'alpha',score:42,cp:3,primary:{score:10,max:50},secondaries:[{name:'Mission',score:2,max:5}],primaryObjectives:[{name:'Hold',counter:3}]},{name:'beta',score:23,cp:1}]};
  const swapped=swapPlayers(layout);
  assert.deepEqual(swapped.left,layout.right);
  assert.deepEqual(swapped.right,layout.left);
  assert.deepEqual(matchPlayers(swapped,game),[game.players[1],game.players[0]]);
  assert.deepEqual(swapPlayers(swapped),layout);
  assert.equal(swapped.roundHalf,'bottom');
  swapped.right.extra.future=false;
  assert.equal(layout.left.extra.future,true);
});
test('ambiguous and missing links never assign the same score to both sides', () => {
  assert.deepEqual(matchPlayers({left:{name:'Ana'},right:{name:'Ana'}},{players:[{name:'Ana',score:5}]}),[null,null]);
  assert.deepEqual(matchPlayers({left:{name:'Ana'},right:{name:'Luis'}},{players:[{name:'Ana'},{name:'Ana'}]}),[null,null]);
});
test('round half is explicit, optional, and independent of player side', () => {
  assert.equal(roundLabel({roundHalf:'bottom'},{round:2,half:'top'},true),'RONDA 2 · TOP');
  assert.equal(roundLabel({roundHalf:'top'},{round:2,half:'bottom'},true),'RONDA 2 · BOTTOM');
  assert.equal(roundLabel({}, {round:2},true),'RONDA 2');
  assert.equal(roundLabel({roundHalf:'invalid'},{round:2},false),'RONDA —');
});

test('control distinguishes player order from unknown active turn',()=>{
 const {turnStatus}=require('../public/match-view');
 const game={round:5,half:null,players:[{name:'Ana'},{name:'Luis'}],turn:{orderSource:'ui-order',firstPlayer:'Ana'}};
 assert.equal(turnStatus(game).order,'TOP: Ana · BOTTOM: Luis');
 assert.equal(turnStatus(game).label,'RONDA 5');
 assert.equal(turnStatus({...game,half:'bottom'}).label,'RONDA 5 · BOTTOM');
});

test('turn color follows the active player across swaps, including app aliases',()=>{
 const layout={left:{name:'Display A',appName:'Pedro',team:'blue',color:'#7d1520'},right:{name:'Display B',appName:'John',team:'red',color:'#245eb8'}};
 const game={round:1,half:'top',players:[{name:'Pedro'},{name:'John'}],turn:{firstPlayer:'Pedro',orderSource:'ui-order'}};
 assert.equal(roundLabel(layout,game,true),'RONDA 1 · TOP · AZUL');
 const swapped=swapPlayers(layout);
 assert.equal(roundLabel(swapped,game,true),'RONDA 1 · TOP · AZUL');
 game.half='bottom';
 assert.equal(roundLabel(layout,game,true),'RONDA 1 · BOTTOM · ROJO');
 assert.equal(roundLabel(swapped,game,true),'RONDA 1 · BOTTOM · ROJO');
 assert.equal(require('../public/match-view').turnStatus(game,swapped).label,'RONDA 1 · BOTTOM · ROJO');
 assert.equal(roundLabel({left:{name:'Pedro'},right:{name:'Pedro'}},{...game,half:'top'},true),'RONDA 1 · TOP');
});
