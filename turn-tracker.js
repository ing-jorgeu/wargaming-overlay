// Keep the union of observed cards for each player and round across partial snapshots.
// A first-seen unscored card after the initial reading is a draw heuristic, not proof.
function inferTurn(previous, incoming, samePlayers) {
 // The parser keeps Tabletop Battles player order even when a heading is off-screen.
 const firstPlayer=incoming.players[0].name;
 const fresh={firstPlayer,orderSource:'ui-order',activePlayer:null,half:null,highestRound:incoming.round,seen:{},reason:'Orden de Tabletop Battles identificado; esperando actividad para detectar el turno'};
 let t=samePlayers && previous.turn ? structuredClone(previous.turn) : fresh;
 if(incoming.round<t.highestRound) return {...t,reason:'Ronda histórica: turno sin determinar'};
 // Old versions learned order from scoring; discard that inference on migration.
 if(t.orderSource!=='ui-order' || t.firstPlayer!==firstPlayer)t=fresh;
 if(incoming.round>t.highestRound){t={...t,highestRound:incoming.round,seen:{},cards:{},cardBaselines:{},activePlayer:null,half:null,reason:fresh.reason};}
 const events=[];
 t.cards=t.cards||{};
 for(const p of incoming.players){
  const old=t.seen[p.name]||{},next={...old};let activity=false;
  if(Array.isArray(p.secondaries)){
   const names=[...new Set(p.secondaries.map(m=>m.name))];
   const prior=t.cards[p.name];
   const known=Array.isArray(prior)?prior:[];
   const added=p.secondaries.filter(m=>!known.includes(m.name));
   // A complete baseline proves an addition. Otherwise a new zero-point card is
   // useful evidence, including the first visible BOTTOM card after TOP played.
   if(t.cardBaselines?.[p.name] && added.length)activity=true;
   else if(Object.hasOwn(t.seen,p.name) && added.some(m=>m.score===0))activity=true;
   t.cards[p.name]=[...new Set([...known,...names])];
   if(p.secondariesComplete){
    t.cardBaselines=t.cardBaselines||{};
    t.cardBaselines[p.name]=true;
   }
  }
  const values={};
  for(const key of ['primary','secondary']) if(Number.isFinite(p[key]?.score))values[key]=p[key].score;
  if(Number.isFinite(p.score))values.score=p.score;
  for(const m of p.secondaries||[])if(Number.isFinite(m.score))values[`mission:${m.name}`]=m.score;
  for(const m of p.primaryObjectives||[]){
   if(m.checked!=null)values[`checked:${m.name}`]=Number(m.checked);
   if(Number.isFinite(m.counter))values[`counter:${m.name}`]=m.counter;
  }
  for(const [key,value] of Object.entries(values)){
   if(Number.isFinite(old[key]) && value>old[key])activity=true;
   next[key]=value;
  }
  t.seen[p.name]=next;
  if(activity)events.push(p.name);
 }
 if(events.length===1){
  const name=events[0];
  // Delayed scoring by TOP must not change the player after BOTTOM began.
  if(t.half!=='bottom')t.activePlayer=name;
  // Bottom is terminal for this round: delayed scoring cannot rewind it.
  if(t.firstPlayer && t.half!=='bottom')t.half=name===t.firstPlayer?'top':'bottom';
  t.reason='Turno identificado por puntuación o nuevas secundarias; orden de Tabletop Battles';
 }
 if(events.length>1)t.reason='Cambios en ambos jugadores; se conserva el último turno detectado';
 return t;
}
module.exports={inferTurn};
