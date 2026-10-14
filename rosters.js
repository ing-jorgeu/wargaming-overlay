const {randomUUID}=require('node:crypto');
function linkPlayers(next,previous={}){
 const used=new Set();const result={...next};
 for(const side of ['left','right']){
  const player=next[side];if(!player||typeof player!=='object')throw Error('Faltan los dos jugadores.');
  const known=['left','right'].map(s=>previous[s]).filter(Boolean);
  let id=known.find(p=>p.rosterId===player.rosterId)?.rosterId;
  if(!id)id=known.find(p=>(p.appName||p.name)===(player.appName||player.name))?.rosterId;
  if(!id)id=previous[side]?.rosterId;
  if(!id||used.has(id))id=randomUUID();
  used.add(id);result[side]={...player,rosterId:id,team:known.find(p=>p.rosterId===id)?.team||player.team||(side==='left'?'blue':'red')};
 }
 return result;
}
function validateUnits(input){
 if(!Array.isArray(input)||input.length>80)throw Error('La lista admite hasta 80 unidades.');
 const ids=new Set();
 const text=(v,max,label,required=false)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw Error(`${label}: texto ${required?'obligatorio, ':''}máximo ${max} caracteres.`);return v.trim();};
 return input.map(u=>{
  if(!u||typeof u!=='object')throw Error('Unidad inválida.');
  const id=u.id||randomUUID();if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||ids.has(id))throw Error('Identificador de unidad inválido o repetido.');ids.add(id);
  if(!Array.isArray(u.characters)||u.characters.length>8)throw Error('Cada unidad admite hasta 8 personajes.');
  if(typeof u.deepStrike!=='boolean'||typeof u.destroyed!=='boolean')throw Error('En reservas y destruida deben ser true o false.');
  if(u.battleshocked!==undefined&&typeof u.battleshocked!=='boolean')throw Error('Battleshocked debe ser true o false.');
  if(u.category!==undefined&&!['epic_character','character','unit','vehicle','monster'].includes(u.category))throw Error('Categoría de unidad inválida.');
  const catalog=require('./public/unit-categories');const category=u.category||catalog[String(u.name).normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()]?.category;
  return {...(category?{category}:{}),id,name:text(u.name,100,'Unidad',true),enhancement:text(u.enhancement??'',100,'Mejora'),characters:u.characters.map(c=>text(c,80,'Personaje',true)),notes:text(u.notes??'',160,'Notas'),deepStrike:u.deepStrike,destroyed:u.destroyed,battleshocked:u.battleshocked===true};
 });
}
function validateBackground(value=''){
 if(typeof value!=='string'||value.length>2048)throw Error('URL de fondo inválida.');
 if(!value.trim())return '';
 let url;try{url=new URL(value);}catch{throw Error('Introduce una URL completa para el fondo.');}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('El fondo debe usar HTTP o HTTPS, sin credenciales.');
 return url.href;
}
function validateName(value=''){
 if(typeof value!=='string'||value.length>80)throw Error('Nombre de lista: máximo 80 caracteres.');
 return value.trim();
}
function updateUnitStatus(roster,id,input){
 const keys=['battleshocked','destroyed','deepStrike'];
 if(!input||typeof input!=='object'||Array.isArray(input)||!Object.keys(input).length||Object.keys(input).some(k=>!keys.includes(k)||typeof input[k]!=='boolean'))throw Error('Solo se pueden cambiar estados de unidad con true o false.');
 if(!roster?.units?.some(u=>u.id===id))throw Error('Unidad no encontrada.');
 return {...roster,revision:roster.revision+1,units:roster.units.map(u=>u.id===id?{...u,...input}:u)};
}
module.exports={linkPlayers,validateUnits,validateBackground,validateName,updateUnitStatus};
