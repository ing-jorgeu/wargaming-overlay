const test=require('node:test'),assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');const {PassThrough}=require('node:stream');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createSpeech,settings}=require('../tts/speech');
const {play}=require('../tts/playback');const {asset}=require('../tts/kokoro-assets');
function processMock(onStart){return (cmd,args,options)=>{
 const child=new EventEmitter();child.stdin=new PassThrough();child.stderr=new PassThrough();let input='';
 child.stdin.on('data',b=>input+=b);child.stdin.on('finish',()=>onStart({child,cmd,args,options,input}));
 child.kill=signal=>{child.killed=signal;queueMicrotask(()=>child.emit('close',null));};return child;
};}
test('Kokoro works on macOS, Windows and Linux settings without say outside macOS',()=>{
 for(const platform of ['darwin','win32','linux'])assert.equal(settings({}, {},platform).provider,'kokoro');
 assert.equal(settings({}, {},'linux').fallback,'none');
 assert.equal(settings({}, {},'darwin').fallback,'say');
 assert.equal(settings({kokoroVoice:'em_alex'},{KOKORO_VOICE:'em_santa'},'win32').voice,'em_santa');
 assert.throws(()=>settings({ttsProvider:'say'},{},'win32'),/solo/);
 assert.throws(()=>settings({kokoroSpeed:0},{},'linux'),/0.5/);
});
test('Kokoro uses Node and stdin, and waits for playback close before releasing queue',async()=>{
 let proc;const speech=createSpeech({}, {env:{},platform:'linux',spawnImpl:processMock(({child,cmd,args,options,input})=>{
  proc=child;assert.equal(cmd,process.execPath);assert.ok(args[0].endsWith('kokoro-worker.js'));assert.equal(options.shell,false);
  assert.deepEqual(JSON.parse(input).text,'--malicious [[slnc 99]] Hola');
 }),log:()=>{}});
 let completed=false;const pending=speech('--malicious [[slnc 99]] Hola').then(()=>{completed=true;});
 await new Promise(r=>setImmediate(r));assert.equal(completed,false);proc.emit('close',0);await pending;
});
test('failure falls back to say exactly once in macOS and is configurable',async()=>{
 const calls=[];const spawnImpl=processMock(({child,cmd})=>{calls.push(cmd);queueMicrotask(()=>child.emit('close',cmd===process.execPath?1:0));});
 await createSpeech({}, {env:{},platform:'darwin',spawnImpl,log:()=>{}})('Hola');assert.deepEqual(calls,[process.execPath,'/usr/bin/say']);
 calls.length=0;await assert.rejects(createSpeech({ttsFallback:'none'}, {env:{},platform:'darwin',spawnImpl,log:()=>{}})('Hola'));assert.deepEqual(calls,[process.execPath]);
});
test('abort and timeout kill synthesis/audio; an abort never triggers fallback',async()=>{
 const calls=[];let child;const spawnImpl=processMock(({child:c,cmd})=>{child=c;calls.push(cmd);});
 const controller=new AbortController();const speech=createSpeech({}, {env:{},platform:'darwin',spawnImpl,log:()=>{}});
 const pending=speech('Hola',{signal:controller.signal});await new Promise(r=>setImmediate(r));controller.abort();await pending;
 assert.equal(child.killed,'SIGKILL');assert.equal(calls.length,1);
 await assert.rejects(createSpeech({ttsFallback:'none'}, {env:{},platform:'linux',spawnImpl,log:()=>{}})('Hola',{timeoutMs:5}),/tiempo/);
 const before=calls.length;const pre=new AbortController();pre.abort();await speech('Hola',{signal:pre.signal});assert.equal(calls.length,before);
});
test('playback uses default output, converts mono to device rate/channels, and closes resources',async()=>{
 const buffers=[],closed=[];let interval;
 const config={channels:2,sampleRate:48000};const stream={play(){interval=setInterval(()=>{const data=new Float32Array(8);callback(data);buffers.push(data);},1);},close(){clearInterval(interval);closed.push('stream');}};
 let callback;const device={defaultOutputConfig:()=>({sampleFormat:()=>32,config:()=>config}),buildOutputStream(c,f,cb){assert.equal(c,config);callback=cb;return stream;},close(){closed.push('device');}};
 const cpal={SampleFormat:{F32:32},defaultHost:()=>({defaultOutputDevice:()=>device,close(){closed.push('host');}})};
 await play(Float32Array.of(0.25,0.5),24000,{cpal});
 assert.deepEqual([...buffers[0]],[0.25,0.25,0.375,0.375,0.5,0.5,0.5,0.5]);assert.deepEqual(closed,['stream','device','host']);
});
test('missing output and backend failure are surfaced and resources close',async()=>{
 let closed=false;await assert.rejects(play(Float32Array.of(0),24000,{cpal:{defaultHost:()=>({defaultOutputDevice:()=>null,close(){closed=true;}})}}),/predeterminada/);assert.equal(closed,true);
});
test('corrupt download is rejected without committing cache and requests immutable revision',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kokoro-integrity-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await assert.rejects(asset('tokenizer.json',{cacheDir:dir,fetchImpl:async url=>{assert.match(url,/1939ad2a8e416c0acfeecc08a694d14ef25f2231/);return {ok:true,arrayBuffer:async()=>Buffer.from('corrupt')};}}),/integridad/);
 assert.deepEqual(await fs.readdir(dir),[]);
 await assert.rejects(asset('unknown',{cacheDir:dir}),/desconocido/);
});
test('Windows playback passes only a temporary WAV path to a fixed PowerShell command and cleans it',async()=>{
 const {playWindows}=require('../tts/windows-playback');let file,child;let completed=false;
 const pending=playWindows(Float32Array.of(0.25,-0.25),24000,{spawnImpl:(cmd,args,opts)=>{
  assert.equal(cmd,'powershell.exe');assert.equal(opts.shell,false);assert.ok(args.includes('-NonInteractive'));assert.ok(args.at(-1).includes('PlaySync'));
  file=opts.env.OVERLAY_TTS_WAV;child=new EventEmitter();return child;
 }}).then(()=>{completed=true;});
 for(let i=0;i<20&&!child;i++)await new Promise(r=>setTimeout(r,5));
 const b=await fs.readFile(file);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(24),24000);assert.equal(completed,false);
 child.emit('close',0);await pending;await assert.rejects(fs.stat(file),{code:'ENOENT'});
});
test('Windows cancellation kills the full worker tree and removes its temporary directory',async()=>{
 const controller=new AbortController();let worker,temporary;const calls=[];
 const speech=createSpeech({}, {env:{},platform:'win32',log:()=>{},spawnImpl:(cmd,args,opts)=>{
  calls.push({cmd,args});const child=new EventEmitter();child.stdin=new PassThrough();child.stderr=new PassThrough();child.unref=()=>{};
  if(cmd===process.execPath){worker=child;worker.pid=123;temporary=opts.env.OVERLAY_TTS_TEMP_DIR;}else{assert.equal(cmd,'taskkill.exe');queueMicrotask(()=>worker.emit('close',null));}
  return child;
 }});
 const pending=speech('Hola',{signal:controller.signal});controller.abort();await pending;
 assert.deepEqual(calls[1],{cmd:'taskkill.exe',args:['/PID','123','/T','/F']});await assert.rejects(fs.stat(temporary),{code:'ENOENT'});
});
test('say can be the primary configured provider without starting Kokoro',async()=>{
 const calls=[];await createSpeech({ttsProvider:'say'}, {env:{},platform:'darwin',log:()=>{},spawnImpl:processMock(({child,cmd})=>{calls.push(cmd);queueMicrotask(()=>child.emit('close',0));})})('Hola');
 assert.deepEqual(calls,['/usr/bin/say']);
});
test('explicitly disabled TTS does not start YouTube or validate a voice provider',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'disabled-tts-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.writeFile(path.join(dir,'youtube-tts.json'),JSON.stringify({enabled:false,ttsProvider:'invalid-do-not-load'}));
 const {startYouTube}=require('../youtube');const logs=[];
 assert.equal(startYouTube(dir,{env:{YOUTUBE_CHAT_TTS_ENABLED:'true'},platform:'linux',log:s=>logs.push(s)}),null);
 assert.ok(logs.some(s=>s.includes('desactivado en configuración')));
 assert.equal(require('../package.json').scripts.postinstall,undefined);
});

test('macOS playback waits for afplay and propagates audio errors',async()=>{
 const {playMacOS}=require('../tts/macos-playback');let child,file;
 const promise=playMacOS(new Float32Array([0,.2,0]),24000,{spawnImpl:(command,args,opts)=>{
  assert.equal(command,'/usr/bin/afplay');assert.equal(opts.shell,false);file=args[0];
  child=new EventEmitter();child.stderr=new PassThrough();return child;
 }});
 while(!child)await new Promise(r=>setTimeout(r,5));
 child.stderr.write('device unavailable');child.emit('close',1);
 await assert.rejects(promise,/device unavailable/);assert.equal(require('node:fs').existsSync(file),false);
});
test('a playback failure never repeats a partially spoken message through say',async()=>{
 const calls=[];const spawnImpl=processMock(({child,cmd})=>{calls.push(cmd);queueMicrotask(()=>{child.stderr.write('[Kokoro] Reproduciendo audio.\n[Kokoro] device lost');child.emit('close',1);});});
 await assert.rejects(createSpeech({}, {env:{},platform:'darwin',spawnImpl,log:()=>{}})('Hola'),/device lost/);
 assert.deepEqual(calls,[process.execPath]);
});
