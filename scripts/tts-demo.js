const {SpeechQueue}=require('../tts/queue');
const {sanitize}=require('../tts/sanitizer');
async function main(){
 const q=new SpeechQueue();
 for(const [author,text] of [['Pedro','Hola, esto es una prueba.'],['John','Este mensaje debe sonar después del anterior.'],['Pedro','Mira esto https://example.com/prueba']])q.enqueue(sanitize({author,text}));
 const stop=()=>{q.stop();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
 await q.idle();process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
 if(q.failed)throw Error('La prueba de voz falló. Revisa los mensajes de TTS.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
