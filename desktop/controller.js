const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process');const {EventEmitter}=require('node:events');
const defaults={tactics:false,galaxy:false,scrcpy:'',scoreDisplay:'virtual',cameraMode:'scrcpy',allowUsb:false,port:8765,interval:3,serial:'',adb:'',python:'',dataDir:'',remoteLists:false,remoteUrl:'',managerToken:'',tts:false,provider:'kokoro',fallback:process.platform==='darwin'?'say':'none',voice:'ef_dora',speed:1};
function settings(input){
 if(!input||typeof input!=='object')throw Error('Configuración inválida.');const c={};for(const key of Object.keys(defaults))c[key]=input[key]??defaults[key];
 c.port=Number(c.port);c.interval=Number(c.interval);c.speed=Number(c.speed);
 if(!Number.isInteger(c.port)||c.port<1024||c.port>65535)throw Error('Puerto: 1024–65535.');
 if(!Number.isFinite(c.interval)||c.interval<1||c.interval>60)throw Error('Intervalo: 1–60 segundos.');
 if(!Number.isFinite(c.speed)||c.speed<.5||c.speed>2)throw Error('Velocidad: 0.5–2.');
 for(const key of ['scrcpy','serial','adb','python','dataDir','remoteUrl','managerToken'])if(typeof c[key]!=='string'||c[key].length>2048||c[key].includes('\0'))throw Error('Campo inválido: '+key);
 for(const key of ['tactics','galaxy','allowUsb','remoteLists','tts'])if(typeof c[key]!=='boolean')throw Error('Opción inválida: '+key);
 if(!['virtual','physical'].includes(c.scoreDisplay)||!['scrcpy','external','none'].includes(c.cameraMode))throw Error('Modo Android inválido.');
 if(!['kokoro','say'].includes(c.provider)||!['say','none'].includes(c.fallback)||!['ef_dora','em_alex','em_santa'].includes(c.voice))throw Error('Proveedor o voz inválidos.');
 if(process.platform!=='darwin'&&(c.provider==='say'||c.fallback==='say'))throw Error('say solo funciona en macOS.');
 if(c.remoteUrl){const u=new URL(c.remoteUrl);if(u.username||u.password||u.pathname!=='/'||u.search||u.hash||!(u.protocol==='https:'||(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname))))throw Error('Backend: HTTPS sin rutas, o localhost para pruebas.');c.remoteUrl=u.origin;}
 if(c.managerToken&&c.managerToken.length<24)throw Error('Credencial del manager: mínimo 24 caracteres.');return c;
}
function available(port){return new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',()=>reject(Error('El puerto ya está ocupado. Detén la otra instancia o cambia el puerto.')));probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});}
class Controller extends EventEmitter{
 constructor({runtime,executable=process.execPath,spawnImpl=spawn}){super();this.runtime=runtime;this.executable=executable;this.spawnImpl=spawnImpl;this.phase='stopped';this.child=null;this.logs='';this.runId=0;}
 status(){return {phase:this.phase,port:this.port,logs:this.logs};}
 log(text,secret=''){const safe=String(text).split(secret||'\0').join(secret?'[credencial]':'\0');this.logs=(this.logs+safe).slice(-20000);this.emit('status',this.status());}
 async start(input){
 if(this.phase!=='stopped')throw Error('El servidor ya está iniciado o arrancando.');const c=settings(input);const runId=++this.runId;this.phase='starting';this.port=c.port;this.logs='';this.emit('status',this.status());
 try{await available(c.port);if(runId!==this.runId)throw Error('Inicio cancelado.');const args=[path.join(this.runtime,'cli.js'),'start','--port',String(c.port),'--interval',String(c.interval)];for(const [key,flag]of [['serial','--serial'],['adb','--adb'],['python','--python'],['dataDir','--data-dir']])if(c[key])args.push(flag,c[key]);if(c.remoteLists)args.push('--remote-lists');if(c.galaxy){args[1]='galaxy';args.push('--score-display',c.scoreDisplay,'--camera-mode',c.cameraMode);if(c.scrcpy)args.push('--scrcpy',c.scrcpy);if(c.allowUsb)args.push('--allow-usb');}
 const env={...process.env,OVERLAY_TACTICS_ENABLED:String(c.tactics),ELECTRON_RUN_AS_NODE:'1',YOUTUBE_CHAT_TTS_ENABLED:String(c.tts),TTS_PROVIDER:c.provider,TTS_FALLBACK:c.fallback,KOKORO_VOICE:c.voice,KOKORO_SPEED:String(c.speed)};
 delete env.REMOTE_LISTS_URL;delete env.REMOTE_LISTS_MANAGER_TOKEN;if(c.remoteLists){if(c.remoteUrl)env.REMOTE_LISTS_URL=c.remoteUrl;if(c.managerToken)env.REMOTE_LISTS_MANAGER_TOKEN=c.managerToken;}
 const child=this.spawnImpl(this.executable,args,{env,stdio:['ignore','pipe','pipe'],shell:false,windowsHide:true});this.child=child;
 await new Promise((resolve,reject)=>{let done=false;const finish=e=>{if(done)return;done=true;clearTimeout(timer);e?reject(e):resolve();};const timer=setTimeout(()=>{child.kill('SIGTERM');finish(Error('El servidor tardó demasiado en iniciar.'));},30000);
 child.stdout.on('data',data=>{this.log(data,c.managerToken);if(this.logs.includes('Panel: http://127.0.0.1:'+c.port)){this.phase='running';this.emit('status',this.status());finish();}});child.stderr.on('data',data=>this.log(data,c.managerToken));child.once('error',e=>{this.child=null;this.phase='stopped';this.emit('status',this.status());finish(Error('No se pudo ejecutar el servidor: '+e.message));});child.once('exit',code=>{this.child=null;this.phase='stopped';this.emit('status',this.status());finish(Error('El servidor terminó antes de iniciar (código '+code+'). Consulta el registro.'));});});return this.status();
 }catch(e){if(!this.child)this.phase='stopped';this.emit('status',this.status());throw e;}
 }
 async stop(){const child=this.child;if(!child){this.runId++;this.phase='stopped';this.emit('status',this.status());return this.status();}this.phase='stopping';this.emit('status',this.status());await new Promise(resolve=>{const timer=setTimeout(()=>child.kill('SIGKILL'),5000);child.once('exit',()=>{clearTimeout(timer);resolve();});child.kill('SIGTERM');});return this.status();}
}
module.exports={Controller,settings,defaults,available};
