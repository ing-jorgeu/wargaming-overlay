const {test}=require('node:test'),assert=require('node:assert/strict');
const {dataDirectory,candidates,installPlan}=require('../platform');
const {deviceStatus}=require('../diagnostics');
test('Windows uses LOCALAPPDATA, SDK executable and PATH exe extensions',()=>{
 const cfg={platform:'win32',home:'C:\\Users\\Ana',env:{LOCALAPPDATA:'C:\\Users\\Ana\\AppData\\Local',Path:'C:\\Program Files\\Android;C:\\Tools'}};
 assert.equal(dataDirectory(cfg),'C:\\Users\\Ana\\AppData\\Local\\wargaming-overlay');
 assert.ok(candidates('adb',cfg).includes('C:\\Program Files\\Android\\adb.exe'));
 assert.ok(candidates('adb',cfg).includes('C:\\Users\\Ana\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe'));
 assert.deepEqual(candidates('C:\\Tools\\adb.exe',cfg),['C:\\Tools\\adb.exe']);
});
test('macOS and Linux data directories',()=>{
 assert.equal(dataDirectory({platform:'darwin',home:'/Users/Ana',env:{}}),'/Users/Ana/Library/Application Support/wargaming-overlay');
 assert.equal(dataDirectory({platform:'linux',home:'/home/ana',env:{XDG_DATA_HOME:'/data'}}),'/data/wargaming-overlay');
});
test('platform installers use fixed exact package names without accepting agreements',()=>{
 for(const [os,manager,pkg] of [['darwin','brew','android-platform-tools'],['win32','winget','Google.PlatformTools'],['linux','apt-get','adb'],['linux','dnf','android-tools'],['linux','pacman','android-tools']]){
  const plan=installPlan(os,name=>name===manager);assert.equal(plan.command,manager);assert.ok(plan.args.includes(pkg));assert.ok(!plan.args.some(a=>a.startsWith('--accept-')));
 }
 assert.equal(installPlan('linux',()=>false),null);
});
test('Linux no-permissions USB diagnostic',()=>{assert.equal(deviceStatus('ABC no permissions (user not in plugdev group)').code,'USB_PERMISSIONS')});
test('setup dry-run does not invoke an installer',()=>{
 const {spawnSync}=require('child_process'),path=require('path');
 const r=spawnSync(process.execPath,[path.join(__dirname,'../cli.js'),'setup','--install-adb','--dry-run'],{encoding:'utf8'});
 assert.equal(r.status,0);assert.ok(r.stdout.includes('Instala ADB'));
});
