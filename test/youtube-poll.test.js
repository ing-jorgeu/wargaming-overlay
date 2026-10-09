const {test}=require('node:test'),assert=require('node:assert/strict');
const {pollChat}=require('../youtube/poll-chat');
const {YouTubeService}=require('../youtube/service');
test('HTTP fallback normalizes messages and respects polling interval and cursor',async()=>{
 const waits=[],urls=[];let n=0;const c=new AbortController();
 const iterator=pollChat({auth:{token:async()=>'test'},liveChatId:'chat',signal:c.signal,fetchImpl:async url=>{urls.push(url);return {ok:true,json:async()=>({items:[{id:'a',snippet:{type:'textMessageEvent'}}],nextPageToken:'next',pollingIntervalMillis:20000})};},sleep:async ms=>{waits.push(ms);if(++n===2)c.abort();}});
 for await(const b of iterator)assert.equal(b.items[0].snippet.type,1);
 assert.deepEqual(waits,[20000,20000]);assert.equal(urls[1].searchParams.get('pageToken'),'next');
});
test('gRPC authentication failure switches to HTTP and processes messages',async()=>{
 let service,polled=false,invalidated=0;const received=[];
 service=new YouTubeService({config:{httpFallback:true},auth:{token:async()=>'t',invalidate(){invalidated++;}},discover:async()=>({liveChatId:'chat'}),log(){},queue:{enqueue:m=>received.push(m.text),clear(){},async stop(){}},stream:async function*(){throw Object.assign(Error('test'),{code:16});},poll:async function*(){polled=true;yield {items:[{id:'a',snippet:{type:1,publishedAt:new Date(Date.now()+1000).toISOString(),textMessageDetails:{messageText:'Hola'}}}]};service.controller.abort();}});
 await service.start().task;assert.equal(polled,true);assert.equal(invalidated,1);assert.deepEqual(received,['Hola']);
});

test('HTTP polling is not enabled implicitly on authentication failure',async()=>{
 let service,polled=false;
 service=new YouTubeService({auth:{token:async()=>'t',invalidate(){}},discover:async()=>({liveChatId:'chat'}),log(){},queue:{async stop(){}},stream:async function*(){throw Object.assign(Error('test'),{code:16});},poll:async function*(){polled=true;},sleep:async()=>service.controller.abort()});
 await service.start().task;assert.equal(polled,false);
});

test('normal stream EOF resumes cursor without false disconnects or duplicate messages',async()=>{
 let service,n=0;const logs=[],cursors=[],spoken=[];
 const message={id:'one',snippet:{type:1,publishedAt:'2026-10-08T12:00:01Z',textMessageDetails:{messageText:'Hola'}}};
 service=new YouTubeService({now:()=>Date.parse('2026-10-08T12:00:00Z'),auth:{token:async()=>'t'},discover:async()=>({liveChatId:'chat'}),log:m=>logs.push(m),queue:{enqueue:m=>spoken.push(m.text),async stop(){}},sleep:async()=>{if(n===3)service.controller.abort();},stream:async function*(opts){cursors.push(opts.pageToken);n++;yield {nextPageToken:'cursor-'+n,items:[message]};}});
 await service.start().task;
 assert.deepEqual(cursors,[undefined,'cursor-1','cursor-2']);assert.deepEqual(spoken,['Hola']);assert.equal(logs.filter(m=>m.includes('Chat conectado')).length,1);assert.equal(logs.some(m=>m.includes('Reintento')||m.includes('no disponible')),false);
});
