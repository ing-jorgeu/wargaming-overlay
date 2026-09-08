const fs=require('fs'),path=require('path'),os=require('os');
function context(overrides={}){return {platform:process.platform,env:process.env,home:os.homedir(),...overrides}}
function dataDirectory(overrides={}){
 const {platform,env,home}=context(overrides),p=platform==='win32'?path.win32:path.posix;
 if(platform==='win32')return p.join(env.LOCALAPPDATA||p.join(home,'AppData','Local'),'wargaming-overlay');
 if(platform==='darwin')return p.join(home,'Library','Application Support','wargaming-overlay');
 return p.join(env.XDG_DATA_HOME||p.join(home,'.local','share'),'wargaming-overlay');
}
function candidates(command,overrides={}){
 const {platform,env,home}=context(overrides),win=platform==='win32',p=win?path.win32:path.posix;
 const explicit=/[\\/]/.test(command)||p.isAbsolute(command);
 const names=win&&!p.extname(command)?[command+'.exe',command+'.com',command]:[command];
 // Only native executables: never shell out through a .cmd or .bat wrapper.
 const searchPath=env.PATH||env.Path||env.path||'';
 const paths=explicit?names:searchPath.split(win?';':':').filter(Boolean).flatMap(dir=>names.map(n=>p.join(dir.replace(/^"|"$/g,''),n)));
 if(!explicit&&command==='adb'){
  const sdkRoots=[env.ANDROID_HOME,env.ANDROID_SDK_ROOT,win&&p.join(env.LOCALAPPDATA||p.join(home,'AppData','Local'),'Android','Sdk'),!win&&p.join(home,'Library','Android','sdk'),!win&&p.join(home,'Android','Sdk')].filter(Boolean);
  for(const sdk of sdkRoots)paths.push(p.join(sdk,'platform-tools',win?'adb.exe':'adb'));
  if(win&&env.LOCALAPPDATA)paths.push(p.join(env.LOCALAPPDATA,'Microsoft','WinGet','Links','adb.exe'));
  if(!win)paths.push('/opt/homebrew/bin/adb','/usr/local/bin/adb');
 }
 if(!explicit&&command==='brew'&&platform==='darwin')paths.push('/opt/homebrew/bin/brew','/usr/local/bin/brew');
 return [...new Set(paths)];
}
function locate(command,overrides={}){
 const {platform}=context(overrides);
 for(const file of candidates(command,overrides))try{if(!fs.statSync(file).isFile())continue;fs.accessSync(file,platform==='win32'?fs.constants.F_OK:fs.constants.X_OK);return file}catch{}
 return null;
}
function installPlan(platform,has){
 if(platform==='darwin'&&has('brew'))return {command:'brew',args:['install','--cask','android-platform-tools']};
 if(platform==='win32'&&has('winget'))return {command:'winget',args:['install','--exact','--id','Google.PlatformTools','--source','winget']};
 if(platform==='linux'){
  if(has('apt-get'))return {command:'apt-get',args:['install','adb','android-sdk-platform-tools-common'],elevated:true};
  if(has('dnf'))return {command:'dnf',args:['install','android-tools'],elevated:true};
  if(has('pacman'))return {command:'pacman',args:['-S','android-tools','android-udev'],elevated:true};
 }
 return null;
}
function platformGuide(platform){
 if(platform==='win32')return 'Windows: instala ADB con WinGet o descarga Platform-Tools de Google. Si falta Python, instala Python 3 desde python.org. Si el teléfono no aparece, revisa el controlador USB del fabricante. Después de instalar, abre otra terminal para actualizar PATH.';
 if(platform==='darwin')return 'macOS: ADB con Homebrew (brew install --cask android-platform-tools). Python: brew install python, o python.org. No se requieren controladores USB adicionales.';
 if(platform==='linux')return 'Linux: ADB con apt-get (Debian/Ubuntu), dnf (Fedora) o pacman (Arch). Instala Python 3 con el gestor de tu distribución. Si aparece «no permissions», revisa reglas udev y permisos USB. En Ubuntu comprueba el grupo plugdev y vuelve a iniciar sesión después de cambiarlo.';
 return 'Plataforma sin instalador automático. Instala Python 3 y Android SDK Platform-Tools manualmente.';
}
module.exports={dataDirectory,candidates,locate,installPlan,platformGuide};
