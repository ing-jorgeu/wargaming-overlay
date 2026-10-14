(()=>{
 const root=document.getElementById('remote-lists-panel');let state,busy=false;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 async function request(route='',body){const r=await fetch('/remote-lists'+route,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(d.error||'No se pudo completar la operación.');return d;}
 async function act(fn){if(busy)return;busy=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);try{state=await fn();render();}catch(e){root.querySelector('[role=status]').textContent=e.message;}finally{busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 function render(){root.replaceChildren();root.hidden=!state.enabled;if(!state.enabled)return;
  root.append(el('h3','Listas desde los teléfonos'));const status=el('p');status.setAttribute('role','status');root.append(status);
  const form=el('form'),url=el('input'),token=el('input');url.type='url';url.placeholder='https://tu-backend';url.value=state.url||'';url.required=true;token.type='password';token.placeholder=state.configured?'Credencial guardada (dejar vacío para conservar)':'Credencial del manager';token.autocomplete='off';
  const field=(label,input)=>{const l=el('label',label);l.append(input);return l;};form.append(field('Dirección del backend',url),field('Credencial del manager',token));const save=el('button','Guardar conexión');form.append(save);form.onsubmit=e=>{e.preventDefault();act(()=>request('/config',{url:url.value,token:token.value}));};root.append(form);
  if(!state.configured)return;
  for(const side of ['blue','red']){
   const row=el('div'),label=side==='blue'?'azul':'rojo',link=el('a','Enlace del jugador '+label);link.href=state.links[side];link.target='_blank';link.rel='noopener';row.append(link);
   const copy=el('button','Copiar enlace');copy.type='button';copy.onclick=()=>navigator.clipboard.writeText(state.links[side]).catch(()=>{status.textContent='Copia este enlace: '+state.links[side];});row.append(copy);
   const open=state.status?.[side]?.open===true,gate=el('button',(open?'Deshabilitar':'Habilitar')+' subida '+label);gate.type='button';gate.onclick=()=>act(()=>request('/gate',{side,open:!open}));row.append(gate);
   if(state.warnings?.[side]?.length){const warnings=el('ul');for(const warning of state.warnings[side])warnings.append(el('li',warning));row.append(warnings);}root.append(row);
  }
  const sync=el('button','Sincronizar listas');sync.type='button';sync.onclick=()=>act(async()=>{if(window.remoteRostersBusy?.())throw Error('Espera a que se guarden los cambios manuales antes de sincronizar.');const next=await request('/sync',{});window.dispatchEvent(new Event('remote-list-applied'));const status=await request('/status');return {...next,status:status.status};});root.append(sync);
  status.textContent=state.synced?(state.synced.length?'Listas actualizadas: '+state.synced.map(s=>s==='blue'?'azul':'rojo').join(' y ')+'.':'Las listas ya están actualizadas.') : state.status?'Azul: '+(state.status.blue.open?'abierto':'cerrado')+' · Rojo: '+(state.status.red.open?'abierto':'cerrado'):'Pulsa Sincronizar para actualizar las listas en el overlay.';
 }
 request().then(async d=>{state=d;if(d.enabled&&d.configured){try{state=await request('/status');}catch{}}render();}).catch(()=>{});
})();
