const {setTimeout:delay}=require('node:timers/promises');
async function* pollChat({auth,liveChatId,pageToken,signal,fetchImpl=fetch,sleep=ms=>delay(ms,null,{signal})}){
 while(!signal?.aborted){
  const url=new URL('https://www.googleapis.com/youtube/v3/liveChat/messages');
  url.search=new URLSearchParams({liveChatId,part:'id,snippet,authorDetails',...(pageToken?{pageToken}:{})});
  const response=await fetchImpl(url,{headers:{Authorization:`Bearer ${await auth.token(signal)}`},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
  const data=await response.json();
  if(!response.ok){const reason=data.error?.errors?.[0]?.reason;const code=response.status===401?16:response.status===404?5:['liveChatEnded','liveChatDisabled'].includes(reason)?9:response.status===400?3:response.status===403?7:14;throw Object.assign(Error('No se pudo consultar el chat por HTTP.'),{code});}
  yield {...data,items:(data.items||[]).map(item=>({...item,snippet:{...item.snippet,type:({textMessageEvent:1,chatEndedEvent:4})[item.snippet?.type]||0}}))};
  if(data.offlineAt)return;
  pageToken=data.nextPageToken||pageToken;
  await sleep(Math.max(15000,Number(data.pollingIntervalMillis)||0));
 }
}
module.exports={pollChat};
