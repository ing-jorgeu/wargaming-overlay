async function findBroadcast(auth,{signal,fetchImpl=fetch}={}){
 const token=await auth.token(signal);
 const url=new URL('https://www.googleapis.com/youtube/v3/liveBroadcasts');
 // API accepts exactly one filter: active, NOT active + mine.
 url.search=new URLSearchParams({part:'snippet,status',broadcastStatus:'active',broadcastType:'all',maxResults:'50'});
 const response=await fetchImpl(url,{headers:{Authorization:`Bearer ${token}`},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
 if(response.status===401){auth.invalidate();throw Error('Autorización vencida; renovando.');}
 if(!response.ok)throw Error(`Consulta de directos falló (HTTP ${response.status}). Revisa permisos/cuota de YouTube.`);
 const data=await response.json();
 const active=(data.items||[]).filter(b=>b.snippet?.liveChatId).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 return active[0]?{id:active[0].id,liveChatId:active[0].snippet.liveChatId,title:active[0].snippet.title,multiple:active.length>1}:null;
}
module.exports={findBroadcast};
