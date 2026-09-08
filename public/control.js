const factions = {
  'Imperium': [
    'Adepta Sororitas', 'Adeptus Custodes', 'Adeptus Mechanicus', 'Agents of the Imperium',
    'Astra Militarum', 'Black Templars', 'Blood Angels', 'Dark Angels', 'Deathwatch',
    'Grey Knights', 'Imperial Knights', 'Space Marines', 'Space Wolves'
  ],
  'Chaos': [
    'Chaos Daemons', 'Chaos Knights', 'Chaos Space Marines', 'Death Guard',
    'Emperor\'s Children', 'Thousand Sons', 'World Eaters'
  ],
  'Xenos': [
    'Aeldari', 'Drukhari', 'Genestealer Cults', 'Leagues of Votann', 'Necrons',
    'Orks', 'T\'au Empire', 'Tyranids'
  ],
  'Other': ['Custom']
};
let state;
const players = document.querySelector('#players');
const formations = ['Take and Hold', 'Purge the Foe', 'Disruption', 'Reconnaissance', 'Priority Assets'];
function card(side, label, player) { const options = Object.entries(factions).map(([group, names]) => `<optgroup label="${group}">${names.map(name => `<option ${name === player.faction ? 'selected' : ''}>${name}</option>`).join('')}</optgroup>`).join(''); const formation = formations.includes(player.formation) ? player.formation : 'Take and Hold'; const detachments = Array.isArray(player.detachments) ? player.detachments : []; return `<fieldset><legend>${label}</legend><label>Nombre<input data-side="${side}" data-key="name" maxlength="80" value="${player.name}"></label><label>Nombre en la app (opcional)<input data-side="${side}" data-key="appName" maxlength="80" value="${(player.appName || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"></label><label>Facción<select data-side="${side}" data-key="faction">${options}</select></label><label>Disposición<select data-side="${side}" data-key="formation">${formations.map(name => `<option ${name === formation ? 'selected' : ''}>${name}</option>`).join('')}</select></label><label>Destacamento 1 (opcional)<input data-side="${side}" data-detachment="0" maxlength="42" value="${detachments[0] || ''}"></label><label>Destacamento 2 (opcional)<input data-side="${side}" data-detachment="1" maxlength="42" value="${detachments[1] || ''}"></label><label>Destacamento 3 (opcional)<input data-side="${side}" data-detachment="2" maxlength="42" value="${detachments[2] || ''}"></label><label>Color de fondo<input data-side="${side}" data-key="color" type="color" value="${player.color}"></label></fieldset>`; }
async function init(){ state=await fetch('/state').then(r=>r.json()); document.querySelector('#title').value=state.title; players.innerHTML=card('left','Jugador izquierda',state.left)+card('right','Jugador derecha',state.right); document.querySelectorAll('input[type=color]').forEach(input=>input.closest('label').remove()); }
document.querySelector('#form').addEventListener('submit',async e=>{e.preventDefault(); state.title=document.querySelector('#title').value; document.querySelectorAll('[data-side][data-key]').forEach(i=>state[i.dataset.side][i.dataset.key]=i.value); ['left','right'].forEach(side=>{state[side].detachments=[...document.querySelectorAll(`[data-side="${side}"][data-detachment]`)].map(i=>i.value.trim()).filter(Boolean);}); await fetch('/state',{method:'POST',body:JSON.stringify(state)}); document.querySelector('#saved').textContent='Overlay actualizado.'; setTimeout(()=>document.querySelector('#saved').textContent='',1800);}); init();

document.querySelector('#reset-game').addEventListener('click',async()=>{
 const button=document.querySelector('#reset-game');button.disabled=true;
 try {const r=await fetch('/game/reset',{method:'POST'});if(!r.ok)throw Error();document.querySelector('#reset-status').textContent='Datos restablecidos. Esperando una nueva lectura.';}
 catch {document.querySelector('#reset-status').textContent='No se pudo restablecer. Comprueba que el servidor esté actualizado y funcionando.';}
 finally{button.disabled=false}
});
async function phoneStatus(){try{const r=await fetch('/game-state.json',{cache:'no-store'});const g=await r.json();document.querySelector('#phone-status').textContent=g.connected?'Teléfono conectado.':(g.error||'Sin conexión.')+(g.players?.length?' Se conserva la última lectura.':'');}catch{document.querySelector('#phone-status').textContent='Servidor no disponible.'}finally{setTimeout(phoneStatus,3000)}}phoneStatus();

document.querySelector('#obs-url').textContent=location.origin+'/overlay-art.html';

function resolutionHelp(){const [w,h]=document.querySelector('#resolution-preset').value.split('x');document.querySelector('#resolution-help').textContent=`En OBS configura Ancho ${w} y Alto ${h} en la fuente Navegador. El overlay se adapta automáticamente; no cambia la resolución de tu transmisión.`;}
document.querySelector('#resolution-preset').addEventListener('change',resolutionHelp);resolutionHelp();
