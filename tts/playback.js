// No external player: the npm package contains native CoreAudio/WASAPI/ALSA bindings.
async function play(samples,sampleRate,{cpal=require('node-cpal')}={}){
 let host,device,stream;
 try{
  host=cpal.defaultHost();device=host.defaultOutputDevice();
  if(!device)throw Error('No hay salida de audio predeterminada.');
  let supported=device.defaultOutputConfig();
  if(supported.sampleFormat()!==cpal.SampleFormat.F32){
   const candidate=[...device.supportedOutputConfigs()].find(c=>c.sampleFormat()===cpal.SampleFormat.F32);
   if(!candidate)throw Error('La salida de audio no admite float32.');
   supported=candidate.tryWithSampleRate(supported.sampleRate())||candidate.tryWithStandardSampleRate()||candidate.withMaxSampleRate();
  }
  const config=supported.config();let position=0,finished=false,drainTimer;
  await new Promise((resolve,reject)=>{
   stream=device.buildOutputStream(config,cpal.SampleFormat.F32,data=>{
    for(let frame=0;frame<data.length/config.channels;frame++){
     const left=Math.floor(position),fraction=position-left;
     const sample=left<samples.length?(samples[left]*(1-fraction)+(samples[Math.min(left+1,samples.length-1)]||0)*fraction):0;
     for(let channel=0;channel<config.channels;channel++)data[frame*config.channels+channel]=sample;
     position+=sampleRate/config.sampleRate;
    }
    if(position>=samples.length&&!finished){finished=true;drainTimer=setTimeout(resolve,Math.ceil(data.length/config.channels/config.sampleRate*1000)+250);}
   },error=>{clearTimeout(drainTimer);reject(error);});
   stream.play();
  });
 }finally{stream?.close();device?.close();host?.close();}
}
module.exports={play};
