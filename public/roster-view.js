(function(root){
 function sortUnits(units){
  const rank=unit=>unit.characters?.length?2:unit.category==='epic_character'?0:unit.category==='character'?1:['vehicle','monster'].includes(unit.category)?4:3;
  return units.map((unit,index)=>({unit,index})).sort((a,b)=>rank(a.unit)-rank(b.unit)||a.index-b.index).map(item=>item.unit);
 }
 function groupUnits(units){
  const groups=[];
  for(const unit of units){const key=(unit.category||'unit')+'|'+Boolean(unit.characters?.length)+'|'+unit.name.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();const last=groups.at(-1);if(last?.key===key)last.units.push(unit);else groups.push({key,name:unit.name,units:[unit]});}
  return groups;
 }
 const api={groupUnits,sortUnits};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RosterView=api;
})(globalThis);
