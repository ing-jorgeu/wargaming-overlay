const {ensureAssets}=require('./kokoro-assets');
let engine;
async function load(options={}){
 if(!engine)engine=(async()=>{
  const wasm=process.platform==='win32'||process.env.KOKORO_RUNTIME==='wasm';
  const ort=require(wasm?'onnxruntime-web':'onnxruntime-node');
  if(wasm)ort.env.wasm.numThreads=1;
  const {model,voices,vocab}=await ensureAssets(options);
  const {default:init}=await import('@echogarden/espeak-ng-emscripten');
  const module=await init();const espeak=new module.eSpeakNGWorker();
  const session=await ort.InferenceSession.create(model,{executionProviders:[wasm?'wasm':'cpu'],intraOpNumThreads:2});
  return {ort,voices,vocab,espeak,session};
 })().catch(e=>{engine=null;throw e;});
 return engine;
}
async function generate(text,{voice='ef_dora',speed=1,...options}={}){
 if(!['ef_dora','em_alex','em_santa'].includes(voice))throw Error('Voz española desconocida.');
 if(!Number.isFinite(speed)||speed<0.5||speed>2)throw Error('kokoroSpeed debe estar entre 0.5 y 2.');
 const {ort,voices,vocab,espeak,session}=await load(options);
 espeak.set_voice('es');
 // Preserve clause punctuation and map eSpeak IPA affricates to Kokoro's vocabulary.
 const phones=String(text).normalize('NFC').split(/([:;,.!?])/).map(part=>/^[,:;.!?]$/.test(part)?part:espeak.synthesize_ipa(part.replace(/[<>\[\]]/g,'')).ipa.replaceAll('_','').trim().replace(/\n/g,' ')).join(' ').replaceAll('tʃ','ʧ').replaceAll('dʒ','ʤ').replace(/\u0361/g,'');
 const tokens=Array.from(phones).filter(c=>vocab[c]!==undefined).map(c=>vocab[c]);
 if(!tokens.length)throw Error('No hay texto pronunciable.');
 if(tokens.length>509)throw Error('El texto excede el límite de Kokoro.');
 const ids=[0,...tokens,0];const offset=tokens.length*256*4;
 const bytes=voices[voice].subarray(offset,offset+1024);const style=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length));
 const out=await session.run({input_ids:new ort.Tensor('int64',BigInt64Array.from(ids,BigInt),[1,ids.length]),style:new ort.Tensor('float32',style,[1,256]),speed:new ort.Tensor('float32',Float32Array.of(speed),[1])});
 return {samples:out.waveform.data,sampleRate:24000};
}
module.exports={generate};
