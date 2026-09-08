const {test}=require('node:test'),assert=require('node:assert/strict');
const {deviceStatus}=require('../diagnostics');
const {spawnSync}=require('child_process'),path=require('path');
const cli=path.join(__dirname,'../cli.js');
test('ADB state classification',()=>{
 for(const [output,code] of [['List of devices attached\n','NO_DEVICE'],['abc unauthorized','UNAUTHORIZED'],['abc offline','OFFLINE'],['a device\nb device','MULTIPLE_DEVICES'],['abc device','READY']])assert.equal(deviceStatus(output).code,code);
 assert.equal(deviceStatus('a device\nb device','b').serial,'b');
 assert.equal(deviceStatus('a device','b').code,'DEVICE_NOT_FOUND');
});
test('help and invalid input',()=>{
 assert.equal(spawnSync(process.execPath,[cli,'--help']).status,0);
 assert.equal(spawnSync(process.execPath,[cli,'invalid']).status,1);
 assert.equal(spawnSync(process.execPath,[cli,'start','--port','80']).status,1);
});
test('saved game survives disconnection and explicit reset is empty',()=>{
 const {mergeGame,emptyGame}=require('../game-store');
 const current=mergeGame(emptyGame(),{connected:true,round:2,players:[{name:'A',cp:2},{name:'B',cp:0}]});
 assert.deepEqual(mergeGame(current,{connected:false}).players,current.players);
 assert.deepEqual(emptyGame().players,[]);
});
