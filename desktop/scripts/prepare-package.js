const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const desktop=path.resolve(__dirname,'..'),root=path.dirname(desktop),npm=process.platform==='win32'?'npm.cmd':'npm';
const pack=spawnSync(npm,['pack','--json','--pack-destination',desktop],{cwd:root,encoding:'utf8',shell:false});if(pack.status!==0)throw Error('No se pudo empaquetar el runtime: '+pack.stderr);const metadata=JSON.parse(pack.stdout)[0],source=path.join(desktop,metadata.filename),target=path.join(desktop,'runtime-package.tgz');fs.renameSync(source,target);
const result=spawnSync(npm,['install','./runtime-package.tgz','--save','--install-links'],{cwd:desktop,stdio:'inherit',shell:false,env:{...process.env,ONNXRUNTIME_NODE_INSTALL:'skip'}});if(result.status!==0)process.exitCode=1;
