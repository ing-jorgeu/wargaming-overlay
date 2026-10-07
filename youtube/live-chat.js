const path=require('node:path');
function normalize(item){
 if(item.snippet?.type!==1 || !item.id || typeof item.snippet.textMessageDetails?.messageText!=='string')return null;
 return {id:item.id,type:'youtube_chat_message',author:item.authorDetails?.displayName||'Usuario',text:item.snippet.textMessageDetails.messageText,timestamp:item.snippet.publishedAt,messageType:'textMessageEvent'};
}
async function* streamChat({auth,liveChatId,pageToken,signal,createClient}){
 const grpc=require('@grpc/grpc-js'),loader=require('@grpc/proto-loader');
 const def=loader.loadSync(path.join(__dirname,'chat.proto'));
 const Service=grpc.loadPackageDefinition(def).youtube.api.v3.V3DataLiveChatMessageService;
 const client=createClient?createClient(Service,grpc):new Service('youtube.googleapis.com:443',grpc.credentials.createSsl());
 let call;
 const cancel=()=>call?.cancel();
 try{
  const token=await auth.token(signal);if(signal?.aborted)return;
  const meta=new grpc.Metadata();meta.set('authorization',`Bearer ${token}`);
  // Reopen periodically with fresh credentials, retaining the continuation token.
  call=client.streamList({liveChatId,pageToken,part:['id','snippet','authorDetails']},meta,{deadline:Date.now()+45*60*1000});
  signal?.addEventListener('abort',cancel,{once:true});
  for await(const batch of call)yield batch;
 }finally{signal?.removeEventListener('abort',cancel);call?.cancel();client.close();}
}
module.exports={streamChat,normalize};
