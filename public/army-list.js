(()=>{
 const $=s=>document.querySelector(s),stage=$('#army-stage'),params=new URLSearchParams(location.search),id=params.get('player');
 let snapshot,menu;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 function closeMenu(){menu?.remove();menu=null;}
 function editable(node,rosterId,units){
  node.tabIndex=0;node.setAttribute('aria-haspopup','menu');
  const open=e=>{e.stopPropagation();openMenu(rosterId,units,e.clientX??node.getBoundingClientRect().left,e.clientY??node.getBoundingClientRect().bottom);};
  node.addEventListener('click',open);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(e);}});
 }
 function openMenu(rosterId,units,x,y){
  closeMenu();menu=el('div',null,'unit-context-menu');menu.setAttribute('role','menu');
  const popup=menu;
  function position(){popup.style.left=Math.max(8,Math.min(x,innerWidth-popup.offsetWidth-8))+'px';popup.style.top=Math.max(8,Math.min(y,innerHeight-popup.offsetHeight-8))+'px';}
  function choose(unit){
   popup.replaceChildren(el('p',unit.name,'context-title'));
   for(const [key,label] of [['battleshocked','Battleshocked'],['destroyed','Destruida'],['deepStrike','En reservas']]){
    const button=el('button',label);button.type='button';button.setAttribute('role','menuitemcheckbox');button.setAttribute('aria-checked',String(unit[key]===true));button.classList.toggle('checked',unit[key]===true);
    button.onclick=async e=>{e.stopPropagation();closeMenu();try{
     const response=await fetch('/rosters/'+encodeURIComponent(rosterId)+'/units/'+encodeURIComponent(unit.id)+'/status',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({[key]:unit[key]!==true})});
     if(!response.ok)throw Error('No se pudo guardar el estado de la unidad.');
     // SSE publishes the canonical list, including edits made in other panels.
    }catch(error){console.error(error.message);}};
    popup.append(button);
   }
   position();popup.querySelector('button')?.focus({preventScroll:true});
  }
  document.body.append(popup);
  if(units.length===1)choose(units[0]);else{
   popup.append(el('p',units[0].name,'context-title'));
   units.forEach((unit,i)=>{const button=el('button','Unidad '+(i+1));button.type='button';button.setAttribute('role','menuitem');button.onclick=e=>{e.stopPropagation();choose(unit);};popup.append(button);});position();popup.querySelector('button')?.focus({preventScroll:true});
  }
 }
 document.addEventListener('click',e=>{if(menu&&!menu.contains(e.target))closeMenu();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
 function fit(){
  const root=$('#army-units'),groups=[...root.querySelectorAll('.army-group')];
  if(!groups.length)return;
  const height=root.clientHeight,padding=parseFloat(getComputedStyle(root).paddingTop)||0,gap=32;
  root.style.columnCount='auto';root.style.position='relative';
  function pack(columns,font){
   root.style.fontSize=font+'px';const width=(root.clientWidth-gap*(columns-1))/columns;
   let column=0,y=padding;const positions=[];
   for(const group of groups){
    group.style.position='absolute';group.style.width=width+'px';
    const cardHeight=group.offsetHeight,margin=parseFloat(getComputedStyle(group).marginBottom)||0;
    if(y+cardHeight>height+1&&y>padding){column++;y=padding;}
    if(column>=columns||y+cardHeight>height+1)return null;
    positions.push({group,x:column*(width+gap),y});y+=cardHeight+margin;
   }
   return positions;
  }
  let best={font:0,columns:2};
  for(const columns of [2,3])for(let font=28;font>=4;font--)if(pack(columns,font)){if(font>best.font)best={font,columns};break;}
  const positions=pack(best.columns,best.font||4);
  if(positions)for(const {group,x,y} of positions){group.style.left=x+'px';group.style.top=y+'px';}
 }
 function render(){
  if(!snapshot)return;
  closeMenu();
  const requestedSide=params.get('side')||'blue',resolvedSide=({blue:'left',red:'right'})[requestedSide]||requestedSide;
  const entry=Object.entries(snapshot.players).find(([side,p])=>p.rosterId===id||(!id&&(['blue','red'].includes(requestedSide)?(p.team||(side==='left'?'blue':'red'))===requestedSide:side===resolvedSide)));
  const root=$('#army-units');root.replaceChildren();
  if(!entry){$('#army-name').textContent='Jugador no encontrado';$('#army-status').textContent='Copia la URL desde el administrador.';return;}
  const [side,p]=entry,roster=snapshot.rosters[p.rosterId]||{},units=roster.units||[];
  $('#army-list-name').textContent=roster.name||'ORDEN DE BATALLA';
  const background=$('#army-background');
  if(roster.backgroundUrl){if(background.getAttribute('src')!==roster.backgroundUrl)background.src=roster.backgroundUrl;background.hidden=false;}else{background.removeAttribute('src');background.hidden=true;}
  stage.style.setProperty('--accent',(p.team||(side==='left'?'blue':'red'))==='blue'?'#6aabfa':'#ed8c8a');
  $('#army-name').textContent=p.name;$('#army-name').style.fontSize=p.name.length>45?'36px':p.name.length>28?'48px':'62px';$('#army-faction').textContent=p.faction;$('#army-detachments').textContent=(p.detachments||[]).join(' · ');
  $('#army-count').textContent=`${units.filter(u=>!u.destroyed).length} / ${units.length} unidades`;
  for(const group of RosterView.groupUnits(RosterView.sortUnits(units))){
   const block=el('section',null,'army-group'),heading=el('h2',group.name+(group.units.length>1?' ×'+group.units.length:''),'group-name');
   const hasLeaders=group.units.some(u=>u.characters.length);
   if(group.units.every(u=>u.destroyed))heading.classList.add('all-destroyed');if(!hasLeaders&&group.units.length>1){block.append(heading);editable(heading,p.rosterId,group.units);}
   group.units.forEach((u,i)=>{
    const row=el('div',null,'army-member'+(u.destroyed?' destroyed':''));
    editable(row,p.rosterId,[u]);
    if(!hasLeaders&&group.units.length===1)row.append(heading);
    if(hasLeaders){
     row.append(el('h2',u.characters.length?u.characters.join(' + '):u.name,'group-name member-title'));
     if(u.characters.length)row.append(el('p','Unidad: '+u.name,'unit-detail led-unit'));
    }
    const label=el('div',null,'member-status');if(group.units.length>1)label.append(el('span',`Unidad ${i+1}`,'member-number'));
    if(u.destroyed)label.append(el('span','Destruida','unit-badge'));else if(u.deepStrike)label.append(el('span','En reservas','unit-badge'));
    if(u.battleshocked&&!u.destroyed)label.append(el('span','Battleshocked','unit-badge battleshocked'));
    if(label.childNodes.length)row.append(label);
    const detail=(name,text)=>{if(!text)return;const line=el('p',null,'unit-detail');line.append(el('strong',name+' '),document.createTextNode(text));row.append(line);};
    detail('Mejora:',u.enhancement);if(u.notes){const notes=el('ul',null,'unit-detail unit-notes');for(const item of u.notes.split(/\n|[;•]/).map(s=>s.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean))notes.append(el('li',item));row.append(notes);}
    block.append(row);
   });root.append(block);
  }
  if(!units.length)root.append(el('p','Lista pendiente de cargar','army-empty'));
  fit();
 }
 const stream=new EventSource('/rosters/events');stream.onmessage=e=>{snapshot=JSON.parse(e.data);$('#army-status').textContent='';render();};stream.onerror=()=>{$('#army-status').textContent='Reconectando · última lista guardada';};
 $('#army-background').onerror=()=>{$('#army-background').hidden=true;$('#army-status').textContent='No se pudo cargar la imagen de fondo';};
 function resize(){
  closeMenu();
  const scale=Math.min(innerWidth/1920,innerHeight/1080);
  stage.style.width=(innerWidth/scale)+'px';stage.style.height=(innerHeight/scale)+'px';
  stage.style.transform=`translate(-50%,-50%) scale(${scale})`;
  if(snapshot)fit();
 }
 addEventListener('resize',resize);resize();
})();
