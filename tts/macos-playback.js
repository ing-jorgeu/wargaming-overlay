const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');const {wav}=require('./wav');
async function playMacOS(samples,sampleRate,{spawnImpl=spawn}={}){
 const dir=process.env.OVERLAY_TTS_TEMP_DIR||await fs.mkdtemp(path.join(os.tmpdir(),'overlay-tts-'));
 try{
  const file=path.join(dir,'speech.wav');await fs.writeFile(file,wav(samples,sampleRate));
  await new Promise((resolve,reject)=>{
   const child=spawnImpl('/usr/bin/afplay',[file],{shell:false,stdio:['ignore','ignore','pipe']});let error='';
   child.stderr.on('data',d=>error=(error+d).slice(-1000));
   child.once('error',e=>reject(Error('No se pudo abrir afplay: '+e.message)));
   child.once('close',(code,signal)=>code===0?resolve():reject(Error('Falló afplay ('+(signal||code)+'): '+error)));
  });
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
module.exports={playMacOS};
