let factions;
let state;
const players = document.querySelector('#players');
const formations = ['Take and Hold', 'Purge the Foe', 'Disruption', 'Reconnaissance', 'Priority Assets'];
const escapeAttribute=value=>String(value??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function card(side, label, player) { const options = Object.entries(factions).map(([group, names]) => `<optgroup label="${group}">${names.map(name => `<option ${name === player.faction ? 'selected' : ''}>${name}</option>`).join('')}</optgroup>`).join(''); const formation = formations.includes(player.formation) ? player.formation : 'Take and Hold'; const detachments = Array.isArray(player.detachments) ? player.detachments : []; return `<fieldset><legend>${label}</legend><label>Nombre<input data-side="${side}" data-key="name" maxlength="80" value="${escapeAttribute(player.name)}"></label><label>Nombre en la app (opcional)<input data-side="${side}" data-key="appName" maxlength="80" value="${(player.appName || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"></label><label>Facción<select data-side="${side}" data-key="faction">${options}</select></label><label>Disposición<select data-side="${side}" data-key="formation">${formations.map(name => `<option ${name === formation ? 'selected' : ''}>${name}</option>`).join('')}</select></label><label>Destacamento 1 (opcional)<input data-side="${side}" data-detachment="0" maxlength="42" value="${escapeAttribute(detachments[0])}"></label><label>Destacamento 2 (opcional)<input data-side="${side}" data-detachment="1" maxlength="42" value="${escapeAttribute(detachments[1])}"></label><label>Destacamento 3 (opcional)<input data-side="${side}" data-detachment="2" maxlength="42" value="${escapeAttribute(detachments[2])}"></label><label>Color de fondo<input data-side="${side}" data-key="color" type="color" value="${player.color}"></label></fieldset>`; }
function renderPlayers(){
 players.innerHTML=card('left','Jugador izquierda',state.left)+card('right','Jugador derecha',state.right);
 document.querySelectorAll('input[type=color]').forEach(input=>input.closest('label').remove());
}
function readForm(){
 const next=structuredClone(state);
 next.title=document.querySelector('#title').value;
 delete next.roundHalf;
 document.querySelectorAll('[data-side][data-key]').forEach(i=>next[i.dataset.side][i.dataset.key]=i.value);
 ['left','right'].forEach(side=>{next[side].detachments=[...document.querySelectorAll(`[data-side="${side}"][data-detachment]`)].map(i=>i.value.trim()).filter(Boolean);});
 return next;
}
async function saveLayout(swap=false){
 const buttons=[...document.querySelectorAll('#form button')];
 buttons.forEach(b=>b.disabled=true);
 try {
  const form=readForm();
  const next=swap?MatchView.swapPlayers(form):form;
  const response=await fetch('/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
  if(!response.ok)throw Error('No se pudo guardar');
  state=next;renderPlayers();
  document.querySelector('#saved').textContent=swap?'Jugadores intercambiados. Overlay actualizado.':'Overlay actualizado.';
 }catch{
  document.querySelector('#saved').textContent='No se pudo confirmar el cambio. Comprueba la conexión con el servidor y recarga el panel antes de intentarlo de nuevo.';
 }finally{buttons.forEach(b=>b.disabled=false);}
}
async function init(){
 factions=await fetch('/factions.json').then(r=>{if(!r.ok)throw Error('No se pudieron cargar las facciones.');return r.json();});
 state=await fetch('/state').then(r=>{if(!r.ok)throw Error('No se pudo cargar el overlay.');return r.json();});
 document.querySelector('#title').value=state.title;
 renderPlayers();
 document.querySelectorAll('#form button').forEach(b=>b.disabled=false);
}
document.querySelector('#form').addEventListener('submit',e=>{e.preventDefault();if(state)saveLayout();});
document.querySelector('#swap-players').addEventListener('click',()=>saveLayout(true));
init().catch(()=>{document.querySelector('#saved').textContent='No se pudo cargar el panel. Comprueba el servidor y recarga la página.';});

document.querySelector('#reset-game').addEventListener('click',async()=>{
 const button=document.querySelector('#reset-game');button.disabled=true;
 try {const r=await fetch('/game/reset',{method:'POST'});if(!r.ok)throw Error();document.querySelector('#reset-status').textContent='Datos restablecidos. Esperando una nueva lectura.';}
 catch {document.querySelector('#reset-status').textContent='No se pudo restablecer. Comprueba que el servidor esté actualizado y funcionando.';}
 finally{button.disabled=false}
});
async function phoneStatus(){try{const r=await fetch('/game-state.json',{cache:'no-store'});const g=await r.json();document.querySelector('#turn-status').textContent=(g.half==='top'?'TOP · Primer turno. ':g.half==='bottom'?'BOTTOM · Segundo turno. ':'Turno automático: ')+(g.turn?.reason||'Esperando actividad de puntuación.');document.querySelector('#phone-status').textContent=g.connected?`Teléfono conectado por ${g.transport==='wifi'?'Wi-Fi':'USB'}.`:(g.phoneConnected?`Teléfono conectado por ${g.transport==='wifi'?'Wi-Fi':'USB'}. `:'')+(g.error||'Reconectando…')+(g.players?.length?' Se conserva la última lectura.':'');}catch{document.querySelector('#phone-status').textContent='Servidor no disponible.'}finally{setTimeout(phoneStatus,3000)}}phoneStatus();

document.querySelector('#obs-url').textContent=location.origin+'/overlay-art.html';

function resolutionHelp(){const [w,h]=document.querySelector('#resolution-preset').value.split('x');document.querySelector('#resolution-help').textContent=`En OBS configura Ancho ${w} y Alto ${h} en la fuente Navegador. El overlay se adapta automáticamente; no cambia la resolución de tu transmisión.`;}
document.querySelector('#resolution-preset').addEventListener('change',resolutionHelp);resolutionHelp();
