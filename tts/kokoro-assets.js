const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {createHash,randomUUID}=require('node:crypto');
const MODEL='onnx-community/Kokoro-82M-v1.0-ONNX';
const REVISION='1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const ASSETS={
 'onnx/model_quantized.onnx':'fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478',
 'voices/ef_dora.bin':'f66ec66bd295acb18372e37008533a9a3228483ccd294e7538d5d9294ac9a532',
 'voices/em_alex.bin':'27809e9eafdcbcfff90a3016c697568676531de2a2c39cee29c96c7bd6b83e95',
 'voices/em_santa.bin':'ad43b774e1ca24d05c6161297d8aeb770ac3d29bb95daf516727af5f7d543683',
 'tokenizer.json':'77a02c8e164413299b4b4c403b14f8e0e1c1b727db4d46a09d6327b861060a34'
};
function cacheDirectory(){return process.env.KOKORO_CACHE_DIR||path.join(os.homedir(),'.cache','wargaming-overlay','kokoro',REVISION);}
const hash=b=>createHash('sha256').update(b).digest('hex');
async function asset(name,{cacheDir=cacheDirectory(),fetchImpl=fetch,signal,log=()=>{}}={}){
 if(!Object.hasOwn(ASSETS,name))throw Error('Recurso Kokoro desconocido.');
 const dest=path.join(cacheDir,name);
 try{const b=await fs.readFile(dest);if(hash(b)===ASSETS[name])return b;}catch(e){if(e.code!=='ENOENT')throw e;}
 log(`[Kokoro] Descargando ${name} (solo la primera vez).`);
 const response=await fetchImpl(`https://huggingface.co/${MODEL}/resolve/${REVISION}/${name}`,{signal:signal||AbortSignal.timeout(90000)});
 if(!response.ok)throw Error(`Descarga Kokoro: HTTP ${response.status}.`);
 const data=Buffer.from(await response.arrayBuffer());if(hash(data)!==ASSETS[name])throw Error('La descarga Kokoro no pasó la verificación de integridad.');
 await fs.mkdir(path.dirname(dest),{recursive:true});const temporary=dest+'.'+randomUUID()+'.tmp';
 try{await fs.writeFile(temporary,data);await fs.rename(temporary,dest);}finally{await fs.rm(temporary,{force:true});}
 return data;
}
async function ensureAssets(options){const [model,tokenizer,...voices]=await Promise.all(['onnx/model_quantized.onnx','tokenizer.json','voices/ef_dora.bin','voices/em_alex.bin','voices/em_santa.bin'].map(name=>asset(name,options)));return {model,voices:Object.fromEntries(['ef_dora','em_alex','em_santa'].map((v,i)=>[v,voices[i]])),vocab:JSON.parse(tokenizer).model.vocab};}
module.exports={ensureAssets,asset,ASSETS,MODEL,REVISION,cacheDirectory};
