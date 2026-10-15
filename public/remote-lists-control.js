(()=>{
 const root=document.getElementById('remote-lists-panel');let state,busy=false,selectedTeam='blue',version,signature;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 async function request(route='',body){const r=await fetch('/remote-lists'+route,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(d.error||'No se pudo completar la operación.');return d;}
 function changed(next){if(version!==undefined&&next.appliedVersion!==version)window.dispatchEvent(new Event('remote-list-applied'));version=next.appliedVersion;const nextSignature=JSON.stringify(next);if(nextSignature===signature)return;signature=nextSignature;state=next;render();}
 async function gate(side,open){if(busy)return;busy=true;try{changed(await request('/gate',{side,open}));}catch(e){root.querySelector('[role=status]').textContent=e.message;}finally{busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 function render(){root.replaceChildren();root.hidden=!state.enabled;if(!state.enabled)return;
  root.append(el('h3','Subir lista desde el teléfono'));const status=el('p');status.setAttribute('role','status');root.append(status);
  if(!state.configured){status.textContent='Configura el backend y la credencial en la app de escritorio.';return;}
  for(const side of ['blue','red']){
   const row=el('div');row.className='remote-upload';row.dataset.playerTeam=side;row.hidden=side!==selectedTeam;
   const label=side==='blue'?'azul':'rojo',link=el('a');link.className='upload-qr';link.href=state.links[side];link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Abrir subida del jugador '+label+' en una pestaña nueva');
   const image=el('img');image.src='/remote-lists/qr/'+side+'.svg';image.width=220;image.height=220;image.alt='QR para subir la lista del jugador '+label;link.append(image);row.append(link);
   const info=el('div');info.append(el('p','Escanea el QR o haz clic para subir la lista.'));
   const open=state.status?.[side]?.open===true,button=el('button',open?'Deshabilitar subida':'Habilitar subida');button.type='button';button.disabled=busy;button.onclick=()=>gate(side,!open);info.append(button);
   info.append(el('p',state.status?.[side]?.busy?'Analizando lista…':open?'Subida abierta. Se cerrará al recibir la lista.':'Subida cerrada. Habilítala para recibir otra lista.'));row.append(info);root.append(row);
  }
  status.textContent=state.lastError?state.lastError+' Se reintentará automáticamente.':'Sincronización automática activa. Las listas recibidas se aplican sin intervención.';
 }
 window.addEventListener('player-tab',e=>{selectedTeam=e.detail;root.querySelectorAll('[data-player-team]').forEach(n=>n.hidden=n.dataset.playerTeam!==selectedTeam);});
 async function refresh(){try{if(!busy)changed(await request('/status'));}catch(e){if(state?.enabled){const status=root.querySelector('[role=status]');if(status)status.textContent=e.message;}}finally{setTimeout(refresh,3000);}}
 request().then(d=>{changed(d);if(d.enabled)refresh();}).catch(()=>{});
})();
