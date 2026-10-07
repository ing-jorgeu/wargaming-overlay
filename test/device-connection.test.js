const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {findPython}=require('../diagnostics');
const path=require('node:path');
test('one phone follows USB/Wi-Fi, survives restart and refuses unrelated devices',()=>{
 const code=`
import tempfile
from pathlib import Path
from device_connection import DeviceConnection
rows='USB device usb:1\\n192.168.1.10:5555 device'
ids={'USB':'PHONE','192.168.1.10:5555':'PHONE','OTHER':'OTHER'}
calls=[]
def adb(*args):
    calls.append(args)
    if args[0]=='devices': return rows
    if args[0]=='-s': return ids.get(args[1], '')
    if args[0]=='mdns': return 'adb-PHONE-abc _adb-tls-connect._tcp. 192.168.1.11:40000\\nadb-OTHER-abc _adb-tls-connect._tcp. 192.168.1.12:40000'
    return ''
with tempfile.TemporaryDirectory() as directory:
    p=Path(directory)/'phone.json'
    c=DeviceConnection('USB',p,run=adb,now=lambda:100)
    assert c.select()['transport']=='usb'
    rows='192.168.1.10:5555 device'
    assert c.select()['transport']=='wifi'
    c=DeviceConnection('USB',p,run=adb,now=lambda:100)
    assert c.select()['transport']=='wifi'
    rows='USB device\\n192.168.1.10:5555 device'
    assert c.select()['transport']=='usb'
    # A reused IP must never become a different phone's scoreboard.
    rows='192.168.1.10:5555 device\\nOTHER device'
    ids['192.168.1.10:5555']='OTHER'
    try: c.select(); assert False
    except ValueError: pass
    assert ('connect','192.168.1.11:40000') in calls
    assert ('connect','192.168.1.12:40000') not in calls
    before=len([x for x in calls if x[0]=='connect'])
    try: c.select()
    except ValueError: pass
    assert len([x for x in calls if x[0]=='connect'])==before
    rows='USB device\\nOTHER device'
    try: DeviceConnection(run=adb).select(); assert False
    except ValueError: pass
    # Two transports of one phone are not ambiguous on first launch.
    ids['192.168.1.10:5555']='PHONE'
    rows='USB device\\n192.168.1.10:5555 device'
    assert DeviceConnection(run=adb).select()['serial']=='USB'
    rows='USB offline\\n192.168.1.10:5555 device'
    assert c.select()['transport']=='wifi'
`;
 const r=spawnSync(findPython(),['-c',code],{cwd:path.join(__dirname,'..'),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
});
test('background app preserves scores and returning to the round resumes updates',()=>{
 const {mergeGame}=require('../game-store');
 const old={round:1,connected:true,players:[{name:'A',score:5},{name:'B',score:2}]};
 const waiting=mergeGame(old,{connected:false,phoneConnected:true,transport:'wifi',error:'Abre una ronda de Tabletop Battles'});
 assert.deepEqual(waiting.players,old.players);assert.equal(waiting.transport,'wifi');assert.equal(waiting.phoneConnected,true);
 const next=mergeGame(waiting,{round:1,connected:true,phoneConnected:true,transport:'wifi',players:[{name:'A',score:8},{name:'B',score:2}]});
 assert.equal(next.players[0].score,8);assert.equal(next.connected,true);
});
test('USB prepares current advertised Wi-Fi before unplugging and prioritizes it over stale ports',()=>{
 const code=`
from device_connection import DeviceConnection
calls=[]
rows='USB device'
def adb(*args):
 calls.append(args)
 if args[0]=='devices': return rows
 if args[0]=='-s': return 'PHONE'
 if args[0]=='mdns': return 'adb-PHONE-abc _adb-tls-connect._tcp. 192.168.1.83:36171'
 if args[0]=='connect': return 'connected to '+args[1]
 return ''
c=DeviceConnection(run=adb,now=lambda:100)
c.aliases={'192.168.1.1:1000','192.168.1.2:1000','192.168.1.3:1000','192.168.1.4:1000'}
assert c.select()['transport']=='usb'
assert [x for x in calls if x[0]=='connect']==[('connect','192.168.1.83:36171')]
assert '192.168.1.83:36171' in c.aliases
rows='192.168.1.83:36171 device'
assert c.select()['transport']=='wifi'
`;
 const r=spawnSync(findPython(),['-c',code],{cwd:path.join(__dirname,'..'),encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
