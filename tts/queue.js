const {speak}=require('./speech');
class SpeechQueue {
 constructor({maxQueueLength=10,speech=speak,log=console.log}={}){this.max=maxQueueLength;this.speech=speech;this.log=log;this.queue=[];this.state='IDLE';this.closed=false;this.task=null;this.failed=0;}
 enqueue(message){
  if(this.closed)return;
  if(this.queue.length>=this.max){this.queue.shift();this.log('[TTS] Se descartó el mensaje pendiente más antiguo: cola llena.');}
  this.queue.push(message);this.log(`[TTS] En cola: ${message.author}. Pendientes: ${this.queue.length}.`);
  if(!this.task)this.task=this.drain().finally(()=>{this.task=null;});
 }
 async drain(){
  while(!this.closed&&this.queue.length){
   const item=this.queue.shift();this.state='SPEAKING';this.controller=new AbortController();
   this.log(`[TTS] Leyendo mensaje de ${item.author}.`);
   try{await this.speech(item.spoken,{signal:this.controller.signal});}catch{this.failed++;this.log('[TTS] Falló la reproducción; continúo con el siguiente mensaje.');}
  }
  this.state='IDLE';
 }
 clear(){this.queue=[];this.controller?.abort();}
 async stop(){this.closed=true;this.clear();await this.task;}
 async idle(){await this.task;}
}
module.exports={SpeechQueue};
