const fs=require('node:fs/promises'),path=require('node:path');const {createHash}=require('node:crypto');
const TTL=7*24*60*60*1000,MAX_CONTEXT=24000;
const FACTIONS=['adepta-sororitas','adeptus-custodes','adeptus-mechanicus','astra-militarum','grey-knights','imperial-agents','imperial-knights','space-marines','chaos-daemons','chaos-knights','chaos-space-marines','death-guard','emperors-children','thousand-sons','world-eaters','aeldari','drukhari','genestealer-cults','leagues-of-votann','necrons','orks','tau-empire','tyranids'];
const normalize=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function plain(html){return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<br\s*\/?>|<\/li>|<\/div>|<\/p>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff?String.fromCodePoint(v):' ';}).replace(/&(nbsp|amp|quot|apos|lt|gt|rsquo|ndash|mdash);/g,(_,n)=>({nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',rsquo:'’',ndash:'–',mdash:'—'})[n]).replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim();}
function checkedURL(value){const u=new URL(value);if(u.protocol!=='https:'||!['wahapedia.ru','www.wahapedia.ru'].includes(u.hostname)||!/^\/wh40k11ed\/factions\/[a-z-]+\/(?:[A-Za-z0-9-]+(?:\.html)?)?$/.test(u.pathname)||u.search||u.hash||u.username||u.password)throw Error('Referencia fuera de 11.ª edición.');return u.href;}
function extractSheet(html,url){checkedURL(url);const title=plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');if(!/11th edition/i.test(title)||/10th edition/i.test(title))throw Error('La ficha no acredita 11.ª edición.');
 const text=plain(html),options=text.indexOf('WARGEAR OPTIONS'),composition=text.indexOf('UNIT COMPOSITION');if(composition<0)throw Error('Ficha sin equipo u opciones identificables.');
 const section=start=>{const rest=text.slice(start);const markers=['CORE','ARMY RULES','ABILITIES','KEYWORDS','YOUR 1ST','YOUR 4TH','POINTS COST','STRATAGEMS','YOUR UNIT COSTS','SUPREME COMMANDER','LEADER','ATTACHED UNIT','WARGEAR OPTIONS','UNIT COMPOSITION'];const end=Math.min(...markers.map(m=>{const i=rest.indexOf(m,20);return i<0?rest.length:i;}));return rest.slice(0,end).trim();};
 const optionText=options<0?'':section(options);const result=(optionText?optionText+'\n':'')+section(composition);if(result.length>4000||!/equipped with/i.test(result))throw Error('Ficha de equipo incompleta o demasiado extensa.');return {title,text:result,hasOptions:!!optionText&&!/WARGEAR OPTIONS\s*(?:None|None\.|–|—|N\/A)\s*$/i.test(optionText),options:optionText};
}
function extractIndex(html,url){checkedURL(url);const title=plain(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');if(!/11th edition/i.test(title))throw Error('Índice de otra edición.');const prefix=new URL(url).pathname;const found=new Map();
 for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){let u;try{u=new URL(m[1],url);checkedURL(u.href);}catch{continue;}if(!u.pathname.startsWith(prefix)||u.pathname===prefix)continue;const slug=u.pathname.slice(prefix.length);if(slug.includes('/')||['datasheets.html','index.html','army-rules','detachments'].includes(slug))continue;const name=plain(m[2]);if(name&&!name.includes('\n')&&name.length<120){found.set(normalize(name),u.href);found.set(normalize(slug.replace(/\.html$/,'')),u.href);}}
 if(!found.size)throw Error('No se encontraron fichas de 11.ª.');return Object.fromEntries(found);
}
function createReferences({cacheDir,fetchImpl=fetch,now=Date.now}){
 const inflight=new Map();
 async function readPage(url,kind){url=checkedURL(url);const file=path.join(cacheDir,createHash('sha256').update(url).digest('hex')+'.json');
  try{const entry=JSON.parse(await fs.readFile(file,'utf8'));if(entry.edition===11&&entry.url===url&&entry.kind===kind&&Number.isFinite(entry.fetchedAt)&&now()>=entry.fetchedAt&&now()-entry.fetchedAt<TTL)return entry.value;await fs.rm(file,{force:true});}catch(e){if(e.code!=='ENOENT')await fs.rm(file,{force:true});}
  if(inflight.has(url))return inflight.get(url);
  const task=(async()=>{
   // Never follow redirects to another host or edition; validate every hop.
   let target=url,r;for(let i=0;i<4;i++){r=await fetchImpl(target,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'User-Agent':'wargaming-overlay-list-importer/1.0'}});if([301,302,303,307,308].includes(r.status)){target=checkedURL(new URL(r.headers.get('location'),target).href);continue;}break;}
   if(!r?.ok)throw Error('No se pudo descargar la referencia.');checkedURL(target);
   const chunks=[];let size=0;for await(const chunk of r.body){size+=chunk.length;if(size>2500000)throw Error('Referencia demasiado grande.');chunks.push(chunk);}const html=Buffer.concat(chunks).toString('utf8');const value=kind==='index'?extractIndex(html,url):extractSheet(html,target);
   await fs.mkdir(cacheDir,{recursive:true,mode:0o700});const temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify({edition:11,url,kind,fetchedAt:now(),value}),{mode:0o600});await fs.rename(temp,file);return value;
  })();inflight.set(url,task);try{return await task;}finally{inflight.delete(url);}
 }
 async function lookup(faction,units){const references=[],warnings=[],covered=new Set();if(!FACTIONS.includes(faction))return {references,warnings:['No se identificó una facción de 11.ª: no se mostrará equipo sin verificar.'],covered};
  let index;try{index=await readPage('https://wahapedia.ru/wh40k11ed/factions/'+faction+'/','index');}catch{return {references,warnings:['No se pudo obtener el índice vigente de 11.ª. No se mostrará equipo sin verificar.'],covered};}
  const unique=new Map();units.forEach((u,i)=>{const url=index[normalize(u.referenceName||u.name)];if(url){if(!unique.has(url))unique.set(url,[]);unique.get(url).push(i);}else warnings.push('Sin ficha de 11.ª para '+u.name+'. Revisa su equipo.');});
  let used=0;const entries=[...unique.entries()];
  // Bound source requests and work concurrently in small batches.
  for(let start=0;start<Math.min(entries.length,16);start+=4){const batch=await Promise.all(entries.slice(start,start+4).map(async([url,indices])=>{try{return {url,indices,sheet:await readPage(url,'sheet')};}catch{return {url,indices};}}));for(const item of batch){if(!item.sheet||used+Buffer.byteLength(JSON.stringify(item))>MAX_CONTEXT){warnings.push('Referencia no disponible o límite de contexto: '+units[item.indices[0]].name+'. Revisa el equipo.');continue;}used+=Buffer.byteLength(JSON.stringify(item));references.push(item);item.indices.forEach(i=>covered.add(i));}}
  if(entries.length>16)warnings.push('Se alcanzó el máximo de 16 fichas distintas. Las demás unidades no mostrarán equipo sin verificar.');return {references,warnings,covered};
 }
 return {lookup,readPage};
}
module.exports={createReferences,extractSheet,extractIndex,checkedURL,TTL,FACTIONS,MAX_CONTEXT};
