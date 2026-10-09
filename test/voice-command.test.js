const test=require('node:test'),assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {main}=require('../cli');const {testVoice}=require('../tts/voice-command');
test('CLI voice command forwards text and overrides then returns without starting server',async()=>{
 const text='--output-file=example [[slnc 99]] Hola';let calls=0;
 await main(['test-tts','--text',text,'--voice','em_alex','--speed','1.2','--fallback','none'],{voiceTest:async(t,o)=>{calls++;assert.equal(t,text);assert.equal(o.voice,'em_alex');assert.equal(o.speed,'1.2');assert.equal(o.fallback,'none');}});
 assert.equal(calls,1);assert.equal(require.cache[require.resolve('../server')],undefined);
});
test('CLI rejects unrelated options and missing voice text before audio',async()=>{
 await assert.rejects(main(['test-tts','--text','hola','--port','8765']),/no se usa/);
 await assert.rejects(main(['start','--voice','em_alex']),/solo se usa/);
 await assert.rejects(main(['test-tts']),/Indica un texto/);
 await assert.rejects(main(['test-tts','--text']),/Falta el valor/);
 await assert.rejects(main(['test-tts','--text','  ']),/Indica un texto/);
});
test('voice test reads only local TTS config, CLI overrides env, awaits audio, preserves file',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'voice-command-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'youtube-tts.json');const original=JSON.stringify({enabled:false,kokoroVoice:'ef_dora',apiKeyFile:'/nonexistent-do-not-read'});await fs.writeFile(file,original);
 const signals=new EventEmitter();let release,finished=false;
 const pending=testVoice('Hola',{dataDir:dir,voice:'em_santa',provider:'kokoro',speed:'1.1',fallback:'none'},{env:{KOKORO_VOICE:'em_alex'},signals,speechFactory:(config,options)=>{
  assert.equal(config.enabled,false);assert.equal(options.env.KOKORO_VOICE,'em_santa');assert.equal(options.env.KOKORO_SPEED,'1.1');assert.equal(options.env.TTS_FALLBACK,'none');
  return async(text,{signal})=>{assert.equal(text,'Hola');assert.equal(signal.aborted,false);await new Promise(r=>release=r);};
 }}).then(()=>{finished=true;});
 assert.equal(finished,false);release();await pending;assert.equal(await fs.readFile(file,'utf8'),original);assert.equal(signals.listenerCount('SIGINT'),0);assert.equal(signals.listenerCount('SIGTERM'),0);
});
test('voice test Ctrl+C aborts audio and removes listeners on failure',async()=>{
 const signals=new EventEmitter();let signal;
 const pending=testVoice('Hola',{}, {signals,speechFactory:()=>async(t,opts)=>{signal=opts.signal;await new Promise(r=>signal.addEventListener('abort',r,{once:true}));}});
 signals.emit('SIGINT');await pending;assert.equal(signal.aborted,true);assert.equal(signals.listenerCount('SIGINT'),0);
 await assert.rejects(testVoice('Hola',{}, {signals,speechFactory:()=>async()=>{throw Error('audio failed');}}),/audio failed/);assert.equal(signals.listenerCount('SIGTERM'),0);
});
test('--test-tts works directly and through npm start arguments without starting the overlay',async()=>{
 for(const args of [['--test-tts','hola mundo'],['start','--test-tts','hola mundo']]){
  let called=false;await main(args,{voiceTest:async(text)=>{assert.equal(text,'hola mundo');called=true;}});assert.equal(called,true);
 }
 assert.equal(require.cache[require.resolve('../server')],undefined);
 assert.equal(require('../package.json').bin['warhammer-overlay'],'cli.js');
 await assert.rejects(main(['--test-tts']),/Falta el valor/);
 await assert.rejects(main(['--test-tts','']),/Indica un texto/);
 await assert.rejects(main(['doctor','--test-tts','hola']),/solo se usa/);
});
