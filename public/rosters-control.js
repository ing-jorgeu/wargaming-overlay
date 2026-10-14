(()=>{
 const $=s=>document.querySelector(s),root=$('#roster-editors'),feedback=$('#roster-feedback');
 const drafts=new Map();let snapshot,dragged=null;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 let selectedTeam='blue';
 function filterTeam(){document.querySelectorAll('[data-player-team]').forEach(n=>n.hidden=n.dataset.playerTeam!==selectedTeam);}
 function tab(which){
  if(which!=='match')selectedTeam=which;
  $('#match-panel').hidden=which!=='match';$('#rosters-panel').hidden=which==='match';
  for(const name of ['match','blue','red']){const selected=name===which;$('#tab-'+name).setAttribute('aria-pressed',String(selected));$('#tab-'+name).classList.toggle('secondary-button',!selected);}
  filterTeam();window.dispatchEvent(new CustomEvent('player-tab',{detail:selectedTeam}));if(which!=='match')load();
 }
 for(const name of ['match','blue','red'])$('#tab-'+name).onclick=()=>tab(name);
 function dirty(){return [...drafts.values()].some(d=>d.dirty);}
 async function load(){
  if([...drafts.values()].some(d=>d.saving))return;
  try{const r=await fetch('/rosters');if(!r.ok)throw Error('No se pudieron cargar las listas.');snapshot=await r.json();
   for(const p of Object.values(snapshot.players)){if(!drafts.has(p.rosterId)||!drafts.get(p.rosterId).dirty)drafts.set(p.rosterId,{...structuredClone(snapshot.rosters[p.rosterId]||{revision:0,units:[]}),dirty:false});}
   render();
  }catch(e){feedback.textContent=e.message;}
 }
 function button(text,fn,secondary=true){const b=el('button',text,secondary?'secondary-button':'');b.type='button';b.onclick=fn;return b;}
 function field(label,value,max,fn,multiline=false){const l=el('label',label),i=el(multiline?'textarea':'input');i.value=value;i.maxLength=max;if(multiline)i.rows=2;i.oninput=()=>fn(i.value);l.append(i);return l;}
 function render(){
  root.replaceChildren();if(!snapshot)return;
  for(const [side,p] of Object.entries(snapshot.players)){
   const d=drafts.get(p.rosterId),section=el('article',null,'roster-editor');section.dataset.roster=p.rosterId;section.dataset.playerTeam=MatchView.teamOf(p,side);
   section.append(el('h3',p.name||'Jugador'),el('p',[p.faction,...(p.detachments||[])].filter(Boolean).join(' · '),'roster-meta'));
   const color=MatchView.teamOf(p,side),url=location.origin+'/army-list.html?side='+color;
   const link=el('a','Abrir lista para OBS ↗');link.href=url;link.target='_blank';link.rel='noopener';section.append(link,el('code',url,'roster-url'),el('p','Fuente Navegador: 1920 × 1080. Toda la lista se muestra en una sola pantalla.'));
   section.append(button('Copiar URL '+(color==='blue'?'azul':'roja'),async()=>{try{await navigator.clipboard.writeText(url);feedback.textContent='URL copiada al portapapeles.';}catch{feedback.textContent='No se pudo copiar. Selecciona y copia la URL que aparece arriba.';}}));
   const toolbar=el('div',null,'roster-toolbar');
   const change=()=>{d.dirty=true;d.version=(d.version||0)+1;feedback.textContent='Cambios pendientes…';schedule(p.rosterId);};
   section.append(field('Nombre de la lista',d.name||'',80,v=>{d.name=v;change();}));
   section.append(field('URL de imagen de fondo (opcional)',d.backgroundUrl||'',2048,v=>{d.backgroundUrl=v;change();}));
   toolbar.append(button('Añadir unidad',()=>{if(d.units.length>=80){feedback.textContent='Máximo 80 unidades.';return;}d.units.push({id:crypto.randomUUID(),name:'',enhancement:'',characters:[],notes:'',deepStrike:false,destroyed:false,battleshocked:false});change();render();sectionFor(p.rosterId)?.querySelector('.unit-editor:last-child input')?.focus();}));
   const upload=el('input');upload.type='file';upload.accept='.json,application/json';upload.hidden=true;
   upload.onchange=async()=>{try{const file=upload.files[0];if(!file)return;if(file.size>200000)throw Error('El archivo es demasiado grande.');const json=JSON.parse(await file.text());const units=Array.isArray(json)?json:json.units;if(!Array.isArray(units)||units.length>80)throw Error('El archivo debe contener una lista de hasta 80 unidades.');
    const clean=units.map(u=>{if(typeof u?.name!=='string'||!u.name.trim()||u.name.length>100||!Array.isArray(u.characters??[])||(u.characters??[]).some(c=>typeof c!=='string'||!c.trim()||c.length>80)||(u.characters??[]).length>8||typeof(u.enhancement??'')!=='string'||(u.enhancement??'').length>100||typeof(u.notes??'')!=='string'||(u.notes??'').length>160)throw Error('Una unidad tiene campos inválidos. Consulta el formato del README.');return {id:crypto.randomUUID(),name:u.name,category:u.category||'unit',enhancement:u.enhancement||'',characters:u.characters||[],notes:u.notes||'',deepStrike:u.deepStrike===true,destroyed:u.destroyed===true,battleshocked:u.battleshocked===true};});
    if(d.units.length&&!confirm('¿Reemplazar esta lista con el archivo?'))return;
    d.units=clean;d.name=typeof json.name==='string'?json.name:d.name||'';d.backgroundUrl=typeof json.backgroundUrl==='string'?json.backgroundUrl:d.backgroundUrl||'';change();render();
   }catch(e){feedback.textContent=e.message;}finally{upload.value='';}};
   toolbar.append(button('Importar JSON',()=>upload.click()),upload,button('Exportar JSON',()=>{const a=el('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({name:d.name||'',backgroundUrl:d.backgroundUrl||'',units:d.units},null,2)],{type:'application/json'}));a.download='lista-ejercito.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}));
   section.append(toolbar);
   const list=el('ol',null,'unit-editors');
   d.units.forEach((u,index)=>{
    const row=el('li',null,'unit-editor');const tools=el('div',null,'unit-tools');const handle=button('⠿',()=>{});handle.className='drag-handle';handle.draggable=true;handle.setAttribute('aria-label','Arrastrar '+(u.name||'unidad'));handle.title='Arrastra para ordenar';
    handle.draggable=false;
    handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();handle.setPointerCapture(e.pointerId);dragged={roster:p.rosterId,id:u.id,startY:e.clientY,target:null};row.classList.add('dragging');};
    handle.onpointermove=e=>{if(!dragged||dragged.id!==u.id)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.unit-editor');root.querySelectorAll('.drag-over').forEach(n=>n.classList.remove('drag-over'));if(target&&list.contains(target)){dragged.target=target;dragged.after=e.clientY>target.getBoundingClientRect().top+target.getBoundingClientRect().height/2;target.classList.add('drag-over');}if(e.clientY<70)window.scrollBy(0,-25);else if(e.clientY>innerHeight-70)window.scrollBy(0,25);};
    const finishDrag=e=>{if(!dragged||dragged.id!==u.id)return;const drag=dragged;dragged=null;root.querySelectorAll('.drag-over,.dragging').forEach(n=>n.classList.remove('drag-over','dragging'));if(e.type==='pointercancel'||!drag.target||Math.abs(e.clientY-drag.startY)<4)return;const from=d.units.findIndex(x=>x.id===u.id);let to=[...list.children].indexOf(drag.target)+(drag.after?1:0);const [moved]=d.units.splice(from,1);if(from<to)to--;d.units.splice(to,0,moved);change();render();};
    handle.onpointerup=finishDrag;handle.onpointercancel=finishDrag;
    tools.append(handle);const heading=el('strong',`${index+1}. ${u.name||'Nueva unidad'}`);tools.append(heading);
    for(const [delta,label] of [[-1,'Subir ↑'],[1,'Bajar ↓']]){const b=button(label,()=>{const j=index+delta;[d.units[index],d.units[j]]=[d.units[j],d.units[index]];change();render();});b.disabled=index+delta<0||index+delta>=d.units.length;tools.append(b);}
    tools.append(button('Eliminar',()=>{if(u.name&&!confirm(`¿Eliminar ${u.name}?`))return;d.units.splice(index,1);change();render();}));row.append(tools);
    const details=el('details',null,'unit-fields');details.open=!u.name;details.append(el('summary','Editar nombre, mejora, personajes y notas'));
    const categoryLabel=el('label','Tipo de unidad'),category=el('select');
    for(const [value,label] of [['epic_character','Personaje épico'],['character','Personaje'],['unit','Unidad'],['vehicle','Vehículo'],['monster','Monstruo']]){const option=el('option',label);option.value=value;category.append(option);}
    category.value=u.category||'unit';category.onchange=()=>{u.category=category.value;change();};categoryLabel.append(category);details.append(categoryLabel);
    details.append(field('Nombre de la unidad',u.name,100,v=>{u.name=v;heading.textContent=`${index+1}. ${v||'Nueva unidad'}`;change();}),field('Mejora (opcional)',u.enhancement,100,v=>{u.enhancement=v;change();}),field('Personajes asignados · uno por línea (máximo 8)',u.characters.join('\n'),647,v=>{u.characters=v.split('\n').filter(s=>s.trim());change();},true),field('Notas (opcional)',u.notes,160,v=>{u.notes=v;change();},true));
    row.append(details);
    const flags=el('div',null,'unit-flags');for(const [key,label] of [['deepStrike','En reservas'],['battleshocked','Battleshocked'],['destroyed','Unidad destruida']]){const l=el('label'),box=el('input');box.type='checkbox';box.checked=u[key];box.onchange=()=>{u[key]=box.checked;change();};l.append(box,document.createTextNode(label));flags.append(l);}row.append(flags);list.append(row);
   });
   if(!d.units.length)section.append(el('p','Todavía no hay unidades. Añade la primera o importa una lista.','roster-empty'));
   section.append(list);root.append(section);filterTeam();
  }
 }
 const sectionFor=id=>[...root.children].find(n=>n.dataset.roster===id);
 function schedule(id,delay=600){const d=drafts.get(id);clearTimeout(d.timer);d.timer=setTimeout(()=>save(id),delay);}
 async function save(id){
  const d=drafts.get(id);if(!d||!d.dirty||d.saving)return;
  if(d.units.some(u=>!u.name.trim())){feedback.textContent='Escribe el nombre de cada unidad para guardar automáticamente.';return;}
  const version=d.version;d.saving=true;feedback.textContent='Guardando lista…';let retry=false;
  try{
   const r=await fetch('/rosters/'+encodeURIComponent(id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:d.revision,name:d.name||'',units:d.units,backgroundUrl:d.backgroundUrl||''})});
   const data=await r.json();if(!r.ok){retry=r.status>=500;throw Error(data.error||'No se pudo guardar.');}
   d.revision=data.revision;
   if(typeof data.backgroundUrl!=='string'||typeof data.name!=='string'||data.units.some(u=>typeof u.battleshocked!=='boolean')){retry=true;throw Error('Reinicia npm start para actualizar el servicio. Conservamos los cambios y reintentaremos automáticamente.');}
   if(d.version===version)d.dirty=false;
   feedback.textContent=dirty()?'Cambios pendientes…':'Listas guardadas. OBS actualizado.';
  }catch(e){if(e instanceof TypeError)retry=true;feedback.textContent=e.message+(retry?' Reintentando en unos segundos.':' Los cambios siguen en el editor.');}
  finally{d.saving=false;if(retry)schedule(id,5000);else if(d.dirty&&d.version!==version)schedule(id);}
 }
 window.addEventListener('online',()=>{for(const [id,d] of drafts)if(d.dirty)schedule(id,0);});
 window.addEventListener('layout-saved',load);
 window.addEventListener('remote-list-applied',load);
 window.remoteRostersBusy=()=>[...drafts.values()].some(d=>d.dirty||d.saving);
 window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue='';}});
})();
