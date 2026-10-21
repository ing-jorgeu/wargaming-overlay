#!/usr/bin/env node
const fs=require('fs'),path=require('path'),os=require('os');
const {spawnSync}=require('child_process');
const {check,locate}=require('./diagnostics');
const {dataDirectory,installPlan,platformGuide}=require('./platform');
const version=require('./package.json').version;
const help=`wargaming-overlay ${version} — overlay local para OBS

  wargaming-overlay start                  Inicia el overlay y lector
  wargaming-overlay youtube-auth --client-secret RUTA  Autoriza YouTube una vez
  wargaming-overlay --test-tts "Hola"  Lee un texto y termina
  wargaming-overlay doctor                 Revisa Python, ADB y teléfono
  wargaming-overlay setup                  Guía de configuración
  wargaming-overlay setup --install-adb    Instala ADB con el gestor del sistema
  wargaming-overlay setup --dry-run        Muestra el plan sin instalar ni consultar ADB
  wargaming-overlay migrate CARPETA        Copia el estado del overlay anterior

  wargaming-overlay galaxy --help          Cámara Galaxy + control independiente

Opciones de start/doctor:
  --remote-lists    Habilita enlaces y sincronización de listas remotas
  --port 8765       Puerto local (1024–65535); no necesita sudo
  --serial SERIAL   Selecciona un dispositivo
  --interval 3      Pausa entre lecturas (segundos, mínimo 1)
  --adb RUTA        Ejecutable ADB
  --python RUTA     Python 3.8 o posterior
  --display-file RUTA Estado de pantalla virtual gestionado por galaxy
  --data-dir RUTA   Carpeta para guardar configuración y partida

Opciones de prueba de voz:
  --test-tts "TEXTO"    Texto que se leerá (obligatorio)
  --voice NOMBRE    ef_dora, em_alex o em_santa
  --provider NOMBRE kokoro o say (say solo macOS)
  --fallback NOMBRE say o none
  --speed NUMERO    Velocidad entre 0.5 y 2
  --data-dir RUTA   Lee la configuración TTS de esa carpeta

Por defecto: ~/Library/Application Support/wargaming-overlay en macOS;
%LOCALAPPDATA%/wargaming-overlay en Windows; ~/.local/share/wargaming-overlay en Linux. Solo escucha en 127.0.0.1.
Ctrl+C detiene el servidor y lector. El último estado queda guardado.
`;
async function main(argv=process.argv.slice(2),{voiceTest}={}){
 if(argv[0]==='galaxy')return require('./galaxy/cli').main(argv.slice(1));
 const args=[...argv];
 if(args.includes('--help')||args.includes('-h')){console.log(help);return}
 if(args.includes('--version')){console.log(version);return}
 let command=args[0]&&!args[0].startsWith('-')?args.shift():'start';
 const options={};let source;
 const keys={'--port':'port','--serial':'serial','--interval':'interval','--adb':'adb','--python':'python','--display-file':'displayFile','--data-dir':'dataDir','--client-secret':'clientSecret','--test-tts':'testText','--text':'text','--voice':'voice','--provider':'provider','--fallback':'fallback','--speed':'speed'};
 while(args.length){const a=args.shift();if(a==='--remote-lists')options.remoteLists=true;else if(a==='--install-adb')options.install=true;else if(a==='--dry-run')options.dryRun=true;else if(keys[a]){const value=args.shift();if(value===undefined||(!['--text','--test-tts'].includes(a)&&(!value||value.startsWith('--'))))throw Error(`Falta el valor de ${a}`);options[keys[a]]=value}else if(command==='migrate'&&!source&&!a.startsWith('-'))source=a;else throw Error(`Argumento desconocido: ${a}. Usa --help.`)}
 if(options.displayFile&&command!=='start')throw Error('--display-file solo se usa con start.');
 if(options.remoteLists&&command!=='start')throw Error('--remote-lists solo se usa con start.');
 if(options.testText!==undefined){if(command!=='start')throw Error('--test-tts solo se usa sin subcomando o con start.');command='test-tts';options.text=options.testText;delete options.testText;}
 if(!['start','doctor','setup','migrate','youtube-auth','test-tts'].includes(command))throw Error('Comando desconocido. Usa --help.');
 for(const key of ['text','voice','provider','fallback','speed'])if(options[key]!==undefined&&command!=='test-tts')throw Error(`--${key} solo se usa con test-tts.`);
 if(options.clientSecret && command!=='youtube-auth')throw Error('--client-secret solo se usa con youtube-auth.');
 if(command==='youtube-auth'){await new (require('./youtube/auth').Auth)().authorize(options.clientSecret);return;}
 const dataDir=path.resolve(options.dataDir||dataDirectory());
 if((options.install||options.dryRun)&&command!=='setup')throw Error('--install-adb y --dry-run solo se usan con setup.');
 if(command==='test-tts'){
  for(const key of ['port','serial','interval','adb','python'])if(options[key]!==undefined)throw Error(`--${key} no se usa con test-tts.`);
  await (voiceTest||require('./tts/voice-command').testVoice)(options.text,{...options,dataDir});return;
 }
 if(command==='migrate'){
  if(!source)throw Error('Indica la carpeta anterior: wargaming-overlay migrate /ruta/al/overlay-anterior');
  const copies=['overlay-state.json','game-state.json'].filter(f=>fs.existsSync(path.join(source,f)));
  if(!copies.length)throw Error('La carpeta no contiene datos del overlay.');
  for(const f of copies){JSON.parse(fs.readFileSync(path.join(source,f),'utf8'));if(fs.existsSync(path.join(dataDir,f)))throw Error(`Ya existe ${f} en ${dataDir}. No se sobrescribió nada.`)}
  fs.mkdirSync(dataDir,{recursive:true});for(const f of copies)fs.copyFileSync(path.join(source,f),path.join(dataDir,f),fs.constants.COPYFILE_EXCL);
  console.log(`Datos copiados a ${dataDir}. Ejecuta wargaming-overlay start.`);return;
 }
 if(command==='setup'){
  console.log('1. Instala ADB (Android SDK Platform-Tools) y Python 3.8+.\n2. Activa Opciones de desarrollador y Depuración USB en Android.\n3. Conecta un cable de datos, desbloquea y acepta la autorización USB.\n4. Abre la ronda en la app y ejecuta wargaming-overlay doctor.\nGuía oficial: https://developer.android.com/studio/run/device');
  console.log(platformGuide(process.platform));
  const plan=installPlan(process.platform,locate);
  if(plan)console.log('Instalación de ADB: '+(plan.elevated?'sudo ':'')+[plan.command,...plan.args].join(' '));
  else console.log('Descarga oficial: https://developer.android.com/tools/releases/platform-tools');
  if(options.dryRun)return;
  if(options.install){
   if(options.adb&&!locate(options.adb))throw Error('La ruta --adb no existe. Corrígela o elimina la opción para instalar ADB.');
   if(locate(options.adb||'adb'))console.log('ADB ya está instalado; no se modificó.');
   else {
    if(!plan)throw Error('No se encontró un gestor compatible. Instala Platform-Tools desde el enlace oficial y ejecuta doctor.');
    let command=locate(plan.command),args=plan.args;
    if(plan.elevated&&process.getuid?.()!==0){if(!locate('sudo'))throw Error('Se necesitan permisos de administrador. Ejecuta el comando de instalación mostrado.');args=[command,...args];command=locate('sudo');}
    const result=spawnSync(command,args,{stdio:'inherit',shell:false});
    if(result.error||result.status!==0)throw Error('No se completó la instalación de ADB. Revisa el mensaje del gestor y vuelve a ejecutar setup.');
    console.log('Instalación terminada. Si ADB aún no aparece, abre otra terminal y ejecuta doctor.');
   }
  }
  const report=check(options);console.log(report.message);if(!report.ok)process.exitCode=1;return;
 }
 if(command==='doctor'){const r=check(options);console.log(`ADB: ${r.adb||'no encontrado'}\nPython: ${r.python||'no encontrado'}\n${r.message}`);if(!r.ok)process.exitCode=1;return}
 if(process.getuid?.()===0)throw Error('Ejecuta sin sudo. El puerto predeterminado es 8765 y los datos se guardan en tu usuario.');
 const port=Number(options.port||8765),interval=Number(options.interval||3);
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('--port debe ser un entero entre 1024 y 65535.');
 if(!Number.isFinite(interval)||interval<1||interval>60)throw Error('--interval debe estar entre 1 y 60 segundos.');
 const r=check(options);if(!r.adb||!r.python||['PYTHON_VERSION','PYTHON_MISSING'].includes(r.code))throw Error(r.message);
 if(!r.ok)console.error(r.message+'\nEl panel permanecerá disponible mientras conectas el teléfono.');
 fs.mkdirSync(dataDir,{recursive:true});fs.accessSync(dataDir,fs.constants.W_OK);
 if(options.displayFile)process.env.OVERLAY_DISPLAY_FILE=path.resolve(options.displayFile);else delete process.env.OVERLAY_DISPLAY_FILE;
 process.env.OVERLAY_REMOTE_LISTS_ENABLED=options.remoteLists?'true':'false';
 process.env.OVERLAY_DATA_DIR=dataDir;process.env.PORT=String(port);process.env.OVERLAY_ADB=r.adb;process.env.OVERLAY_PYTHON=r.python;process.env.OVERLAY_SERIAL=options.serial||'';process.env.OVERLAY_INTERVAL=String(interval);
 require('./server');
}
if(require.main===module)main().catch(e=>{console.error('Error: '+e.message);process.exitCode=1;});
module.exports={main};
