const emptyGame=()=>({players:[],connected:false,updatedAt:null,error:null});
function mergeGame(previous,incoming){
 if(!incoming.connected || !Array.isArray(incoming.players) || incoming.players.length!==2)
  return {...previous,connected:false,error:incoming.error||'Sin lectura válida'};
 const same=previous.round===incoming.round && previous.players?.length===2 && incoming.players.every(p=>previous.players.some(old=>old.name===p.name));
 const players=incoming.players.map(p=>{
  const old=same?previous.players.find(old=>old.name===p.name):null;
  const merged={...p,observedAt:{}};
  for(const key of ['cp','primary','secondary','secondaries','primaryObjectives']){
   if(p[key]!=null)merged.observedAt[key]=incoming.updatedAt;
   else {merged[key]=old?.[key]??null;merged.observedAt[key]=old?.observedAt?.[key]??null;}
  }
  return merged;
 });
 return {...incoming,players};
}
module.exports={emptyGame,mergeGame};
