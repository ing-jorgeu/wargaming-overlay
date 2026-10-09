const fs=require('node:fs'),path=require('node:path');
const {createSpeech}=require('./speech');
async function testVoice(text,{dataDir,provider,voice,speed,fallback}={}, {speechFactory=createSpeech,signals=process,env=process.env}={}){
 if(typeof text!=='string'||!text.trim())throw Error('Indica un texto: wargaming-overlay --test-tts "Hola, esta es una prueba."');
 let config={};
 if(dataDir){try{config=JSON.parse(fs.readFileSync(path.join(dataDir,'youtube-tts.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw Error('Configuración youtube-tts.json inválida.');}}
 // CLI overrides environment and file settings, without changing the saved configuration.
 const overrides={...env};
 for(const [key,value] of Object.entries({TTS_PROVIDER:provider,KOKORO_VOICE:voice,KOKORO_SPEED:speed,TTS_FALLBACK:fallback}))if(value!==undefined)overrides[key]=String(value);
 const speech=speechFactory(config,{env:overrides});const controller=new AbortController();
 const stop=()=>controller.abort();signals.once('SIGINT',stop);signals.once('SIGTERM',stop);
 try{await speech(text,{signal:controller.signal});}finally{signals.removeListener('SIGINT',stop);signals.removeListener('SIGTERM',stop);}
}
module.exports={testVoice};
