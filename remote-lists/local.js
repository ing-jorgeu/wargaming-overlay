const fs=require('node:fs'),path=require('node:path');const {validateUnits,validateName}=require('../rosters');const {cleanList}=require('./importer');const {readJSON}=require('./backend');
function backendURL(value){let u;try{u=new URL(value);}catch{throw Error('Dirección del backend inválida.');}if(u.username||u.password||u.search||u.hash||u.pathname!=='/'||!(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname))))throw Error('Usa HTTPS, o HTTP localhost para pruebas, sin rutas ni credenciales en la URL.');return u.origin;}
function createLocalRemote({enabled,dataDir,env=process.env,getSnapshot,applyRoster,fetchImpl=fetch,pollIntervalMs=5000,log=console.log}){
 const configFile=path.join(dataDir,'remote-lists-config.json'),pendingFile=path.join(dataDir,'remote-lists-pending.json');let config={},pending={},locked=false,timer=null,stopped=true,lastStatus=null,lastError='',appliedVersion=0;
 if(enabled){try{config=JSON.parse(fs.readFileSync(configFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}try{pending=JSON.parse(fs.readFileSync(pendingFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}if(env.REMOTE_LISTS_URL)config.url=backendURL(env.REMOTE_LISTS_URL);if(env.REMOTE_LISTS_MANAGER_TOKEN)config.token=env.REMOTE_LISTS_MANAGER_TOKEN;}
 const configured=()=>!!config.url&&typeof config.token==='string'&&config.token.length>=24;
 function write(file,value){fs.writeFileSync(file+'.tmp',JSON.stringify(value),{mode:0o600});fs.renameSync(file+'.tmp',file);fs.chmodSync(file,0o600);}
 const view=()=>({enabled,configured:configured(),url:config.url||'',links:configured()?{blue:config.url+'/blue',red:config.url+'/red'}:{},automatic:!stopped,lastError,appliedVersion,status:lastStatus?publicStatus(lastStatus):undefined,pending:Object.fromEntries(Object.entries(pending).map(([s,p])=>[s,{name:p.list.name,count:p.list.units.length}]))});
 function publicStatus(status){return Object.fromEntries(['blue','red'].map(side=>[side,{...status[side],confirmed:undefined}]));}
 async function synchronize(){
  const before=getSnapshot(),revisions=JSON.stringify(before),status=await remote('status');lastStatus=status;
  if(JSON.stringify(getSnapshot())!==revisions)throw Error('La lista local cambió; se reintentará automáticamente.');
  const changes=[];
  for(const side of ['blue','red']){
   const list=status[side]?.confirmed;if(!list)continue;
   const player=Object.entries(before.players).find(([position,p])=>(p.team||(position==='left'?'blue':'red'))===side)?.[1];
   if(!player)continue;const old=before.rosters[player.rosterId];if(old?.remoteImportId===list.id)continue;
   if(typeof list.id!=='string'||!list.id||list.id.length>80)throw Error('Lista remota inválida.');
   const clean=cleanList(list);changes.push({side,id:player.rosterId,roster:{revision:(old?.revision||0)+1,name:clean.name,units:clean.units,backgroundUrl:old?.backgroundUrl||'',remoteImportId:list.id},metadata:{playerName:clean.playerName,formation:clean.formation,faction:clean.armyFaction,detachments:clean.detachments}});
  }
  for(const change of changes)applyRoster(change.id,change.roster,change.metadata);
  if(changes.length){appliedVersion++;log('[Listas] Actualizadas automáticamente: '+changes.map(c=>c.side).join(', '));}
  pending={};write(pendingFile,pending);lastError='';
  return {...view(),synced:changes.map(c=>c.side),warnings:Object.fromEntries(['blue','red'].map(side=>[side,status[side]?.confirmed?.warnings||[]]))};
 }
 async function poll(){
  if(stopped)return;
  try{if(enabled&&configured()&&!locked){locked=true;try{await synchronize();}finally{locked=false;}}}
  catch(e){const message=e instanceof TypeError?'No se pudo conectar con el backend remoto.':e.message;if(lastError!==message)log('[Listas] '+message);lastError=message;}
  finally{if(!stopped){timer=setTimeout(poll,pollIntervalMs);timer.unref?.();}}
 }
 function start(){if(!enabled||!stopped)return;stopped=false;void poll();}
 function stop(){stopped=true;clearTimeout(timer);}
 async function remote(route,body){if(!configured())throw Error('Configura la dirección y credencial del backend.');const r=await fetchImpl(config.url+'/api/manager/'+route,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+config.token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});let chunks=[],size=0;for await(const chunk of r.body){size+=chunk.length;if(size>500000)throw Error('Respuesta remota demasiado grande.');chunks.push(chunk);}const value=JSON.parse(Buffer.concat(chunks));if(!r.ok)throw Error(value.error||'Error del backend remoto.');return value;}
 async function handle(req,res,url){
  const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  if(!enabled){reply(url.pathname==='/remote-lists'&&req.method==='GET'?200:404,{enabled:false});return;}
  // JSON-only same-origin writes prevent a foreign site from controlling the local proxy.
  if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host){reply(403,{error:'Origen no permitido.'});return;}
  if(!['127.0.0.1','localhost','[::1]'].includes((req.headers.host||'').split(':')[0])&&!(req.headers.host||'').startsWith('[::1]:')){reply(403,{error:'Host no permitido.'});return;}
  try{
   if(req.method==='GET'&&url.pathname==='/remote-lists')return reply(200,view());
   if(req.method==='GET'&&url.pathname==='/remote-lists/status'){if(!stopped)return reply(200,view());const status=await remote('status');return reply(200,{...view(),status:{blue:status.blue&&{...status.blue,confirmed:undefined},red:status.red&&{...status.red,confirmed:undefined},reservedTokens:status.reservedTokens,tokenBudget:status.tokenBudget}});}
   const qr=url.pathname.match(/^\/remote-lists\/qr\/(blue|red)\.svg$/);
   if(qr&&req.method==='GET'){if(!configured())throw Error('Configura el backend en el GUI.');const svg=await require('qrcode').toString(config.url+'/'+qr[1],{type:'svg',margin:4,errorCorrectionLevel:'M',width:220});res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-store'});return res.end(svg);}
   if(req.method!=='POST')return reply(404,{error:'Ruta no encontrada.'});
   if(locked)return reply(409,{error:'Espera a que termine la operación anterior.'});locked=true;
   try{
    const input=await readJSON(req,4096);
    if(url.pathname==='/remote-lists/config'){
     const token=input.token||config.token;if(typeof token!=='string'||token.length<24||token.length>1024)throw Error('La credencial debe tener de 24 a 1024 caracteres.');
     config={url:backendURL(input.url),token};write(configFile,config);pending={};write(pendingFile,pending);return reply(200,view());
    }
    if(url.pathname==='/remote-lists/gate'){
     if(!['blue','red'].includes(input.side)||typeof input.open!=='boolean')throw Error('Estado de subida inválido.');const status=await remote(input.side+'/gate',{open:input.open});lastStatus=status;return reply(200,{...view(),status:{blue:{...status.blue,confirmed:undefined},red:{...status.red,confirmed:undefined}}});
    }
    if(url.pathname==='/remote-lists/sync'){
     return reply(200,await synchronize());
    }
    if(url.pathname==='/remote-lists/apply'){
     const p=pending[input.side];if(!['blue','red'].includes(input.side)||!p)throw Error('No hay lista pendiente para ese lado.');
     const snapshot=getSnapshot(),localSide=input.side==='blue'?'left':'right',player=Object.entries(snapshot.players).find(([position,p])=>(p.team||(position==='left'?'blue':'red'))===input.side)?.[1],old=snapshot.rosters[p.rosterId];
     if(player.rosterId!==p.rosterId||(old?.revision||0)!==p.revision)return reply(409,{error:'La lista local o los jugadores cambiaron. Guarda tus cambios y vuelve a sincronizar.'});
     applyRoster(p.rosterId,{revision:p.revision+1,name:p.list.name,units:p.list.units,backgroundUrl:old?.backgroundUrl||'',remoteImportId:p.list.id});delete pending[input.side];write(pendingFile,pending);return reply(200,view());
    }
    return reply(404,{error:'Ruta no encontrada.'});
   }finally{locked=false;}
  }catch(e){reply(400,{error:e instanceof TypeError?'No se pudo conectar con el backend remoto.':e.message});}
 }
 return {handle,start,stop};
}
module.exports={createLocalRemote,backendURL};
