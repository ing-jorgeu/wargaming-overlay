function wav(samples,sampleRate){
 const data=Buffer.alloc(44+samples.length*2);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(sampleRate,24);data.writeUInt32LE(sampleRate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(samples.length*2,40);
 for(let i=0;i<samples.length;i++)data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),44+i*2);
 return data;
}
module.exports={wav};
