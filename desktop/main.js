const {app,BrowserWindow,ipcMain,dialog,shell,safeStorage}=require('electron');
const fs=require('node:fs'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process');
const {Controller,settings,defaults}=require('./controller');
const runtime=path.dirname(require.resolve('@ing.jorgeu/wargaming-overlay/package.json'));
const {dataDirectory,locate}=require(path.join(runtime,'platform'));let win,controller,saved;const tasks=new Set();function track(child){tasks.add(child);child.once('exit',()=>tasks.delete(child));child.once('error',()=>tasks.delete(child));return child;}
if(!app.requestSingleInstanceLock())app.quit();else{
 app.on('second-instance',()=>{win?.show();win?.focus();});
 if(process.env.OVERLAY_LAUNCHER_USER_DATA_DIR)app.setPath('userData',path.resolve(process.env.OVERLAY_LAUNCHER_USER_DATA_DIR));
 app.whenReady().then(()=>{
  const resources=app.isPackaged?path.join(process.resourcesPath,'runtimes'):path.join(__dirname,'runtimes');
  const bundledADB=path.join(resources,'platform-tools',process.platform==='win32'?'adb.exe':'adb');const bundledPython=path.join(resources,'python',process.platform==='win32'?'python.exe':'bin/python3');
  const file=path.join(app.getPath('userData'),'launcher.json');
  saved={...defaults,dataDir:dataDirectory(),adb:fs.existsSync(bundledADB)?bundledADB:locate('adb')||'',python:fs.existsSync(bundledPython)?bundledPython:require(path.join(runtime,'diagnostics')).findPython?.()||''};
  try{const data=JSON.parse(fs.readFileSync(file,'utf8'));saved={...saved,...data};if(saved.encryptedToken){saved.managerToken=safeStorage.decryptString(Buffer.from(saved.encryptedToken,'base64'));delete saved.encryptedToken;}}catch{}
  for(const [key,bundled]of [['adb',bundledADB],['python',bundledPython]])if(fs.existsSync(bundled)&&(!saved[key]||saved[key].includes('/Contents/Resources/runtimes/')))saved[key]=bundled;
  controller=new Controller({runtime});
  function save(input){saved=settings(input);const data={...saved};delete data.managerToken;if(saved.managerToken){if(!safeStorage.isEncryptionAvailable())throw Error('No se puede guardar la credencial de forma segura en este equipo.');data.encryptedToken=safeStorage.encryptString(saved.managerToken).toString('base64');}fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(data),{mode:0o600});fs.renameSync(file+'.tmp',file);}
  function handle(name,fn){ipcMain.handle(name,async(event,...args)=>{if(event.sender!==win.webContents)throw Error('Origen inválido.');try{return {ok:true,value:await fn(...args)};}catch(e){return {ok:false,error:e.message};}});}
  handle('load',()=>({config:saved,platform:process.platform,status:controller.status()}));handle('save',c=>{save(c);return saved;});handle('start',async c=>{save(c);return controller.start(saved);});handle('stop',()=>controller.stop());
  handle('open-panel',()=>{if(controller.phase!=='running')throw Error('Inicia el servidor primero.');return shell.openExternal('http://127.0.0.1:'+controller.port);});
  handle('choose',async kind=>{if(!['file','folder'].includes(kind))throw Error('Selección inválida.');const result=await dialog.showOpenDialog(win,{properties:[kind==='folder'?'openDirectory':'openFile']});return result.canceled?'':result.filePaths[0];});
  handle('sync-stats',async c=>{
   const value=settings(c);if(controller.phase==='running'){
    const response=await fetch('http://127.0.0.1:'+controller.port+'/listhammer/sync',{method:'POST',signal:AbortSignal.timeout(600000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'No se pudo actualizar ListHammer.');return result;
   }
   if(controller.phase!=='stopped')throw Error('Espera a que el servidor termine de iniciar o detenerse.');
   return new Promise((resolve,reject)=>{
    const script="require(process.argv[1]).syncStats(process.argv[2],{log:()=>{}}).then(s=>console.log(JSON.stringify({factions:s.factions.length,period:s.selection.period}))).catch(e=>{console.error(e.message);process.exitCode=1;})";
    const child=track(spawn(process.execPath,['-e',script,path.join(runtime,'listhammer.js'),value.dataDir||dataDirectory()],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},shell:false,stdio:['ignore','pipe','pipe']}));let output='',error='';
    child.stdout.on('data',d=>output=(output+d).slice(-4000));child.stderr.on('data',d=>error=(error+d).slice(-2000));
    child.once('error',reject);child.once('close',code=>{if(code!==0)return reject(Error(error||'Falló ListHammer.'));try{resolve(JSON.parse(output));}catch{reject(Error('Respuesta inválida de ListHammer.'));}});
   });
  });
  handle('doctor',c=>require(path.join(runtime,'diagnostics')).check(settings(c)));
  handle('wifi', (c,address)=>{const value=settings(c);if(typeof address!=='string'||!/^([a-zA-Z0-9.-]+):([0-9]{1,5})$/.test(address)||Number(address.split(':').at(-1))>65535)throw Error('Usa IP:puerto del teléfono.');const r=spawnSync(value.adb||locate('adb'),['connect',address],{encoding:'utf8',timeout:15000,shell:false});if(r.status!==0||!/connected to/.test(r.stdout))throw Error('No se pudo conectar por Wi-Fi. Revisa la dirección y la depuración inalámbrica.');return r.stdout.trim();});
  handle('authorize',async()=>{const result=await dialog.showOpenDialog(win,{title:'Credenciales OAuth de YouTube',properties:['openFile'],filters:[{name:'JSON OAuth',extensions:['json']}]});if(result.canceled)return 'Cancelado';return new Promise((resolve,reject)=>{const child=track(spawn(process.execPath,[path.join(runtime,'cli.js'),'youtube-auth','--client-secret',result.filePaths[0]],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},shell:false,stdio:['ignore','ignore','pipe']}));let error='';child.stderr.on('data',d=>error=(error+d).slice(-500));child.once('error',()=>reject(Error('No se pudo iniciar la autorización.')));child.once('exit',code=>code===0?resolve('YouTube autorizado.'):reject(Error(error||'No se completó la autorización.')));});});
  handle('devices',c=>{const value=settings(c),adb=value.adb||locate('adb');if(!adb)throw Error('ADB no está disponible.');const r=spawnSync(adb,['devices','-l'],{encoding:'utf8',timeout:10000,shell:false});if(r.status!==0)throw Error('No se pudo consultar ADB.');return r.stdout.split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('List of')&&!l.startsWith('*')).map(l=>{const [serial,state]=l.trim().split(/\s+/);return {serial,state};});});
  handle('test-voice',async(c,text)=>{const value=settings(c);if(typeof text!=='string'||!text.trim()||text.length>300)throw Error('Texto de prueba: 1–300 caracteres.');return new Promise((resolve,reject)=>{const child=track(spawn(process.execPath,[path.join(runtime,'cli.js'),'--test-tts',text,'--provider',value.provider,'--voice',value.voice,'--fallback',value.fallback,'--speed',String(value.speed)],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},shell:false,stdio:['ignore','pipe','pipe']}));let error='';child.stdout.on('data',d=>error=(error+d).slice(-4000));const timer=setTimeout(()=>child.kill('SIGKILL'),120000);child.stderr.on('data',d=>error=(error+d).slice(-4000));child.once('error',()=>{clearTimeout(timer);reject(Error('No se pudo iniciar la prueba.'));});child.once('exit',code=>{clearTimeout(timer);code===0?resolve(error.trim()):reject(Error(error||'Falló la prueba de voz.'));});});});
  win=new BrowserWindow({width:980,height:850,minWidth:700,minHeight:600,title:'Wargaming Overlay',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());controller.on('status',s=>{if(!win.isDestroyed())win.webContents.send('status',s);});win.loadFile('index.html');
 });
 let quitting=false;app.on('before-quit',event=>{if(!quitting&&(controller?.child||tasks.size)){event.preventDefault();quitting=true;for(const child of tasks)child.kill('SIGTERM');(controller?controller.stop():Promise.resolve()).finally(()=>app.quit());}});app.on('window-all-closed',()=>app.quit());
}
