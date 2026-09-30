// Accessibility snapshots can be partial. Only increases of previously seen
// values are activity; discovering a mission while scrolling is not activity.
function inferTurn(previous, incoming, samePlayers) {
 const fresh={firstPlayer:null,activePlayer:null,half:null,highestRound:incoming.round,eligible:incoming.round===1 && incoming.players.every(p=>p.score===0),seen:{},reason:'Esperando actividad para detectar el turno'};
 let t=samePlayers && previous.turn ? structuredClone(previous.turn) : fresh;
 if(incoming.round<t.highestRound) return {...t,reason:'Ronda histórica: turno sin determinar'};
 if(incoming.round>t.highestRound){t={...t,highestRound:incoming.round,eligible:true,seen:{},activePlayer:null,half:null};}
 const events=[];
 for(const p of incoming.players){
  const old=t.seen[p.name]||{},next={...old};let activity=false;
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
  if(!t.firstPlayer && t.eligible)t.firstPlayer=name;
  t.activePlayer=name;
  // Bottom is terminal for this round: delayed scoring cannot rewind it.
  if(t.firstPlayer && t.half!=='bottom')t.half=name===t.firstPlayer?'top':'bottom';
  t.reason=t.half?'Turno inferido por actividad de puntuación':`Actividad de ${name}; esperando conocer el orden de juego`;
 }
 if(events.length>1)t.reason='Cambios en ambos jugadores; se conserva el último turno detectado';
 return t;
}
module.exports={inferTurn};
