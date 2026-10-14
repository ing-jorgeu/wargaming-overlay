// Isolate native synthesis/playback from the overlay. Killing this process cancels both.
const {generate}=require('./kokoro-engine');
const {play}=require('./playback');
let input='';process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{input+=chunk;if(input.length>20000)process.exit(1);});
process.stdin.on('end',async()=>{
 try{
  const {text,voice,speed,cacheDir}=JSON.parse(input);const start=performance.now();
  const {samples,sampleRate}=await generate(text,{voice,speed,cacheDir,log:message=>console.error(message)});
  console.error(`[Kokoro] Audio generado en ${((performance.now()-start)/1000).toFixed(2)} s.`);
  console.error('[Kokoro] Reproduciendo audio.');
  if(process.platform==='win32')await require('./windows-playback').playWindows(samples,sampleRate);else if(process.platform==='darwin')await require('./macos-playback').playMacOS(samples,sampleRate);else await play(samples,sampleRate);process.exit(0);
 }catch(e){console.error('[Kokoro] '+e.message);process.exit(1);}
});
