(function(root){
 function groupUnits(units){
  const groups=[];
  for(const unit of units){const key=unit.name.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();const last=groups.at(-1);if(last?.key===key)last.units.push(unit);else groups.push({key,name:unit.name,units:[unit]});}
  return groups;
 }
 const api={groupUnits};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RosterView=api;
})(globalThis);
