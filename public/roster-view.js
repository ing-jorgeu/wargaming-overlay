(function(root){
 const catalog=typeof module!=='undefined'&&module.exports?require('./unit-categories'):root.UnitCategories;
 const categoryFor=unit=>unit.category||catalog?.[unit.name.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()]?.category||'unit';
 function sortUnits(units){
  const rank=unit=>unit.characters?.length?2:categoryFor(unit)==='epic_character'?0:categoryFor(unit)==='character'?1:['vehicle','monster'].includes(categoryFor(unit))?4:3;
  return units.map((unit,index)=>({unit,index})).sort((a,b)=>rank(a.unit)-rank(b.unit)||a.index-b.index).map(item=>item.unit);
 }
 function groupUnits(units){
  const groups=[];
  for(const unit of units){const key=categoryFor(unit)+'|'+Boolean(unit.characters?.length)+'|'+unit.name.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();const last=groups.at(-1);if(last?.key===key)last.units.push(unit);else groups.push({key,name:unit.name,units:[unit]});}
  return groups;
 }
 const api={groupUnits,sortUnits,categoryFor};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RosterView=api;
})(globalThis);
