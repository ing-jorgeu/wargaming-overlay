const path=require('node:path');const {dataDirectory}=require('../platform');const {probe,GalaxySession}=require('./session');
const help=`Galaxy + Tabletop Battles (experimental; Android/One UI must be verified)
  wargaming-overlay galaxy --connect IP:PORT
  wargaming-overlay galaxy --doctor --serial SERIAL --allow-usb
  wargaming-overlay galaxy --score-display physical --camera-mode scrcpy --connect IP:PORT
Options:
  --score-display virtual|physical    default virtual
  --camera-mode scrcpy|external|none  default scrcpy; external uses your Wi-Fi camera app
  --scrcpy PATH --adb PATH --python PATH --serial SERIAL --connect IP:PORT
  --display-size 1080x1920/320 --camera-size 1920x1080 --camera-fps 30 --bit-rate 4M
  --port 8765 --interval 3 --data-dir PATH --remote-lists --allow-usb --no-reconnect
Ctrl+C stops only this session's processes. Camera and scoreboard have separate windows.
`;
async function main(args){
 const o={};const keys={'--score-display':'scoreDisplay','--camera-mode':'cameraMode','--scrcpy':'scrcpy','--adb':'adb','--python':'python','--serial':'serial','--connect':'connect','--display-size':'displaySize','--camera-size':'cameraSize','--camera-fps':'cameraFps','--bit-rate':'bitRate','--port':'port','--interval':'interval','--data-dir':'dataDir'};
 if(args.includes('--help')){console.log(help);return;}
 while(args.length){const flag=args.shift();if(flag==='--doctor')o.doctor=true;else if(flag==='--allow-usb')o.allowUsb=true;else if(flag==='--no-reconnect')o.reconnect=false;else if(flag==='--remote-lists')o.remoteLists=true;else if(keys[flag]){const value=args.shift();if(!value||value.startsWith('--'))throw Error('Falta '+flag);o[keys[flag]]=value;}else throw Error('Opción Galaxy desconocida: '+flag);}
 o.dataDir=path.resolve(o.dataDir||dataDirectory());
 if(o.doctor){console.log(JSON.stringify(probe(o),null,2));return;}
 const port=Number(o.port||8765);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Puerto: 1024–65535.');
 await new Promise((resolve,reject)=>{const probe=require('node:net').createServer();probe.once('error',()=>reject(Error('El puerto está ocupado. Detén el servidor anterior antes de iniciar Galaxy.')));probe.listen(port,'127.0.0.1',()=>probe.close(resolve));});
 const python=require('../diagnostics').findPython(o.python);if(!python)throw Error('No se encontró Python 3.8+. Configura --python.');o.python=python;
 if(o.interval!==undefined&&(!Number.isFinite(Number(o.interval))||Number(o.interval)<1||Number(o.interval)>60))throw Error('Intervalo: 1–60 segundos.');
 const session=new GalaxySession(o);let stopping=false;
 const stop=async()=>{if(stopping)return;stopping=true;await session.stop();};
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>stop().finally(()=>process.exit()));
 try{await session.start();}catch(e){await stop();throw e;}
}
module.exports={main,help};
