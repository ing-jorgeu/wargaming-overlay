const fs=require('node:fs'),path=require('node:path');
function configFor(dataDir,env=process.env){
 let file={};try{file=JSON.parse(fs.readFileSync(path.join(dataDir,'youtube-tts.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw Error('Configuración youtube-tts.json inválida.');}
 const config={enabled:true,maxMessageLength:300,maxQueueLength:10,readUsername:true,filterUrls:true,extraBlockedTerms:[],...file};
 for(const [key,min,max] of [['maxMessageLength',50,300],['maxQueueLength',1,100]])if(!Number.isInteger(config[key])||config[key]<min||config[key]>max)throw Error(`Configuración ${key} fuera de rango.`);
 for(const key of ['enabled','readUsername','filterUrls'])if(typeof config[key]!=='boolean')throw Error(`Configuración ${key} debe ser true/false.`);
 if(!Array.isArray(config.extraBlockedTerms)||config.extraBlockedTerms.some(t=>typeof t!=='string'||t.length>100))throw Error('extraBlockedTerms debe ser una lista de textos cortos.');
 if(config.httpFallback!==undefined&&typeof config.httpFallback!=='boolean')throw Error('httpFallback debe ser true/false.');
 if(config.apiKeyFile){if(typeof config.apiKeyFile!=='string')throw Error('apiKeyFile debe ser una ruta.');try{config.apiKey=fs.readFileSync(path.resolve(config.apiKeyFile),'utf8').trim();}catch{throw Error('No se pudo leer apiKeyFile.');}if(!config.apiKey||/\s/.test(config.apiKey))throw Error('El archivo API key debe contener únicamente la clave.');}
 return config;
}
function startYouTube(dataDir,{env=process.env,platform=process.platform,log=console.log}={}){
 if(env.YOUTUBE_CHAT_TTS_ENABLED!=='true'){log('[YouTube] Chat TTS desactivado. Actívalo con YOUTUBE_CHAT_TTS_ENABLED=true.');return null;}
 try{
  if(!['darwin','win32','linux'].includes(platform))throw Error('Sistema no compatible con TTS.');
  const config=configFor(dataDir,env);if(!config.enabled){log('[YouTube] TTS desactivado en configuración.');return null;}
  require('../tts/speech').settings(config,env,platform);
  const {YouTubeService}=require('./service');
  log('[YouTube] Iniciando chat TTS. Si falta autorización, ejecuta wargaming-overlay youtube-auth --client-secret /ruta/client.json.');
  return new YouTubeService({config,log,speech:require('../tts/speech').createSpeech(config,{env,platform,log})}).start();
 }catch(e){log('[YouTube] '+e.message+' El overlay continúa funcionando.');return null;}
}
module.exports={startYouTube,configFor};
