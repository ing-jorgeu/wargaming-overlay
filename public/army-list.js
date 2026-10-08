(()=>{
 const $=s=>document.querySelector(s),stage=$('#army-stage'),params=new URLSearchParams(location.search),id=params.get('player');
 let snapshot;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 function fit(){
  const root=$('#army-units');
  // Multicolumn flow retains order; reduce typography only as needed to fit all content.
  let best={font:0,columns:2};
  for(const columns of [2,3]){
   root.style.columnCount=columns;
   for(let font=28;font>=4;font--){root.style.fontSize=font+'px';if(root.scrollWidth<=root.clientWidth+1&&root.scrollHeight<=root.clientHeight+1&&[...root.querySelectorAll('.army-group')].every(group=>group.getClientRects().length===1)){if(font>best.font)best={font,columns};break;}}
  }
  root.style.columnCount=best.columns;root.style.fontSize=(best.font||4)+'px';
 }
 function render(){
  if(!snapshot)return;
  const requestedSide=params.get('side')||'blue',resolvedSide=({blue:'left',red:'right'})[requestedSide]||requestedSide;
  const entry=Object.entries(snapshot.players).find(([side,p])=>p.rosterId===id||(!id&&side===resolvedSide));
  const root=$('#army-units');root.replaceChildren();
  if(!entry){$('#army-name').textContent='Jugador no encontrado';$('#army-status').textContent='Copia la URL desde el administrador.';return;}
  const [side,p]=entry,roster=snapshot.rosters[p.rosterId]||{},units=roster.units||[];
  $('#army-list-name').textContent=roster.name||'ORDEN DE BATALLA';
  const background=$('#army-background');
  if(roster.backgroundUrl){if(background.getAttribute('src')!==roster.backgroundUrl)background.src=roster.backgroundUrl;background.hidden=false;}else{background.removeAttribute('src');background.hidden=true;}
  stage.style.setProperty('--accent',side==='left'?'#6aabfa':'#ed8c8a');
  $('#army-name').textContent=p.name;$('#army-name').style.fontSize=p.name.length>45?'36px':p.name.length>28?'48px':'62px';$('#army-faction').textContent=p.faction;$('#army-detachments').textContent=(p.detachments||[]).join(' · ');
  $('#army-count').textContent=`${units.filter(u=>!u.destroyed).length} / ${units.length} unidades`;
  for(const group of RosterView.groupUnits(units)){
   const block=el('section',null,'army-group'),heading=el('h2',group.name+(group.units.length>1?' ×'+group.units.length:''),'group-name');
   const hasLeaders=group.units.some(u=>u.characters.length);
   if(group.units.every(u=>u.destroyed))heading.classList.add('all-destroyed');if(!hasLeaders)block.append(heading);
   group.units.forEach((u,i)=>{
    const row=el('div',null,'army-member'+(u.destroyed?' destroyed':''));
    if(hasLeaders){
     row.append(el('h2',u.characters.length?u.characters.join(' · '):u.name,'group-name member-title'));
     if(u.characters.length)row.append(el('p','Lidera: '+u.name,'unit-detail led-unit'));
    }
    const label=el('div',null,'member-status');if(group.units.length>1)label.append(el('span',`Unidad ${i+1}`,'member-number'));
    if(u.destroyed)label.append(el('span','Destruida','unit-badge'));else if(u.deepStrike)label.append(el('span','En reservas','unit-badge'));
    if(u.battleshocked&&!u.destroyed)label.append(el('span','Battleshocked','unit-badge battleshocked'));
    if(label.childNodes.length)row.append(label);
    const detail=(name,text)=>{if(!text)return;const line=el('p',null,'unit-detail');line.append(el('strong',name+' '),document.createTextNode(text));row.append(line);};
    detail('Mejora:',u.enhancement);if(u.notes)row.append(el('p',u.notes,'unit-detail unit-notes'));
    if(row.childNodes.length)block.append(row);
   });root.append(block);
  }
  if(!units.length)root.append(el('p','Lista pendiente de cargar','army-empty'));
  fit();
 }
 const stream=new EventSource('/rosters/events');stream.onmessage=e=>{snapshot=JSON.parse(e.data);$('#army-status').textContent='';render();};stream.onerror=()=>{$('#army-status').textContent='Reconectando · última lista guardada';};
 $('#army-background').onerror=()=>{$('#army-background').hidden=true;$('#army-status').textContent='No se pudo cargar la imagen de fondo';};
 function resize(){
  const scale=Math.min(innerWidth/1920,innerHeight/1080);
  stage.style.width=(innerWidth/scale)+'px';stage.style.height=(innerHeight/scale)+'px';
  stage.style.transform=`translate(-50%,-50%) scale(${scale})`;
  if(snapshot)fit();
 }
 addEventListener('resize',resize);resize();
})();
