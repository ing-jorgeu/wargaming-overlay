(()=>{
 const $=id=>document.getElementById(id),side=location.pathname.slice(1);let busy=false,uploaded=false;
 $('title').textContent='Lista del jugador '+(side==='blue'?'azul':'rojo');
 async function request(action,body){const r=await fetch('/api/'+side+'/'+action,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.error||'No se pudo subir la lista.');return data;}
 async function status(){try{const s=await request('status');$('mode').hidden=!s.demo;$('mode').textContent='Modo de prueba: se guardará una lista de ejemplo.';if(!busy&&!uploaded){$('status').textContent=s.open?'Pega tu lista y pulsa Subir lista.':'Subida cerrada. Pide al manager que la habilite.';$('import-form').hidden=!s.open;}}catch{if(!busy&&!uploaded)$('status').textContent='No se pudo conectar. Recarga para reintentar.';}}
 $('import-form').onsubmit=async e=>{
  e.preventDefault();if(busy||uploaded)return;busy=true;$('interpret').disabled=true;$('text').disabled=true;$('player-name').disabled=true;$('loading').hidden=false;$('import-form').setAttribute('aria-busy','true');$('status').textContent='Analizando y guardando tu lista…';
  try{await request('import',{text:$('text').value,playerName:$('player-name').value.trim()});uploaded=true;$('import-form').hidden=true;$('status').textContent='✓ Lista subida correctamente.';}
  catch(e){$('status').textContent=e.message;}
  finally{busy=false;$('interpret').disabled=false;$('text').disabled=false;$('player-name').disabled=false;$('loading').hidden=true;$('import-form').setAttribute('aria-busy','false');}
 };
 status();setInterval(()=>{if(!busy&&!uploaded)status();},15000);
})();
