const {inferTurn}=require('./turn-tracker');
const emptyGame=()=>({players:[],connected:false,updatedAt:null,error:null});
function mergeGame(previous,incoming){
 if(!incoming.connected || !Array.isArray(incoming.players) || incoming.players.length!==2)
  return {...previous,connected:false,phoneConnected:incoming.phoneConnected===true,transport:incoming.transport||null,error:incoming.error||'Sin lectura válida'};
 const samePlayers=previous.players?.length===2 && incoming.players.every(p=>previous.players.some(old=>old.name===p.name));
 const same=samePlayers && previous.round===incoming.round;
 const advance=samePlayers && incoming.round===previous.round+1 && incoming.round>(previous.turn?.highestRound??previous.round);
 const players=incoming.players.map(p=>{
  const prior=samePlayers?previous.players.find(old=>old.name===p.name):null;
  const old=same?prior:advance?{
   // Primary/secondary totals are cumulative; objective progress belongs to the round.
   cp:prior.cp,primary:prior.primary,secondary:prior.secondary,
   secondaries:prior.secondaries?.filter(m=>m.score===0),
   primaryObjectives:prior.primaryObjectives?.map(m=>({...m,checked:m.checked==null?null:false,counter:m.counter==null?null:0})),
   observedAt:prior.observedAt
  }:null;
  const merged={...p,observedAt:{}};
  for(const key of ['cp','primary','secondary','secondaries','primaryObjectives']){
   if(p[key]!=null)merged.observedAt[key]=incoming.updatedAt;
   else {merged[key]=old?.[key]??null;merged.observedAt[key]=old?.observedAt?.[key]??null;}
  }
  // A partial viewport cannot establish that a remembered mission was removed.
  for(const key of ['secondaries','primaryObjectives']){
   if(Array.isArray(p[key]) && p[key].length && Array.isArray(old?.[key]) && !(key==='secondaries' && p.secondariesComplete)){
    const identity=m=>key==='primaryObjectives'?JSON.stringify([m.name,m.details||'']):m.name;
    const byName=new Map(old[key].map(m=>[identity(m),m]));
    for(const m of p[key])byName.set(identity(m),m);
    merged[key]=[...byName.values()];
   }
  }
  return merged;
 });
 const turn=inferTurn(previous,incoming,samePlayers);
 // Carried cards are known history, not newly drawn cards when first scrolled into view.
 if(advance){
  turn.cards=turn.cards||{};
  for(const p of players)turn.cards[p.name]=[...new Set([...(turn.cards[p.name]||[]),...(p.secondaries||[]).map(m=>m.name)])];
 }
 return {...incoming,players,turn,half:incoming.round===turn.highestRound?turn.half:null};
}
module.exports={emptyGame,mergeGame};
