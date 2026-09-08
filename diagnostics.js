const fs=require('fs'),path=require('path'),os=require('os');
const {spawnSync}=require('child_process');
const {locate,platformGuide}=require('./platform');
function deviceStatus(output,serial){
 const devices=output.split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('List of')&&!l.startsWith('*')).map(l=>{const [id,state]=l.split(/\s+/);return {id,state}});
 const none='ADB no detecta un teléfono. Conéctalo con un cable de datos y desbloquéalo. En Android: Ajustes → Acerca del teléfono → Información de software → pulsa 7 veces Número de compilación; después Opciones de desarrollador → Depuración USB. ADB no permite distinguir entre un cable desconectado y depuración desactivada.';
 if(!devices.length)return {ok:false,code:'NO_DEVICE',message:none};
 if(!serial&&devices.length>1)return {ok:false,code:'MULTIPLE_DEVICES',message:'Hay varios dispositivos. Usa --serial SERIAL. Disponibles: '+devices.map(d=>d.id).join(', ')};
 const d=serial?devices.find(d=>d.id===serial):devices[0];
 if(!d)return {ok:false,code:'DEVICE_NOT_FOUND',message:`No está conectado el dispositivo ${serial}.`};
 if(d.state==='unauthorized')return {ok:false,code:'UNAUTHORIZED',message:'Teléfono conectado, pero sin autorización. Desbloquéalo y acepta «Permitir depuración USB» para este equipo. Si no aparece, desconecta y reconecta el cable.'};
 if(d.state==='no')return {ok:false,code:'USB_PERMISSIONS',message:'Sin permisos USB. Revisa las reglas udev y los grupos del usuario. En Ubuntu: android-sdk-platform-tools-common y grupo plugdev; vuelve a iniciar sesión tras cambiar los grupos.'};
 if(d.state==='offline')return {ok:false,code:'OFFLINE',message:'El teléfono aparece offline. Desbloquéalo y reconecta el cable USB.'};
 if(d.state!=='device')return {ok:false,code:'DEVICE_UNAVAILABLE',message:`Estado del teléfono: ${d.state}. Abre Android normalmente y comprueba la conexión USB.`};
 return {ok:true,code:'READY',message:'Teléfono conectado y autorizado.',serial:d.id};
}
function findPython(explicit){
 const commands=explicit?[explicit]:process.platform==='win32'?['python3','python','py']:['python3','python'];
 for(const command of commands){
  const exe=locate(command);if(!exe)continue;
  const args=(!explicit&&command==='py')?['-3']:[];
  const r=spawnSync(exe,[...args,'-c','import sys; assert sys.version_info >= (3,8); print(sys.executable)'],{encoding:'utf8',timeout:10000,windowsHide:true});
  if(r.status===0&&r.stdout.trim())return r.stdout.trim();
 }
 return null;
}
function check(options={}){
 const adb=locate(options.adb||'adb');
 const python=findPython(options.python);
 if(!adb)return {ok:false,code:'ADB_MISSING',message:'No se encontró ADB. Ejecuta wargaming-overlay setup --install-adb o instala Android SDK Platform-Tools.',python};
 if(!python)return {ok:false,code:'PYTHON_MISSING',message:'No se encontró Python 3.8 o posterior. '+platformGuide(process.platform),adb};
 const py=spawnSync(python,['-c','import sys; assert sys.version_info >= (3,8)'],{encoding:'utf8',timeout:10000});
 if(py.status!==0)return {ok:false,code:'PYTHON_VERSION',message:'Se necesita Python 3.8 o posterior. Usa --python /ruta/a/python3.',adb,python};
 const result=spawnSync(adb,['devices','-l'],{encoding:'utf8',timeout:15000});
 if(result.error||result.status!==0)return {ok:false,code:'ADB_ERROR',message:'ADB no pudo consultar el teléfono: '+(result.error?.message||(result.stderr||'').trim()).slice(0,600),adb,python};
 return {...deviceStatus(result.stdout,options.serial),adb,python};
}
module.exports={locate,deviceStatus,check,findPython};
