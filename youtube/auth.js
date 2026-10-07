const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const SCOPE='https://www.googleapis.com/auth/youtube.readonly';
const credentialDir=()=>path.join(os.homedir(),'.config','wargaming-overlay','youtube');
function privateWrite(file,value){
 fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
 const tmp=file+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';
 try{fs.writeFileSync(tmp,JSON.stringify(value),{mode:0o600,flag:'wx'});fs.renameSync(tmp,file);}finally{try{fs.unlinkSync(tmp)}catch{}}
}
function read(file){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw Error('No se pueden leer las credenciales locales de YouTube.');}}
function clientConfig(json){
 const c=json?.installed;
 if(!c?.client_id || !c.client_secret)throw Error('Usa el JSON OAuth de tipo Aplicación de escritorio de Google.');
 return {client_id:c.client_id,client_secret:c.client_secret};
}
class Auth {
 constructor({dir=credentialDir(),fetchImpl=fetch,now=Date.now}={}){this.dir=dir;this.fetch=fetchImpl;this.now=now;this.pending=null;}
 load(){const c=read(path.join(this.dir,'client.json'));if(!c)throw Error('Configura OAuth: wargaming-overlay youtube-auth --client-secret /ruta/client.json');return c;}
 async exchange(params,signal){
  const response=await this.fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams(params),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
  const data=await response.json();
  if(!response.ok || !data.access_token)throw Error(data.error==='invalid_grant'?'Autorización revocada o vencida. Ejecuta youtube-auth de nuevo.':'No se pudo obtener autorización de Google; se reintentará.');
  return data;
 }
 save(data,old={}){
  const tokens={refresh_token:data.refresh_token||old.refresh_token,access_token:data.access_token,expires_at:this.now()+Number(data.expires_in||3600)*1000,scope:data.scope||old.scope||SCOPE};
  if(!tokens.refresh_token)throw Error('Google no entregó refresh token. Autoriza de nuevo con youtube-auth.');
  if(!tokens.scope.split(' ').includes(SCOPE))throw Error('No se concedió el permiso de lectura de YouTube.');
  privateWrite(path.join(this.dir,'tokens.json'),tokens);return tokens;
 }
 async token(signal){
  const t=read(path.join(this.dir,'tokens.json'));
  if(!t?.refresh_token)throw Error('YouTube sin autorizar. Ejecuta wargaming-overlay youtube-auth --client-secret /ruta/client.json');
  if(t.access_token && t.expires_at>this.now()+60000)return t.access_token;
  if(!this.pending)this.pending=(async()=>{const c=this.load();return this.save(await this.exchange({...c,grant_type:'refresh_token',refresh_token:t.refresh_token},signal),t).access_token;})().finally(()=>{this.pending=null;});
  return this.pending;
 }
 invalidate(){const file=path.join(this.dir,'tokens.json'),t=read(file);if(t)privateWrite(file,{...t,expires_at:0});}
 async authorize(clientFile,{open=url=>{const child=spawn(process.platform==='darwin'?'open':process.platform==='win32'?'explorer.exe':'xdg-open',[url],{stdio:'ignore',shell:false});child.on('error',()=>{});child.unref();},log=console.log,timeoutMs=180000}={}){
  const c=clientFile?clientConfig(read(path.resolve(clientFile))):this.load();
  const state=crypto.randomBytes(24).toString('hex'),verifier=crypto.randomBytes(32).toString('base64url');
  const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
  let resolveCode,rejectCode;
  const codePromise=new Promise((resolve,reject)=>{resolveCode=resolve;rejectCode=reject;});
  const server=http.createServer((req,res)=>{
   const u=new URL(req.url,'http://127.0.0.1');
   res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('Cache-Control','no-store');
   if(u.pathname!=='/oauth/callback'){res.writeHead(404);res.end();return;}
   if(u.searchParams.get('state')!==state){res.writeHead(400);res.end('Solicitud no válida.');return;}
   if(u.searchParams.get('error')){res.end('Autorización cancelada. Vuelve a la terminal.');rejectCode(Error('Autorización cancelada por el usuario.'));return;}
   const code=u.searchParams.get('code');if(!code){res.writeHead(400);res.end('Falta autorización.');return;}
   res.end('Autorización recibida. Puedes cerrar esta ventana y volver a la terminal.');resolveCode(code);
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const timer=setTimeout(()=>rejectCode(Error('Se agotó el tiempo de autorización. Ejecuta youtube-auth de nuevo.')),timeoutMs);
  const redirect=`http://127.0.0.1:${server.address().port}/oauth/callback`;
  try{
   const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:c.client_id,redirect_uri:redirect,response_type:'code',scope:SCOPE,access_type:'offline',prompt:'consent',state,code_challenge:challenge,code_challenge_method:'S256'});
   log('[YouTube] Autoriza el canal en el navegador. Si no se abre: '+url.href);open(url.href);
   const code=await codePromise;
   const tokens=await this.exchange({...c,code,redirect_uri:redirect,grant_type:'authorization_code',code_verifier:verifier});
   this.save(tokens);privateWrite(path.join(this.dir,'client.json'),c);
   log('[YouTube] Autorización guardada. Ya puedes iniciar el backend con YOUTUBE_CHAT_TTS_ENABLED=true.');
  }finally{clearTimeout(timer);server.close();server.closeAllConnections();}
 }
}
module.exports={Auth,credentialDir,privateWrite,SCOPE};
