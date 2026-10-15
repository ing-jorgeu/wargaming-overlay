const test=require('node:test'),assert=require('node:assert/strict');
const MatchView=require('../public/match-view'),{createDetector}=require('../public/auto-play');
const layout=()=>({autoPlay:{enabled:true,durationSeconds:15},left:{name:'Azul',appName:'Ana',team:'blue'},right:{name:'Rojo',appName:'Luis',team:'red'}});
const game=(round=1,half='top')=>({round,half,connected:true,turn:{firstPlayer:'Ana'},players:[{name:'Ana',score:0},{name:'Luis',score:0}]});
test('auto play defaults off, baselines first reading and triggers once for round or active half',()=>{
 const d=createDetector(MatchView),s=layout();s.autoPlay.enabled=false;assert.equal(d.update(s,game()),null);s.autoPlay.enabled=true;
 assert.equal(d.update(s,game()),null);const points=game();points.players[0].score=10;assert.equal(d.update(s,points),null);
 assert.deepEqual(d.update(s,game(1,'bottom')),{team:'red',durationSeconds:15});assert.equal(d.update(s,game(1,'bottom')),null);
 assert.deepEqual(d.update(s,game(2,'bottom')),{team:'red',durationSeconds:15});
 s.autoPlay.enabled=false;d.update(s,game());s.autoPlay.enabled=true;assert.equal(d.update(s,game()),null);
});
test('auto play respects player colors after swaps and ignores disconnected or unresolved turns',()=>{
 const s=MatchView.swapPlayers(layout()),d=createDetector(MatchView);s.autoPlay.durationSeconds=7;
 d.update(s,game());assert.equal(d.update(s,{...game(1,'bottom'),connected:false}),null);
 assert.deepEqual(d.update(s,game(1,'bottom')),{team:'red',durationSeconds:7});
 assert.equal(d.update(s,{...game(2),half:null}),null);assert.equal(d.update(s,{...game(2),turn:{}}),null);
 assert.deepEqual(d.update(s,game(2)),{team:'blue',durationSeconds:7});
});
test('auto play settings validate duration and persist through player swaps',()=>{
 const {linkPlayers}=require('../rosters');const s=linkPlayers(layout());assert.deepEqual(linkPlayers(MatchView.swapPlayers(s),s).autoPlay,s.autoPlay);
 for(const a of [{enabled:true,durationSeconds:0},{enabled:true,durationSeconds:121},{enabled:'yes',durationSeconds:15}])assert.throws(()=>linkPlayers({...s,autoPlay:a},s));
});
test('browser presentation loads the active list, expires after configured duration and disabling hides it',()=>{
 const vm=require('node:vm'),fs=require('node:fs');let current,id=0;const timers=new Map();
 const context={MatchView,document:{createElement:()=>({setAttribute(){},remove(){current=null;}}),body:{append(frame){current=frame;}}},setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/auto-play'),'utf8'),context);
 const s=layout();s.autoPlay.durationSeconds=9;context.OverlayAutoPlay.update(s,game());assert.equal(current,undefined);
 context.OverlayAutoPlay.update(s,game(1,'bottom'));assert.equal(current.src,'/army-list.html?side=red');assert.equal(current.hidden,true);current.onload();assert.equal(current.hidden,false);
 const expiry=[...timers.values()].find(t=>t.ms===9000);assert.ok(expiry);expiry.fn();assert.equal(current,null);
 context.OverlayAutoPlay.update(s,game(2));current.onload();s.autoPlay.enabled=false;context.OverlayAutoPlay.update(s,game(2));assert.equal(current,null);
});

test('first turn detection after an unknown half shows the active army',()=>{
 const d=createDetector(MatchView),s=layout();assert.equal(d.update(s,{...game(),half:null}),null);
 assert.deepEqual(d.update(s,game()),{team:'blue',durationSeconds:15});assert.equal(d.update(s,game()),null);
});
