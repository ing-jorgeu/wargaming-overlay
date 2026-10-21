const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const {options,commands,probe,GalaxySession}=require('../galaxy/session');
const help='--start-app --no-clipboard-autosync --new-display --no-vd-destroy-content --video-source --camera-size';
function execute(exe,args){const key=args.join(' ');if(key==='--help')return help;if(key==='--version')return 'scrcpy 5.0.1';if(key==='devices -l')return 'List of devices attached\n192.0.2.2:5555 device\n';if(key.includes('ro.serialno'))return 'TEST-PHONE';if(key.includes('ro.build.version.sdk'))return '35';if(key.includes('ro.product.model'))return 'Mock Galaxy';if(key.includes('pm path'))return 'package:/app/ttba.apk';if(key.includes('ro.build.version.release'))return '15';return '';}
test('Galaxy plans separate camera and control with no shell, audio or clipboard forwarding',()=>{
 const c=commands(options(), '192.0.2.2:5555');assert.ok(c.control.includes('--new-display=1080x1920/320'));assert.ok(c.control.includes('--no-vd-destroy-content'));assert.ok(c.camera.includes('--video-source=camera'));assert.ok(c.camera.includes('--no-control'));assert.ok(!c.camera.some(a=>a.startsWith('--start-app')));assert.ok(c.control.includes('--no-clipboard-autosync'));assert.ok(!commands(options({scoreDisplay:'physical'}),'s').control.some(a=>a.startsWith('--new-display')));
 for(const o of [{cameraSize:'999x1'},{cameraFps:1000},{displaySize:'1;rm -rf'},{connect:'host:99999'},{scoreDisplay:'foo'},{scoreDisplay:'physical',cameraMode:'external'}])assert.throws(()=>options(o));
});
test('Galaxy probe refuses absent/unauthorized/old devices, missing capabilities and unexpected physical identities',()=>{
 const input={};const deps={find:x=>x,execute};assert.equal(probe(input,deps).identity,'TEST-PHONE');
 assert.throws(()=>probe(input,{...deps,execute:(e,a)=>a.join(' ')==='devices -l'?'':execute(e,a)}),/autoriza/);
 assert.throws(()=>probe(input,{...deps,execute:(e,a)=>a.includes('ro.build.version.sdk')?'29':execute(e,a)}),/Android/);
 assert.throws(()=>probe(input,{...deps,execute:(e,a)=>a[0]==='--help'?'':execute(e,a)}),/scrcpy no admite/);
 assert.throws(()=>probe({serial:'different'},deps),/coincida/);
});
function fixture(t,o={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'galaxy-session-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const children=[],calls=[];
 const spawnImpl=(exe,args,opts)=>{assert.equal(opts.shell,false);calls.push({exe,args});const c=new EventEmitter();c.stdout=new PassThrough();c.stderr=new PassThrough();c.kill=()=>{queueMicrotask(()=>c.emit('exit',0));return true;};children.push(c);if(args.some(a=>a.startsWith('--new-display')))queueMicrotask(()=>c.stderr.write('[server] INFO: New display: 1080x1920/320 (id=7)\n'));return c;};
 const device={serial:'192.0.2.2:5555',identity:'TEST-PHONE',adb:'adb',scrcpy:'scrcpy',commands:commands(options(o),'192.0.2.2:5555')};
 const session=new GalaxySession({dataDir:dir,...o},{spawnImpl,probeImpl:()=>device,execute:(exe,args)=>args.includes('app_process')?'<?xml version="1.0"?><hierarchy display-id="7"/>':'',log:()=>{}});t.after(()=>session.stop());return {session,dir,children,calls};
}
test('virtual session discovers dynamic display ID, probes helper before camera/reader, and owns cleanup',async t=>{
 const f=fixture(t);await f.session.start();const state=JSON.parse(fs.readFileSync(path.join(f.dir,'galaxy-session.json')));assert.equal(state.displayId,7);assert.equal(state.active,true);assert.equal(f.calls.length,3);assert.ok(f.calls[2].args.includes('--display-file'));assert.ok(f.calls[1].args.includes('--video-source=camera'));
 await f.session.stop();assert.equal(f.session.children.size,0);assert.equal(JSON.parse(fs.readFileSync(path.join(f.dir,'galaxy-session.json'))).active,false);assert.equal(fs.existsSync(path.join(f.dir,'galaxy-session.lock')),false);
});
test('physical fallback uses the original reader; a second session refuses the same data directory',async t=>{
 const f=fixture(t,{scoreDisplay:'physical',cameraMode:'none'});await f.session.start();assert.equal(f.calls.length,2);assert.ok(!f.calls[1].args.includes('--display-file'));const other=new GalaxySession({dataDir:f.dir});await assert.rejects(other.start(),/sesión Galaxy/);
});
test('virtual accessibility failure stops all owned children before exposing a camera or reader',async t=>{
 const f=fixture(t);f.session.execute=()=>{throw Error('inaccessible display');};await assert.rejects(f.session.start(),/inaccessible/);assert.equal(f.session.children.size,0);assert.equal(f.calls.length,1);
});
test('unexpected scrcpy exit stops other owned children when reconnection is disabled',async t=>{
 const f=fixture(t,{scoreDisplay:'physical',reconnect:false});await f.session.start();f.children[0].emit('exit',1);await new Promise(r=>setTimeout(r,10));assert.equal(f.session.stopped,true);assert.equal(f.session.children.size,0);
});
test('virtual reader targets only the selected display and leaves default capture unchanged',()=>{
 const {spawnSync}=require('node:child_process'),{findPython}=require('../diagnostics');const py=findPython();const code=`
import battle_reader as b
calls=[]
b.adb=lambda *args: calls.append(args) or '<?xml version="1.0"?><hierarchy/>'
b.capture('s',7,'/data/local/tmp/overlay-display-1234567890abcdef.jar')
assert 'app_process' in calls[0] and calls[0][-1]=='7'
calls.clear();b.capture('s');assert calls[0][1:4]==('shell','uiautomator','dump')
try:b.capture('s',7,'bad;command');raise AssertionError('accepted bad helper')
except ValueError:pass
`;
 const r=spawnSync(py,['-c',code],{cwd:path.join(__dirname,'..'),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});assert.equal(r.status,0,r.stderr);
});
test('video recovery keeps the overlay process serving scores while displays reconnect',async t=>{
 const f=fixture(t,{scoreDisplay:'physical'});await f.session.start();const overlay=f.children[2];let killed=false;const kill=overlay.kill;overlay.kill=()=>{killed=true;return kill();};
 f.children[1].emit('exit',1);await new Promise(r=>setTimeout(r,10));assert.equal(killed,false);assert.ok(f.session.children.has(overlay));assert.equal(JSON.parse(fs.readFileSync(path.join(f.dir,'galaxy-session.json'))).active,false);
 await f.session.stop();assert.equal(killed,true);
});
test('distributed Android helper matches its checked-in source and manifest',()=>{
 const dir=path.join(__dirname,'..','galaxy','android'),crypto=require('node:crypto');const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
 const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex');assert.equal(hash('src/overlay/DisplayDump.java'),m.sourceSha256);assert.equal(hash('display-dump.jar'),m.jarSha256);assert.equal(m.minAndroidApi,30);
});
