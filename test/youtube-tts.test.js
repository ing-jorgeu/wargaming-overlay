const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {EventEmitter}=require('node:events');
const {PassThrough}=require('node:stream');
const {Auth,privateWrite,SCOPE}=require('../youtube/auth');
const {findBroadcast}=require('../youtube/live-broadcast');
const {normalize}=require('../youtube/live-chat');
const {YouTubeService}=require('../youtube/service');
const {sanitize}=require('../tts/sanitizer');
const {SpeechQueue}=require('../tts/queue');
const {speak}=require('../tts/speech');
const response=(data,status=200)=>({ok:status===200,status,json:async()=>data});
const temp=t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'yt-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;};
const tick=()=>new Promise(r=>setImmediate(r));
test('OAuth loopback checks state, uses PKCE, saves private credentials and refreshes once',async t=>{
 const dir=temp(t),client=path.join(dir,'input.json');
 fs.writeFileSync(client,JSON.stringify({installed:{client_id:'test-client',client_secret:'test-secret'}}));
 const calls=[];const auth=new Auth({dir,now:()=>100,fetchImpl:async(url,opts)=>{calls.push(opts.body);return response({access_token:'access',refresh_token:'refresh',expires_in:3600,scope:SCOPE});}});
 let callback;
 await auth.authorize(client,{log:()=>{},open:url=>{callback=(async()=>{
  const u=new URL(url);assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.equal(u.searchParams.get('access_type'),'offline');
  const redirect=u.searchParams.get('redirect_uri');
  let r=await fetch(redirect+'?state=wrong&code=bad');assert.equal(r.status,400);
  r=await fetch(redirect+'?'+new URLSearchParams({state:u.searchParams.get('state'),code:'good'}));assert.equal(r.status,200);
 })();}});await callback;
 assert.equal(calls[0].get('code'),'good');assert.ok(calls[0].get('code_verifier'));
 const saved=JSON.parse(fs.readFileSync(path.join(dir,'tokens.json')));assert.equal(saved.refresh_token,'refresh');
 if(process.platform!=='win32')assert.equal(fs.statSync(path.join(dir,'tokens.json')).mode&0o777,0o600);
 auth.invalidate();await Promise.all([auth.token(),auth.token()]);assert.equal(calls.length,2);assert.equal(calls[1].get('grant_type'),'refresh_token');
 assert.equal(await new Auth({dir,now:()=>100}).token(),'access');
});
test('OAuth timeout closes callback and invalid grant never exposes credentials',async t=>{
 const dir=temp(t);privateWrite(path.join(dir,'client.json'),{client_id:'c',client_secret:'secret'});
 const a=new Auth({dir,fetchImpl:async()=>response({error:'invalid_grant',access_token:'secret'},400)});
 await assert.rejects(a.authorize(null,{open:()=>{},log:()=>{},timeoutMs:20}),/agotó/);
 privateWrite(path.join(dir,'tokens.json'),{refresh_token:'refresh',expires_at:0});
 await assert.rejects(a.token(),/revocada/);
});
test('broadcast discovery uses one active filter and extracts only active chat',async()=>{
 let url;
 const b=await findBroadcast({token:async()=>'token'},{fetchImpl:async u=>{url=new URL(u);return response({items:[{id:'2',snippet:{}},{id:'1',snippet:{liveChatId:'chat',title:'Title'}}]});}});
 assert.equal(url.searchParams.get('broadcastStatus'),'active');assert.equal(url.searchParams.has('mine'),false);assert.equal(b.liveChatId,'chat');
 assert.equal(await findBroadcast({token:async()=>'t'},{fetchImpl:async()=>response({items:[]})}),null);
});
test('minimal sanitization preserves ordinary swearing, hides links and severe phrases, bounds length and usernames',()=>{
 for(const text of ['qué mierda de tirada','ese weón tuvo demasiada suerte','voy a matar a Magnus'])assert.equal(sanitize({author:'Pedro',text}).text,text);
 const s=sanitize({author:'A'.repeat(100),text:'Mira https://example.com/verylong y example.org/test'});assert.ok(!s.spoken.includes('example'));assert.ok(s.author.length<=40);
 assert.match(sanitize({author:'P',text:'hola, te voy a matar, qué tirada'}).text,/hola, \[censurado\], qué tirada/);
 assert.equal(sanitize({text:'te voy a matar'}),null);
 assert.ok(Array.from(sanitize({text:'palabra '.repeat(100)}).text).length<=300);
 assert.ok(!sanitize({text:'Hola [[slnc 999999]]',author:'[[rate 999]]'}).spoken.includes('[['));
 assert.match(sanitize({text:'Qué ejemplo malo'},{extraBlockedTerms:['ejemplo']}).text,/censurado/);
});
test('FIFO is single-voice, overflow drops oldest pending, failures release queue and stop cancels',async()=>{
 const starts=[],releases=[];let active=0,max=0;
 const q=new SpeechQueue({log:()=>{},maxQueueLength:2,speech:async(text,{signal})=>{
  starts.push(text);active++;max=Math.max(max,active);
  await new Promise(resolve=>{releases.push(resolve);signal.addEventListener('abort',resolve,{once:true});});active--;
 }});
 for(const spoken of ['A','B','C','D'])q.enqueue({spoken,author:'P'});
 assert.equal(q.queue.length,2);releases.shift()();await tick();assert.deepEqual(starts,['A','C']);
 releases.shift()();await tick();assert.deepEqual(starts,['A','C','D']);await q.stop();assert.equal(max,1);assert.equal(active,0);
 const seen=[];const fail=new SpeechQueue({log:()=>{},speech:async s=>{seen.push(s);if(s==='A')throw Error('failure');}});
 fail.enqueue({spoken:'A'});fail.enqueue({spoken:'B'});await fail.idle();assert.deepEqual(seen,['A','B']);
});
test('say receives stdin without shell or audio-device selection and waits for close',async()=>{
 let input='',args,opts,proc;
 const speaking=speak('--output-file=/tmp/no [[slnc 9999]] hola',{platform:'darwin',spawnImpl:(cmd,a,o)=>{
  assert.equal(cmd,'/usr/bin/say');args=a;opts=o;proc=new EventEmitter();proc.stdin=new PassThrough();proc.stderr=new PassThrough();proc.stdin.on('data',b=>input+=b);proc.kill=()=>{proc.emit('close',null);};return proc;
 }});
 assert.deepEqual(args,[]);assert.equal(opts.shell,false);assert.ok(!input.includes('[['));proc.emit('close',0);await speaking;
});
const item=(id,text='Hola',timestamp='2026-10-06T12:00:01Z')=>({id,authorDetails:{displayName:'Pedro'},snippet:{type:1,publishedAt:timestamp,textMessageDetails:{messageText:text}}});
test('chat normalization ignores administrative events',()=>{
 assert.equal(normalize({id:'x',snippet:{type:2}}),null);
 assert.equal(normalize(item('a')).type,'youtube_chat_message');
});
test('service waits for live, reconnects with token, deduplicates history, ignores admin and returns to waiting',async()=>{
 const spoken=[],calls=[],waits=[];let discovery=0,streams=0,service;
 service=new YouTubeService({auth:{token:async()=>'t'},now:()=>Date.parse('2026-10-06T12:00:00Z'),log:()=>{},queue:{enqueue:s=>spoken.push(s.text),clear(){},async stop(){}},
 discover:async()=>++discovery===1?null:{liveChatId:'chat'},
 sleep:async(ms)=>{waits.push(ms);if(discovery>=3)service.controller.abort();},
 stream:async function*(opts){calls.push(opts);streams++;
  if(streams===1){yield {nextPageToken:'resume',items:[item('old','old','2026-10-06T11:59:00Z'),item('a')]};throw Object.assign(Error('offline'),{code:14});}
  yield {nextPageToken:'next',items:[item('a'),{id:'admin',snippet:{type:2}},item('b','Segundo')]};
  yield {offlineAt:'2026-10-06T12:01:00Z'};
 }});
 await service.start().task;
 assert.deepEqual(spoken,['Hola','Segundo']);assert.equal(calls[1].pageToken,'resume');assert.ok(waits.includes(1000));assert.ok(waits.includes(60000));assert.equal(service.chat,null);
});
test('backoff caps at 30 seconds and abort ends waiting without crashing overlay',async()=>{
 const waits=[];let service;
 service=new YouTubeService({auth:{token:async()=>{throw Error('network');}},log:()=>{},queue:{async stop(){}},sleep:async ms=>{waits.push(ms);if(waits.length===6)service.controller.abort();}});
 await service.start().task;assert.deepEqual(waits,[1000,2000,5000,10000,30000,30000]);
});
test('disabled or unsupported TTS never starts a network service',()=>{
 const {startYouTube}=require('../youtube');
 assert.equal(startYouTube('/tmp',{env:{},log:()=>{}}),null);
 assert.equal(startYouTube('/tmp',{env:{YOUTUBE_CHAT_TTS_ENABLED:'true'},platform:'linux',log:()=>{}}),null);
});
test('real gRPC transport decodes batches, sends OAuth metadata and cancels cleanly',async t=>{
 const grpc=require('@grpc/grpc-js'),loader=require('@grpc/proto-loader');
 const def=loader.loadSync(path.join(__dirname,'../youtube/chat.proto'));
 const Service=grpc.loadPackageDefinition(def).youtube.api.v3.V3DataLiveChatMessageService;
 const server=new grpc.Server();let request,metadata;
 server.addService(Service.service,{streamList(call){request=call.request;metadata=call.metadata;call.write({nextPageToken:'next',items:[item('wire')]});}});
 const port=await new Promise((resolve,reject)=>server.bindAsync('127.0.0.1:0',grpc.ServerCredentials.createInsecure(),(e,p)=>e?reject(e):resolve(p)));
 t.after(()=>server.forceShutdown());
 const abort=new AbortController();
 const {streamChat}=require('../youtube/live-chat');
 for await(const batch of streamChat({auth:{token:async()=>'test-access'},liveChatId:'chat',pageToken:'cursor',signal:abort.signal,createClient:C=>new C('127.0.0.1:'+port,grpc.credentials.createInsecure())})){
  assert.equal(batch.nextPageToken,'next');assert.equal(normalize(batch.items[0]).text,'Hola');break;
 }
 assert.equal(request.pageToken,'cursor');assert.equal(request.liveChatId,'chat');assert.deepEqual(metadata.get('authorization'),['Bearer test-access']);
});
test('20 messages leave at most ten pending and discard oldest first',async()=>{
 let release;const starts=[];
 const q=new SpeechQueue({log:()=>{},speech:async(text,{signal})=>{starts.push(text);await new Promise(r=>{release=r;signal.addEventListener('abort',r,{once:true});});}});
 for(let i=0;i<20;i++)q.enqueue({spoken:String(i)});
 assert.equal(q.queue.length,10);assert.equal(q.queue[0].spoken,'10');
 release();await tick();assert.deepEqual(starts,['0','10']);await q.stop();assert.equal(q.queue.length,0);
});
test('stream permission failure and token expiry reconnect without concurrent streams',async()=>{
 let calls=0,active=0,max=0,invalidated=0,service;
 service=new YouTubeService({auth:{token:async()=>'t',invalidate(){invalidated++;}},discover:async()=>({liveChatId:'chat'}),log:()=>{},queue:{clear(){},async stop(){}},sleep:async()=>{if(calls===3)service.controller.abort();},stream:async function*(){
  calls++;active++;max=Math.max(max,active);
  try{throw Object.assign(Error('fail'),{code:calls===1?16:calls===2?9:14});}finally{active--;}
 }});
 await service.start().task;assert.equal(max,1);assert.equal(invalidated,1);assert.equal(calls,3);
});
