// Log state transitions, never every polling cycle or score update.
function createReaderStatus(log=console.log){
 let last=null;
 return incoming=>{
  const transport=incoming.transport==='wifi'?'Wi-Fi':incoming.transport==='usb'?'USB':'conexión desconocida';
  let key,message;
  if(incoming.connected){
   const names=(incoming.players||[]).map(p=>p.name).join(' vs ');
   key=JSON.stringify(['reading',transport,names,incoming.round]);
   message=`Leyendo teléfono por ${transport}: ${names} · ronda ${incoming.round}. Actualización automática activa.`;
  }else{
   const phone=incoming.phoneConnected?`Teléfono conectado por ${transport}; lectura pendiente`:'Sin lectura del teléfono';
   key=JSON.stringify(['waiting',incoming.phoneConnected,transport,incoming.error]);
   message=`${phone}: ${incoming.error||'buscando conexión USB o Wi-Fi; se reintentará automáticamente.'}`;
  }
  if(key!==last){log(message);last=key;}
 };
}
module.exports={createReaderStatus};
