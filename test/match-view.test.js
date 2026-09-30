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
  assert.equal(roundLabel({roundHalf:'bottom'},{round:2,half:'top'},true),'RONDA 2 · TOP · PRIMER TURNO');
  assert.equal(roundLabel({roundHalf:'top'},{round:2,half:'bottom'},true),'RONDA 2 · BOTTOM · SEGUNDO TURNO');
  assert.equal(roundLabel({}, {round:2},true),'RONDA 2');
  assert.equal(roundLabel({roundHalf:'invalid'},{round:2},false),'RONDA —');
});
