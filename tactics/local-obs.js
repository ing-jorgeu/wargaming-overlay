const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
function localObs({platform=process.platform,home=os.homedir(),env=process.env,read=fs.readFileSync}={}){
 const base=platform==='darwin'?path.join(home,'Library','Application Support'):platform==='win32'?(env.APPDATA||path.join(home,'AppData','Roaming')):(env.XDG_CONFIG_HOME||path.join(home,'.config'));
 let c;try{c=JSON.parse(read(path.join(base,'obs-studio','plugin_config','obs-websocket','config.json'),'utf8'));}catch{throw Error('No se encontró la configuración local de OBS. Usa la conexión manual (necesaria en OBS portable).');}
 if(c.server_enabled!==true)throw Error('Habilita WebSocket en OBS y pulsa Aplicar antes de conectar.');
 if(!Number.isInteger(c.server_port)||c.server_port<1||c.server_port>65535)throw Error('El puerto guardado por OBS no es válido. Revisa sus ajustes.');
 if(c.auth_required!==false&&(typeof c.server_password!=='string'||!c.server_password))throw Error('OBS no tiene una contraseña guardada válida. Revisa sus ajustes y pulsa Aplicar.');
 return {url:'ws://127.0.0.1:'+c.server_port,password:c.auth_required===false?'':c.server_password};
}
module.exports={localObs};
