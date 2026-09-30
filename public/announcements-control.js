(() => {
  const $ = id => document.getElementById(id);
  const feedback = $('toast-feedback');
  const controls = ['auto-facts','include-lore','include-meta'];
  let settings = null;
  let lastStatus = null;
  function render(status) {
    lastStatus = status;
    settings = status.settings;
    $('auto-facts').checked=settings.enabled; $('include-lore').checked=settings.lore; $('include-meta').checked=settings.meta;
    const minutes = status.remainingMinutes || 0;
    const coverage = `${Math.floor(minutes/60)} h ${minutes%60} min hasta completar este ciclo`;
    const exhausted = status.exhausted ? ' Ciclo completado; el siguiente dato iniciará otro automáticamente.' : '';
    const shortfall = status.remaining < 120 && !status.exhausted ? ' La rotación continúa al completar cada ciclo.' : '';
    const unmatched = status.unmatchedFactions?.length ? ` Sin correspondencia: ${status.unmatchedFactions.join(', ')}.` : '';
    $('rotation-status').textContent = `${settings.enabled ? 'Rotación activada · cada 2 min' : 'Rotación automática pausada'} · ${status.total} datos disponibles (${status.loreTotal} curiosidades + ${status.metaTotal} estadísticas) · ciclo ${status.cycle} · ${status.remaining} pendientes en este ciclo · ${coverage}.${exhausted}${shortfall}${unmatched}${settings.meta && !status.statsAvailable ? ' Listhammer todavía no está disponible; se usarán las curiosidades habilitadas.' : ''}`;
    $('next-fact').disabled=!status.total;
  }
  function preview(toast) {
    if (!toast) return;
    $('last-toast').textContent=toast.title+' '+toast.text;
    const link=$('toast-source'); link.hidden=true; link.removeAttribute('href');
    if (toast.sourceUrl) {
      try {const url=new URL(toast.sourceUrl);if(url.protocol==='https:'){link.href=url.href;link.textContent='Fuente: '+(toast.sourceTitle || url.hostname);link.hidden=false;}} catch {}
    }
  }
  async function request(route, body={}) {
    const response=await fetch('/toasts/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json(); if(!response.ok) throw new Error(result.error || 'No se pudo actualizar.');
    render(result.status); if(result.toast) preview(result.toast); return result;
  }
  async function action(button, work) {
    button.disabled=true;
    try {await work();} catch(error) {feedback.textContent=error.message || 'Servidor no disponible.';}
    finally {button.disabled=false; if(lastStatus) render(lastStatus);}
  }
  $('toast-message').addEventListener('input',()=>{$('message-count').textContent=$('toast-message').value.length+' / 280';});
  $('message-form').addEventListener('submit', event => {
    event.preventDefault(); action(event.submitter,async()=>{await request('message',{text:$('toast-message').value});feedback.textContent='Mensaje enviado al overlay durante 15 segundos.';});
  });
  $('next-fact').addEventListener('click',event=>action(event.currentTarget,async()=>{await request('next');feedback.textContent='Siguiente dato enviado al overlay durante 15 segundos.';}));
  controls.forEach(id=>$(id).addEventListener('change',async()=>{
    controls.forEach(id=>$(id).disabled=true);
    try {await request('config',{enabled:$('auto-facts').checked,lore:$('include-lore').checked,meta:$('include-meta').checked});feedback.textContent='Opciones guardadas.';}
    catch(error){feedback.textContent=error.message;if(lastStatus)render(lastStatus);}
    finally{controls.forEach(id=>$(id).disabled=false);}
  }));
  $('new-toast-session').addEventListener('click',event=>action(event.currentTarget,async()=>{
    await request('reset');$('last-toast').textContent='Nueva sesión: el historial de mensajes está vacío.';$('toast-source').hidden=true;feedback.textContent='Nueva sesión de mensajes iniciada. La partida se conserva.';
  }));
  const events=new EventSource('/toasts/events?client=control');
  events.addEventListener('status',event=>render(JSON.parse(event.data)));
  events.addEventListener('toast',event=>preview(JSON.parse(event.data)));
  events.onerror=()=>{feedback.textContent='Sin conexión con el servidor. Intentando reconectar…';};
  events.onopen=()=>{feedback.textContent='Panel de mensajes conectado.';};
  window.addEventListener('pagehide',()=>events.close());
})();
