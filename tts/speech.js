const {spawn}=require('node:child_process');
function speak(text,{spawnImpl=spawn,platform=process.platform,signal,timeoutMs=120000}={}){
 if(platform!=='darwin')return Promise.reject(Error('El TTS local requiere macOS.'));
 if(signal?.aborted)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  // Feed text through stdin, not a shell/option. Remove Apple's embedded speech commands.
  const child=spawnImpl('/usr/bin/say',[],{stdio:['pipe','ignore','pipe'],shell:false});
  let timedOut=false,done=false;
  const stop=()=>child.kill('SIGKILL');
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
module.exports={speak};
