const path=require('node:path');const {createReferences}=require('./references');const {createImporter}=require('./importer');const {createRemoteServer}=require('./backend');
try{
 const env=process.env,maxOutputTokens=Number(env.REMOTE_LISTS_MAX_OUTPUT_TOKENS||4000),port=Number(env.REMOTE_LISTS_PORT||env.PORT||8080);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Puerto remoto inválido.');
 const references=createReferences({cacheDir:path.join(path.resolve(env.REMOTE_LISTS_DATA_DIR||'remote-lists-data'),'references-11')});
 const server=createRemoteServer({dataDir:path.resolve(env.REMOTE_LISTS_DATA_DIR||'remote-lists-data'),managerToken:env.REMOTE_LISTS_MANAGER_TOKEN,tokenBudget:Number(env.REMOTE_LISTS_TOKEN_BUDGET||500000),maxImports:Number(env.REMOTE_LISTS_MAX_IMPORTS||2),maxOutputTokens,trustProxy:env.REMOTE_LISTS_TRUST_PROXY==='true',openMinutes:Number(env.REMOTE_LISTS_OPEN_MINUTES||30),demo:env.REMOTE_LISTS_DEMO==='true',importer:env.REMOTE_LISTS_DEMO==='true'?require('./demo').demoImporter:createImporter({apiKey:env.OPENAI_API_KEY,model:env.OPENAI_MODEL||'gpt-6-luna',maxOutputTokens,references})});
 server.listen(port,env.REMOTE_LISTS_HOST||'0.0.0.0',()=>console.log(`${env.REMOTE_LISTS_DEMO==='true'?'MODO DEMO (sin LLM) · ':''}Backend de listas: puerto ${port}. Enlaces /blue y /red. Subidas cerradas al iniciar.`));
 server.on('error',()=>{console.error('No se pudo iniciar el backend remoto.');process.exitCode=1;});
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit()));
}catch(e){console.error(e.message);process.exitCode=1;}
