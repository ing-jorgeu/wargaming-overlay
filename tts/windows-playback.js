const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');const {wav}=require('./wav');
async function playWindows(samples,sampleRate,{spawnImpl=spawn}={}){
 const dir=process.env.OVERLAY_TTS_TEMP_DIR||await fs.mkdtemp(path.join(os.tmpdir(),'overlay-tts-'));const file=path.join(dir,'speech.wav');
 try{
  await fs.writeFile(file,wav(samples,sampleRate));
  await new Promise((resolve,reject)=>{
   const child=spawnImpl('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; $player=New-Object System.Media.SoundPlayer; try { $player.SoundLocation=$env:OVERLAY_TTS_WAV; $player.Load(); $player.PlaySync() } finally { $player.Dispose() }"],{shell:false,windowsHide:true,stdio:'ignore',env:{...process.env,OVERLAY_TTS_WAV:file}});
   child.once('error',()=>reject(Error('No se pudo abrir el audio integrado de Windows.')));
   child.once('close',code=>code===0?resolve():reject(Error('Falló el audio integrado de Windows.')));
  });
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
module.exports={playWindows};
