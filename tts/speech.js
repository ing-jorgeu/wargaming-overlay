const {spawn}=require('node:child_process');
function say(text,{spawnImpl=spawn,platform=process.platform,signal,timeoutMs=120000}={}){
 if(platform!=='darwin')return Promise.reject(Error('El TTS local requiere macOS.'));
 if(signal?.aborted)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  // Feed text through stdin, not a shell/option. Remove Apple's embedded speech commands.
  const child=spawnImpl('/usr/bin/say',[],{stdio:['pipe','ignore','pipe'],shell:false});
  let timedOut=false,done=false;
  const stop=()=>{
   if(platform==='win32'&&child.pid){const killer=spawnImpl('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{shell:false,windowsHide:true,stdio:'ignore'});killer.once('error',()=>child.kill('SIGKILL'));killer.unref?.();}
   else child.kill('SIGKILL');
  };
  const timer=setTimeout(()=>{timedOut=true;stop();},timeoutMs);
  const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',stop);error?reject(error):resolve();};
  signal?.addEventListener('abort',stop,{once:true});
  child.stderr?.resume();child.stdin.on('error',()=>{});
  child.once('error',()=>finish(Error('No se pudo iniciar la voz nativa de macOS.')));
  child.once('close',code=>finish(signal?.aborted?null:timedOut?Error('Se agotó el tiempo de voz.'):code===0?null:Error('La voz de macOS terminó con un error.')));
  child.stdin.end(String(text).replace(/[\[\]]/g,''));
  if(signal?.aborted)stop();
 });
}


const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {cacheDirectory}=require('./kokoro-assets');
function settings(config={},env=process.env,platform=process.platform){
 const opts={provider:env.TTS_PROVIDER||config.ttsProvider||'kokoro',fallback:env.TTS_FALLBACK||config.ttsFallback||(platform==='darwin'?'say':'none'),voice:env.KOKORO_VOICE||config.kokoroVoice||'ef_dora',speed:Number(env.KOKORO_SPEED??config.kokoroSpeed??1),cacheDir:env.KOKORO_CACHE_DIR||config.kokoroCacheDir||cacheDirectory()};
 if(!['kokoro','say'].includes(opts.provider))throw Error('ttsProvider debe ser kokoro o say.');
 if(!['say','none'].includes(opts.fallback))throw Error('ttsFallback debe ser say o none.');
 if((opts.provider==='say'||opts.fallback==='say')&&platform!=='darwin')throw Error('say solo está disponible en macOS. Usa kokoro y ttsFallback=none.');
 if(!['ef_dora','em_alex','em_santa'].includes(opts.voice))throw Error('kokoroVoice debe ser ef_dora, em_alex o em_santa.');
 if(!Number.isFinite(opts.speed)||opts.speed<0.5||opts.speed>2)throw Error('kokoroSpeed debe estar entre 0.5 y 2.');
 if(typeof opts.cacheDir!=='string'||!opts.cacheDir)throw Error('kokoroCacheDir debe ser una ruta.');
 return opts;
}
function kokoro(text,{spawnImpl=spawn,platform=process.platform,signal,timeoutMs=120000,log=console.log,...opts}={}){
 if(signal?.aborted)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'overlay-tts-'));
  const child=spawnImpl(process.execPath,[path.join(__dirname,'kokoro-worker.js')],{stdio:['pipe','ignore','pipe'],shell:false,windowsHide:true,cwd:temporary,...(temporary?{env:{...process.env,OVERLAY_TTS_TEMP_DIR:temporary}}:{})});
  let done=false,timedOut=false;
  const stop=()=>{
   if(platform==='win32'&&child.pid){const killer=spawnImpl('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{shell:false,windowsHide:true,stdio:'ignore'});killer.once('error',()=>child.kill('SIGKILL'));killer.unref?.();}
   else child.kill('SIGKILL');
  };
  const timer=setTimeout(()=>{timedOut=true;stop();},timeoutMs);
  const finish=error=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',stop);
   const cleanup=temporary?require('node:fs/promises').rm(temporary,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>log('[TTS] No se pudo limpiar un archivo de audio temporal.')):Promise.resolve();
   if(error)error.playbackStarted=stderr.includes('[Kokoro] Reproduciendo audio.');
   cleanup.then(()=>error?reject(error):resolve());
  };
  signal?.addEventListener('abort',stop,{once:true});
  let stderr='';child.stderr?.setEncoding('utf8');child.stderr?.on('data',chunk=>{stderr=(stderr+chunk).slice(-4000);});
  child.stdin.on('error',()=>{});
  child.once('error',()=>finish(Error('No se pudo iniciar Kokoro.')));
  child.once('close',(code,signalName)=>{if(stderr.trim())log(stderr.trim());finish(signal?.aborted?null:timedOut?Error('Se agotó el tiempo de Kokoro.'):code===0?null:Error('Kokoro terminó con '+(signalName?'señal '+signalName:'código '+code)+(stderr.trim()?': '+stderr.trim().slice(-1000):'.')));});
  child.stdin.end(JSON.stringify({text:String(text),voice:opts.voice,speed:opts.speed,cacheDir:opts.cacheDir}));
  if(signal?.aborted)stop();
 });
}
function createSpeech(config={}, {env=process.env,platform=process.platform,log=console.log,spawnImpl=spawn}={}){
 const opts=settings(config,env,platform);
 return async(text,options={})=>{
  if(options.signal?.aborted)return;
  const common={...options,platform,spawnImpl,log};
  if(opts.provider==='say')return say(text,common);
  try{await kokoro(text,{...common,...opts});}
  catch(e){if(options.signal?.aborted)return;if(opts.fallback!=='say'||e.playbackStarted)throw e;log('[TTS] '+e.message+' Respaldo: leyendo este mensaje con say.');await say(text,common);}
 };
}
function speak(text,options={}){return createSpeech(options.config,{env:options.env,platform:options.platform,log:options.log,spawnImpl:options.spawnImpl})(text,options);}
module.exports={speak,say,kokoro,createSpeech,settings};
