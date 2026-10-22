const {createHash,randomUUID}=require('node:crypto');
const WebSocket=require('ws');
const hash=s=>createHash('sha256').update(s).digest('base64');
class Obs {
 constructor({url='ws://127.0.0.1:4455',password='',WebSocketImpl=WebSocket}={}){const u=new URL(url);if(!['ws:','wss:'].includes(u.protocol)||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password)throw Error('OBS debe estar en este Mac: ws://127.0.0.1:4455.');this.url=url;this.password=password;this.Impl=WebSocketImpl;this.pending=new Map();}
 async connect(){if(this.ready)return;if(this.connecting)return this.connecting;this.connecting=new Promise((resolve,reject)=>{
 const ws=this.ws=new this.Impl(this.url);let settled=false;
 const finish=e=>{if(settled)return;settled=true;clearTimeout(timer);e?reject(e):resolve();};
 const timer=setTimeout(()=>{finish(Error('OBS no respondió. Activa Herramientas → Ajustes del servidor WebSocket.'));ws.close();},6000);
 ws.on('message',raw=>{try{const m=JSON.parse(raw);if(m.op===0){if(m.d.rpcVersion<1)throw Error('Se requiere OBS WebSocket 5.');const d={rpcVersion:1,eventSubscriptions:0};if(m.d.authentication)d.authentication=hash(hash(this.password+m.d.authentication.salt)+m.d.authentication.challenge);ws.send(JSON.stringify({op:1,d}));}
 if(m.op===2){this.ready=true;finish();}if(m.op===7){const p=this.pending.get(m.d.requestId);if(p){this.pending.delete(m.d.requestId);clearTimeout(p.timer);m.d.requestStatus.result?p.resolve(m.d.responseData||{}):p.reject(Error(m.d.requestStatus.comment||'OBS rechazó '+m.d.requestType));}}}catch(e){finish(e);ws.close();}});
 ws.on('error',e=>finish(Error('No se pudo conectar a OBS WebSocket en este Mac ('+(e.code||'red')+'). Pulsa Aplicar en sus ajustes.')));
 ws.on('close',code=>{this.ready=false;finish(Error(code===4009?'OBS rechazó la contraseña WebSocket. Copia la contraseña actual de OBS.':'OBS cerró la conexión ('+code+').'));for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('OBS se desconectó.'));}this.pending.clear();});
 });try{await this.connecting;}finally{this.connecting=null;}}
 async call(requestType,requestData={}){await this.connect();const requestId=randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(requestId);reject(Error('OBS tardó demasiado en '+requestType));},6000);this.pending.set(requestId,{resolve,reject,timer});this.ws.send(JSON.stringify({op:6,d:{requestType,requestId,requestData}}));});}
 async inspect(scene){const version=await this.call('GetVersion');for(const name of ['GetSourceScreenshot','GetSceneList','GetSceneItemList','GetInputSettings','GetVideoSettings'])if(!version.availableRequests?.includes(name))throw Error('OBS no admite '+name+'. Actualiza OBS WebSocket 5.');const {scenes}=await this.call('GetSceneList');if(!scenes.some(s=>s.sceneName===scene))throw Error('Selecciona una escena limpia de referencia existente.');const names=new Set(scenes.map(s=>s.sceneName)),visited=new Set();let count=0;
 const walk=async(name,group=false)=>{const key=(group?'g:':'s:')+name;if(visited.has(key))return;visited.add(key);if(++count>100)throw Error('La escena tiene demasiados niveles para verificarla.');const {sceneItems}=await this.call(group?'GetGroupSceneItemList':'GetSceneItemList',{sceneName:name});for(const item of sceneItems){if(item.isGroup){await walk(item.sourceName,true);continue;}if(names.has(item.sourceName)){await walk(item.sourceName);continue;}if(item.inputKind==='browser_source'){const {inputSettings}=await this.call('GetInputSettings',{inputName:item.sourceName});let url;try{url=new URL(inputSettings.url);}catch{}if(url?.pathname==='/output'||url?.pathname.startsWith('/tactics'))throw Error('La referencia contiene anotaciones. Usa una escena limpia sin la capa táctica.');}}};await walk(scene);const video=await this.call('GetVideoSettings');return {version:version.obsVersion,width:video.baseWidth,height:video.baseHeight,scenes:scenes.map(s=>s.sceneName)};
 }
 close(){this.ready=false;this.ws?.close();}
}
module.exports={Obs,hash};
