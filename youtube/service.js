const {EventEmitter}=require('node:events');
const {setTimeout:delay}=require('node:timers/promises');
const {Auth}=require('./auth');
const {findBroadcast}=require('./live-broadcast');
const {streamChat,normalize}=require('./live-chat');
const {SpeechQueue}=require('../tts/queue');
const {sanitize}=require('../tts/sanitizer');
const backoff=[1000,2000,5000,10000,30000];
class YouTubeService extends EventEmitter {
 constructor({config={},auth=new Auth(),discover=findBroadcast,stream=streamChat,queue,log=console.log,sleep=(ms,signal)=>delay(ms,null,{signal}),now=Date.now}={}){
  super();this.config=config;this.auth=auth;this.discover=discover;this.stream=stream;this.log=log;this.sleep=sleep;this.now=now;
  this.queue=queue||new SpeechQueue({maxQueueLength:config.maxQueueLength||10,log});this.state='DISCONNECTED';this.seen=new Set();this.controller=new AbortController();this.chat=null;this.pageToken=undefined;this.task=null;
 }
 status(state,message){if(this.state!==state||this.lastMessage!==message){this.state=state;this.lastMessage=message;this.log('[YouTube] '+message);}}
 start(){if(!this.task)this.task=this.run().catch(()=>{if(!this.controller.signal.aborted)this.status('DISCONNECTED','Servicio detenido por un error inesperado; el overlay continúa.');});return this;}
 async stop(){this.controller.abort();await this.queue.stop();await this.task;}
 endChat(){this.chat=null;this.pageToken=undefined;this.queue.clear();this.status('WAITING_FOR_STREAM','Directo terminado o chat no disponible; buscando otro directo.');}
 async run(){
  const signal=this.controller.signal;let failures=0;
  while(!signal.aborted){
   try{
    if(!this.chat){
     await this.auth.token(signal);this.status('AUTHENTICATED','Autorización cargada.');
     const broadcast=await this.discover(this.auth,{signal});
     if(!broadcast){this.status('WAITING_FOR_STREAM','Sin directo activo con chat; volveré a comprobar en 60 segundos.');await this.sleep(60000,signal);continue;}
     this.chat=broadcast.liveChatId;this.pageToken=undefined;this.startedAt=this.now();
     this.log(`[YouTube] Directo detectado${broadcast.multiple?' (hay varios; se usa el primero por ID)':''}.`);
    }
    let ended=false;
    this.status('CONNECTED_TO_CHAT','Conectando al chat en vivo mediante streamList…');
    for await(const batch of this.stream({auth:this.auth,liveChatId:this.chat,pageToken:this.pageToken,signal})){
     if(signal.aborted)break;
     failures=0;this.status('CONNECTED_TO_CHAT','Chat conectado; esperando mensajes nuevos.');
     if(batch.offlineAt || (batch.items||[]).some(i=>i.snippet?.type===4)){ended=true;break;}
     for(const item of batch.items||[]){
      if(!item.id||this.seen.has(item.id))continue;
      this.seen.add(item.id);if(this.seen.size>1000)this.seen.delete(this.seen.values().next().value);
      const event=normalize(item);if(!event)continue;
      // Initial streamList replies include history: never speak pre-connection messages.
      if(!Number.isFinite(Date.parse(event.timestamp)) || Date.parse(event.timestamp)<this.startedAt)continue;
      const safe=sanitize(event,this.config);if(!safe)continue;
      this.log(`[Chat] ${safe.author}: ${safe.text}`);
      // Future consumers receive the normalized event; listener failures stay isolated.
      try{this.emit('message',event);}catch{this.log('[YouTube] Falló un consumidor de mensajes.');}
      this.queue.enqueue(safe);
     }
     this.pageToken=batch.nextPageToken||this.pageToken;
    }
    if(ended){this.endChat();await this.sleep(60000,signal);continue;}
    if(!signal.aborted)throw Error('Chat connection closed');
   }catch(e){
    if(signal.aborted)break;
    if(e.code===16)this.auth.invalidate();
    if([5,9].includes(e.code)){this.endChat();await this.sleep(60000,signal);continue;}
    if(e.code===3)this.pageToken=undefined;
    const ms=backoff[Math.min(failures++,backoff.length-1)];
    // Do not print upstream payloads or request objects: they may contain credentials.
    this.status('DISCONNECTED',`Conexión/autorización no disponible${Number.isInteger(e.code)?' (código '+e.code+')':''}. Reintento en ${ms/1000}s. Si persiste, revisa OAuth, API y cuota.`);
    await this.sleep(ms,signal);
   }
  }
 }
}
module.exports={YouTubeService,backoff};
