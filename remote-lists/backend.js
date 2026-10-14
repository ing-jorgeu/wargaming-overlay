const {isIP}=require('node:net');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {timingSafeEqual,randomUUID}=require('node:crypto');const {cleanList,tokenReservation}=require('./importer');
const sides=['blue','red'];
function fail(message,status=400){return Object.assign(Error(message),{status});}
function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
async function readJSON(req,limit=16000){if(!String(req.headers['content-type']||'').startsWith('application/json'))throw fail('Se requiere JSON.',415);let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>limit)throw fail('El texto supera el tamaño máximo.',413);chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks));}catch{throw fail('JSON inválido.');}}
function createRemoteServer({dataDir,managerToken,importer,tokenBudget=500000,maxImports=2,maxOutputTokens=4000,openMinutes=30,demo=false,trustProxy=false,now=Date.now}){
 if(typeof managerToken!=='string'||managerToken.length<24)throw Error('REMOTE_LISTS_MANAGER_TOKEN debe tener al menos 24 caracteres.');
 for(const n of [tokenBudget,maxImports,maxOutputTokens,openMinutes])if(!Number.isSafeInteger(n)||n<1)throw Error('Límites remotos inválidos.');
 if(!dataDir||typeof importer!=='function')throw Error('Falta configuración del backend.');
 fs.mkdirSync(dataDir,{recursive:true,mode:0o700});const file=path.join(dataDir,'lists.json');
 let data={reservedTokens:0,blue:{generation:0,attempts:0,openUntil:0,confirmed:null},red:{generation:0,attempts:0,openUntil:0,confirmed:null}};
 try{const saved=JSON.parse(fs.readFileSync(file,'utf8'));if(!Number.isSafeInteger(saved.reservedTokens)||saved.reservedTokens<0||sides.some(s=>!saved[s]||!Number.isSafeInteger(saved[s].generation)||!Number.isSafeInteger(saved[s].attempts)))throw Error('Estado remoto inválido.');data=saved;}catch(e){if(e.code!=='ENOENT')throw e;}
 // Restart never silently reopens public upload gates; budget remains charged.
 for(const side of sides){data[side].openUntil=0;delete data[side].draft;}
 const busy=new Set(),rates=new Map();
 function save(){fs.writeFileSync(file+'.tmp',JSON.stringify(data),{mode:0o600});fs.renameSync(file+'.tmp',file);}
 save();
 const isOpen=s=>data[s].openUntil>now();
 const publicStatus=s=>({demo,open:isOpen(s),busy:busy.has(s),attemptsRemaining:Math.max(0,maxImports-data[s].attempts),maxTextLength:6000});
 const managerStatus=()=>({reservedTokens:data.reservedTokens,tokenBudget,...Object.fromEntries(sides.map(s=>[s,{...publicStatus(s),confirmed:data[s].confirmed}]))});
 function authorize(req){const a=Buffer.from(req.headers.authorization||''),b=Buffer.from('Bearer '+managerToken);if(a.length!==b.length||!timingSafeEqual(a,b))throw fail('No autorizado.',401);}
 function rate(req){const forwarded=String(req.headers['x-forwarded-for']||'').trim();const ip=trustProxy&&isIP(forwarded)?forwarded:req.socket.remoteAddress||'unknown',time=now();for(const [key,r] of rates)if(r.until<time)rates.delete(key);let r=rates.get(ip);if(!r){if(rates.size>=10000)throw fail('Demasiadas solicitudes.',429);r={count:0,until:time+60000};rates.set(ip,r);}if(++r.count>60)throw fail('Espera un minuto antes de reintentar.',429);}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try{
   const url=new URL(req.url,'http://backend');
   if(url.pathname==='/factions.json'&&req.method==='GET')return send(res,200,require('../public/factions.json'));
   if(url.pathname==='/health'&&req.method==='GET')return send(res,200,{ok:true});
   if(url.pathname.startsWith('/api/manager/')){
    authorize(req);
    if(url.pathname==='/api/manager/status'&&req.method==='GET')return send(res,200,managerStatus());
    const side=url.pathname.match(/^\/api\/manager\/(blue|red)\/gate$/)?.[1];
    if(side&&req.method==='POST'){
     const input=await readJSON(req);if(typeof input.open!=='boolean')throw fail('Estado de subida inválido.');
     const slot=data[side];slot.generation++;delete slot.draft;slot.openUntil=input.open?now()+openMinutes*60000:0;if(input.open)slot.attempts=0;save();return send(res,200,managerStatus());
    }
    throw fail('Ruta no encontrada.',404);
   }
   rate(req);
   const side=url.pathname.match(/^\/api\/(blue|red)\/(status|import)$/)?.[1];
   const action=url.pathname.split('/').at(-1);
   if(side&&action==='status'&&req.method==='GET')return send(res,200,publicStatus(side));
   if(side&&action==='import'&&req.method==='POST'){
    if(!isOpen(side))throw fail('La subida está deshabilitada. Pide al manager que la habilite.',403);
    const input=await readJSON(req);const slot=data[side];
    if(!isOpen(side))throw fail('La subida se cerró.',403);
    if(typeof input.playerName!=='string'||!input.playerName.trim()||input.playerName.length>80||/[\x00-\x1f\x7f]/.test(input.playerName))throw fail('Indica tu nombre (1–80 caracteres).');
    if(typeof input.text!=='string'||!input.text.trim()||input.text.length>6000)throw fail('Pega una lista de 1 a 6000 caracteres.');
    if(busy.has(side))throw fail('Ya se está interpretando una lista de este lado.',409);
    if(slot.attempts>=maxImports)throw fail('Se agotaron los intentos. Pide al manager que vuelva a habilitar la subida.',429);
    const reserveTokens=amount=>{if(!isOpen(side)||slot.generation!==generation)throw fail('La subida se cerró.',409);if(!Number.isSafeInteger(amount)||amount<1||data.reservedTokens+amount>tokenBudget)throw fail('Se alcanzó el presupuesto del servicio. Contacta al manager.',429);data.reservedTokens+=amount;save();};
    const generation=slot.generation;
    if(!importer.reservesCalls)reserveTokens(tokenReservation(input.text,maxOutputTokens));
    slot.attempts++;delete slot.draft;save();busy.add(side);
    try{
     let list;try{list=cleanList(await importer(input.text,{reserveTokens}));}catch(e){if(e.status)throw e;console.error(JSON.stringify({event:'list_import_failed',phase:e.importPhase||'validation',reason:['upstream_http','output_limit','incomplete_response'].includes(e.diagnostic)?e.diagnostic:'invalid_result',...(Number.isInteger(e.upstreamStatus)?{upstreamStatus:e.upstreamStatus}:{})}));throw fail('No se pudo interpretar la lista. Puedes reintentar si quedan intentos.',502);}
     if(!isOpen(side)||slot.generation!==generation)throw fail('El manager cerró o cambió la subida. No se guardó esta interpretación.',409);
     const formation=['Take and Hold','Purge the Foe','Disruption','Reconnaissance','Priority Assets'].find(f=>input.text.split(/\r?\n/).some(line=>line.trim().toLowerCase()===f.toLowerCase()));
     slot.confirmed={...list,playerName:input.playerName.trim(),formation:formation||list.formation,id:randomUUID(),updatedAt:new Date(now()).toISOString()};slot.openUntil=0;delete slot.draft;save();return send(res,200,{ok:true});
    }finally{busy.delete(side);}
   }
   const staticFiles={'/blue':'player.html','/red':'player.html','/player.js':'player.js','/player.css':'player.css'};
   if(req.method==='GET'&&staticFiles[url.pathname]){const f=staticFiles[url.pathname];res.writeHead(200,{'Content-Type':f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8'});return res.end(fs.readFileSync(path.join(__dirname,'public',f)));}
   throw fail('Ruta no encontrada.',404);
  }catch(e){send(res,e.status||400,{error:e.status?e.message:'No se pudo procesar la solicitud.'});}
 });
 server.requestTimeout=70000;server.headersTimeout=15000;
 return server;
}
module.exports={createRemoteServer,readJSON};
