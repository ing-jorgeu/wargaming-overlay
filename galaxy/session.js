const fs=require('node:fs'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const {EventEmitter}=require('node:events');
const {locate}=require('../platform');
const PACKAGE='com.goonhammer.ttba';
function options(input={}){
 const o={scoreDisplay:'virtual',cameraMode:'scrcpy',displaySize:'1080x1920/320',cameraSize:'1920x1080',cameraFps:30,bitRate:'4M',reconnect:true,allowUsb:false,...input};
 if(o.scoreDisplay==='physical'&&o.cameraMode==='external')throw Error('Cámara externa en pantalla física ocultaría Tabletop Battles. Usa cámara scrcpy o pantalla virtual.');
 if(!['virtual','physical'].includes(o.scoreDisplay)||!['scrcpy','external','none'].includes(o.cameraMode))throw Error('Modo de pantalla o cámara inválido.');
 if(!/^\d{3,4}x\d{3,4}\/\d{2,3}$/.test(o.displaySize)||!['1280x720','1920x1080'].includes(o.cameraSize))throw Error('Resolución inválida.');
 const [w,h,dpi]=o.displaySize.split(/[x/]/).map(Number);if(w>2560||h>2560||dpi<120||dpi>640)throw Error('Pantalla virtual fuera de rango.');
 o.cameraFps=Number(o.cameraFps);if(![15,24,30,60].includes(o.cameraFps)||!['2M','4M','8M'].includes(o.bitRate))throw Error('FPS o bitrate inválido.');
 if(o.connect&&!/^[a-zA-Z0-9.-]+:\d{1,5}$/.test(o.connect))throw Error('Conexión Wi-Fi: usa IP:puerto ya emparejado.');
 if(o.connect&&Number(o.connect.split(':').at(-1))>65535)throw Error('Puerto Wi-Fi inválido.');
 for(const key of ['serial','adb','scrcpy','python','dataDir'])if(o[key]!==undefined&&(typeof o[key]!=='string'||o[key].includes('\0')))throw Error('Ruta o dispositivo inválido.');
 return o;
}
function commands(o,serial){
 const common=['--serial='+serial,'--no-audio','--video-codec=h264','--no-clipboard-autosync'];
 const control=[...common,'--window-title=Overlay - Tabletop Battles','--max-fps=20','--video-bit-rate=2M'];
 if(o.scoreDisplay==='virtual')control.push('--new-display='+o.displaySize,'--no-vd-system-decorations','--no-vd-destroy-content');
 control.push('--start-app='+PACKAGE);
 const camera=[...common,'--window-title=Overlay - Android Camera','--video-source=camera','--camera-facing=back','--camera-size='+o.cameraSize,'--camera-fps='+o.cameraFps,'--video-bit-rate='+o.bitRate,'--no-control'];
 return {control,camera};
}
function run(exe,args){const r=spawnSync(exe,args,{encoding:'utf8',timeout:15000,windowsHide:true,shell:false});if(r.error||r.status!==0)throw Error((r.error?.message||r.stderr||r.stdout||'Comando falló').trim().slice(-1000));return r.stdout;}
function probe(input={}, {execute=run,find=locate}={}){
 const o=options(input),adb=find(o.adb||'adb'),scrcpy=find(o.scrcpy||'scrcpy');
 if(!adb)throw Error('No se encontró ADB. Revisa la ruta ADB en Opciones avanzadas del GUI.');
 if(!scrcpy)throw Error('No se encontró scrcpy. Configura Ruta a scrcpy en el GUI (en Apple Silicon suele ser /opt/homebrew/bin/scrcpy). Requiere scrcpy 3.1 o posterior, instalado aparte.');
 const help=execute(scrcpy,['--help']);for(const flag of ['--start-app','--no-clipboard-autosync',...(o.scoreDisplay==='virtual'?['--new-display','--no-vd-destroy-content']:[]),...(o.cameraMode==='scrcpy'?['--video-source','--camera-size']:[])])if(!help.includes(flag))throw Error('scrcpy no admite '+flag+'. Actualiza scrcpy.');
 const version=execute(scrcpy,['--version']).split(/\r?\n/)[0];
 if(o.connect){try{execute(adb,['connect',o.connect]);}catch(e){if(!o.expectedIdentity)throw e;}}
 if(o.expectedIdentity){try{const mdns=execute(adb,['mdns','services']);for(const line of mdns.split(/\r?\n/)){const fields=line.trim().split(/\s+/);if(fields[0]?.startsWith('adb-'+o.expectedIdentity+'-')&&fields[1]?.includes('_adb-tls-connect._tcp')&&/^[a-zA-Z0-9.\[\]:-]+:\d+$/.test(fields[2]||'')){execute(adb,['connect',fields[2]]);break;}}}catch{}}
 const rows=execute(adb,['devices','-l']).split(/\r?\n/).map(l=>l.trim().split(/\s+/)).filter(l=>l[1]==='device');
 const ready=rows.map(([serial])=>({serial,identity:execute(adb,['-s',serial,'shell','getprop','ro.serialno']).trim()}));
 let device=ready.find(d=>d.serial===(o.connect||o.serial));
 if(o.expectedIdentity)device=ready.find(d=>d.identity===o.expectedIdentity&&(d.serial.includes(':')||d.serial.includes('._adb-tls-connect._tcp')))||ready.find(d=>d.identity===o.expectedIdentity);
 if(!device&&!o.serial&&!o.connect){const ids=new Set(ready.map(d=>d.identity||d.serial));if(ids.size===1)device=ready.find(d=>d.serial.includes(':')||d.serial.includes('._adb-tls-connect._tcp'))||ready[0];}
 if(!device)throw Error('Conecta y autoriza un único Android, o selecciona --serial SERIAL. No hay un dispositivo autorizado que coincida.');
 if(!device.identity)throw Error('No se pudo verificar la identidad física del teléfono.');
 if(!o.allowUsb&&!device.serial.includes(':')&&!device.serial.includes('._adb-tls-connect._tcp'))throw Error('La sesión es inalámbrica. Empareja ADB Wi-Fi y usa --connect IP:puerto; para una prueba por cable añade --allow-usb.');
 const prop=name=>execute(adb,['-s',device.serial,'shell','getprop',name]).trim();
 const sdk=Number(prop('ro.build.version.sdk'));if(sdk<(o.cameraMode==='scrcpy'?31:30))throw Error('Esta combinación requiere Android '+(o.cameraMode==='scrcpy'?'12':'11')+' o posterior.');
 if(!execute(adb,['-s',device.serial,'shell','pm','path',PACKAGE]).includes('package:'))throw Error('Tabletop Battles no está instalada ('+PACKAGE+').');
 return {...device,adb,scrcpy,version,sdk,model:prop('ro.product.model'),android:prop('ro.build.version.release'),oneUI:prop('ro.build.version.oneui'),commands:commands(o,device.serial)};
}
function acquireLock(file,{isAlive=pid=>{try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;return true;}}}={}){
 const write=()=>{const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,String(process.pid));}finally{fs.closeSync(fd);}};
 try{write();return;}catch(e){if(e.code!=='EEXIST')throw e;}
 const original=fs.readFileSync(file,'utf8'),stat=fs.statSync(file),pid=Number(original.trim());
 if(!/^[1-9]\d*$/.test(original.trim())||!Number.isSafeInteger(pid))throw Error('El bloqueo Android es inválido. Revisa galaxy-session.lock; no se eliminó.');
 if(isAlive(pid))throw Error('Ya hay una sesión Android activa (PID '+pid+'). Detén esa sesión antes de iniciar otra.');
 // Reclaim only a proven dead owner; permission failures are treated as alive.
 const recovery=file+'.recovery';let fd;
 try{fd=fs.openSync(recovery,'wx',0o600);}catch{throw Error('Otra instancia está recuperando la sesión Android. Reintenta en unos segundos.');}
 try{
  if(fs.statSync(file).ino!==stat.ino||fs.readFileSync(file,'utf8')!==original)throw Error('La sesión Android cambió mientras se recuperaba. Reintenta.');
  fs.unlinkSync(file);write();
 }finally{fs.closeSync(fd);fs.rmSync(recovery,{force:true});}
}
class GalaxySession extends EventEmitter{
 constructor(input,{spawnImpl=spawn,probeImpl=probe,execute=run,log=console.log}={}){super();this.options=options(input);this.spawn=spawnImpl;this.probe=probeImpl;this.execute=execute;this.log=log;this.children=new Set();this.stopped=true;this.generation=0;this.timer=null;this.attempt=0;this.file=path.join(this.options.dataDir,'galaxy-session.json');}
 write(value){fs.mkdirSync(this.options.dataDir,{recursive:true});fs.writeFileSync(this.file+'.tmp',JSON.stringify(value),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);}
 child(exe,args,label){const c=this.spawn(exe,args,{shell:false,windowsHide:true,env:{...process.env,ADB:this.device.adb,ELECTRON_RUN_AS_NODE:process.env.ELECTRON_RUN_AS_NODE},stdio:['ignore','pipe','pipe']});c.sessionRole=label;this.children.add(c);for(const stream of [c.stdout,c.stderr])stream?.on('data',d=>this.log('['+label+'] '+String(d).trim()));c.once('exit',()=>{this.children.delete(c);if(!this.stopped)this.recover(label+' terminó.');});c.once('error',e=>{this.children.delete(c);if(!this.stopped)this.recover(label+': '+e.message);});return c;}
 async launch(){
  const generation=++this.generation;
  const device=this.probe({...this.options,expectedIdentity:this.identity});if(this.identity&&device.identity!==this.identity)throw Error('El dispositivo conectado no es el Android de esta sesión.');this.identity=device.identity;this.device=device;
  this.write({active:false,serial:device.serial,identity:device.identity});
  this.log('Android: '+device.model+' · Android '+device.android+' · '+device.version);
  const control=this.child(device.scrcpy,device.commands.control,'Control');
  if(this.options.scoreDisplay==='virtual'){
   const displayId=await new Promise((resolve,reject)=>{
    let buffer='',done=false;const finish=(error,id)=>{if(done)return;done=true;clearTimeout(timeout);for(const stream of [control.stdout,control.stderr])stream?.removeListener('data',data);control.removeListener('exit',exit);control.removeListener('error',errorEvent);error?reject(error):resolve(id);};
    const data=d=>{buffer=(buffer+d).slice(-8000);const m=/New display:[^\n]*\(id=(\d+)\)/.exec(buffer);if(m)finish(null,Number(m[1]));};
    const exit=()=>finish(Error('scrcpy no pudo crear la pantalla virtual. Prueba --score-display physical.'));
    const errorEvent=e=>finish(e);const timeout=setTimeout(()=>finish(Error('scrcpy no anunció la pantalla virtual en 30 segundos.')),30000);
    for(const stream of [control.stdout,control.stderr])stream?.on('data',data);control.once('exit',exit);control.once('error',errorEvent);
   });
   if(this.stopped||generation!==this.generation)return;
   const local=path.join(__dirname,'android','display-dump.jar'),hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(local)).digest('hex').slice(0,16);
   const helper='/data/local/tmp/overlay-display-'+hash+'.jar';this.execute(device.adb,['-s',device.serial,'push',local,helper]);
   const xml=this.execute(device.adb,['-s',device.serial,'shell','CLASSPATH='+helper+':/system/framework/uiautomator.jar','app_process','/system/bin','overlay.DisplayDump',String(displayId)]);
   if(!xml.includes('<hierarchy'))throw Error('Samsung no expone la pantalla virtual por accesibilidad. Usa --score-display physical.');
   this.write({active:true,serial:device.serial,identity:device.identity,displayId,helper});
  }
  if(this.stopped||generation!==this.generation)return;
  if(this.options.cameraMode==='scrcpy')this.child(device.scrcpy,device.commands.camera,'Cámara');
  const args=[path.join(__dirname,'..','cli.js'),'start','--serial',device.serial,'--adb',device.adb,'--data-dir',this.options.dataDir];
  if(this.options.scoreDisplay==='virtual')args.push('--display-file',this.file);
  for(const [key,flag]of [['port','--port'],['interval','--interval'],['python','--python']])if(this.options[key])args.push(flag,String(this.options[key]));
  if(this.options.remoteLists)args.push('--remote-lists');
  if(![...this.children].some(c=>c.sessionRole==='Overlay'))this.child(process.execPath,args,'Overlay');this.log(this.options.cameraMode==='scrcpy'?'Sesión iniciada. OBS: captura SOLO «Overlay - Android Camera». El marcador continúa en /overlay-art.html.':'Control iniciado. El marcador continúa en /overlay-art.html. Configura la cámara externa por separado si la elegiste.');this.emit('ready',device);
 }
 async start(){if(!this.stopped)throw Error('La sesión ya está activa.');fs.mkdirSync(this.options.dataDir,{recursive:true});this.lockFile=path.join(this.options.dataDir,'galaxy-session.lock');acquireLock(this.lockFile);this.ownsLock=true;this.stopped=false;try{await this.launch();}catch(e){await this.stop();throw e;}}
 recover(reason){if(this.recovering||this.stopped)return;if(this.options.reconnect===false){this.log(reason+' Reconexión desactivada.');void this.stop();return;}this.recovering=true;this.log(reason+' Recuperando la sesión del mismo teléfono…');this.generation++;this.write({active:false});
  this.cleanup(true).then(()=>{if(this.stopped)return;const ms=Math.min(30000,1000*2**Math.min(this.attempt++,5));this.timer=setTimeout(async()=>{this.recovering=false;if(this.stopped)return;try{await this.launch();}catch(e){this.recover(e.message);}},ms);});
 }
 async cleanup(keepOverlay=false){await Promise.all([...this.children].filter(c=>!keepOverlay||c.sessionRole!=='Overlay').map(c=>new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);this.children.delete(c);resolve();};const timer=setTimeout(()=>{c.kill('SIGKILL');finish();},5000);c.once('exit',finish);c.kill('SIGTERM');})));}
 async stop(){this.stopped=true;this.generation++;clearTimeout(this.timer);this.write({active:false});await this.cleanup();if(this.ownsLock){fs.rmSync(this.lockFile,{force:true});this.ownsLock=false;}}
}
module.exports={options,commands,probe,GalaxySession,acquireLock};
