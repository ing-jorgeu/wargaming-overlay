const {test}=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('child_process'),path=require('path');
const {findPython}=require('../diagnostics');
test('Python parser handles checks, counts and Unicode on every host',()=>{
 const python=findPython();assert.ok(python,'Python is required for parser tests');
 const code=`
from battle_reader import parse
from xml.etree.ElementTree import Element, SubElement, tostring
root=Element('hierarchy')
def add(text, **attrs):
    return SubElement(root,'node',{'package':'com.goonhammer.ttba','content-desc':text,**attrs})
add('10-20 José vs Zoë');add('Round 2');add('José');add('PRIMARY: 5/45')
n=add('Control More Objectives\\n5VP | End of Turn')
SubElement(n,'node',{'checkable':'true','checked':'true'})
add('Enemy Units Killed');add('2VP | End of Turn');add('3')
add('SECONDARY: 0/45');add('Mission A\\n0\\n/5\\n+0pts')
s=parse(tostring(root,encoding='unicode'))
assert s['players'][0]['name']=='José'
assert s['players'][0]['primaryObjectives'][0]['checked'] is True
assert s['players'][0]['primaryObjectives'][1]['counter']==3
assert s['players'][0]['secondaries'][0]['score']==0
`;
 const r=spawnSync(python,['-c',code],{cwd:path.join(__dirname,'..'),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
});
test('scrolled leading block assigns all five missions to the other player',()=>{
 const python=findPython();assert.ok(python);
 const code=`
from battle_reader import parse
from xml.etree.ElementTree import Element, SubElement, tostring
for names in [('Alpha','Beta'),('Beta','Alpha')]:
    root=Element('hierarchy')
    def add(t):
        return SubElement(root,'node',{'package':'com.goonhammer.ttba','content-desc':t})
    add('45-29 '+names[0]+' vs '+names[1]);add('PRIMARY: 28/45');add('SECONDARY: 7/45')
    for mission in ['Engage On All Fronts','Defend Stronghold','Outflank','A Grievous Blow','Cleanse']:
        add(mission+'\\n0\\n/5\\n+0pts')
    heading=add(names[1]);add('Round 4')
    s=parse(tostring(root,encoding='unicode'))
    assert len(s['players'][0]['secondaries'])==5
    assert s['players'][1]['secondaries'] is None
    root.remove(heading)
    s=parse(tostring(root,encoding='unicode'))
    assert all(p['secondaries'] is None for p in s['players'])
`;
 const r=spawnSync(python,['-c',code],{cwd:path.join(__dirname,'..'),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
});
test('secondary completeness requires section controls and visible ending',()=>{
 const code=`
from battle_reader import parse
from xml.etree.ElementTree import Element,SubElement,tostring
r=Element('hierarchy')
def add(t,b='[0,0][100,40]'):
 return SubElement(r,'node',{'package':'com.goonhammer.ttba','content-desc':t,'bounds':b})
add('10-10 Pedro vs John');add('Pedro');add('SECONDARY: 0/45');add('Select missions');add('Discard missions');john=add('John');add('Round 1')
s=parse(tostring(r,encoding='unicode'));assert s['players'][0]['secondariesComplete'];assert s['players'][0]['secondaries']==[]
r.remove(john);s=parse(tostring(r,encoding='unicode'));assert not s['players'][0]['secondariesComplete']
r=Element('hierarchy');add('10-10 Pedro vs John');add('John');add('SECONDARY: 0/45');add('Select missions');add('Discard missions','[0,200][100,250]');tab=add('Round 1','[0,500][100,550]')
s=parse(tostring(r,encoding='unicode'));assert s['players'][1]['secondariesComplete']
tab.set('bounds','[0,260][100,300]');s=parse(tostring(r,encoding='unicode'));assert not s['players'][1]['secondariesComplete']
`;
 const r=spawnSync(findPython(),['-c',code],{cwd:path.join(__dirname,'..'),encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
test('disabled mission state follows Android and can become enabled',()=>{
 const code=`
from battle_reader import parse
from xml.etree.ElementTree import Element,SubElement,tostring
r=Element('hierarchy')
def add(t,**attrs): return SubElement(r,'node',{'package':'com.goonhammer.ttba','content-desc':t,**attrs})
add('10-10 A vs B');add('A');add('PRIMARY: 0/45')
a=add('Control Central\\n2VP | End of Your Turn',enabled='true')
b=add('Control Central\\n8VP | End of Your Command Phase',enabled='false')
c=add('Control Home\\n10VP | End of the Battle',enabled='false')
add('SECONDARY: 0/45');add('Unavailable\\n0\\n/5',enabled='false');add('Round 1')
s=parse(tostring(r,encoding='unicode'))['players'][0]
assert [m['enabled'] for m in s['primaryObjectives']]==[True,False,False]
assert s['secondaries'][0]['enabled'] is False
b.set('enabled','true')
s=parse(tostring(r,encoding='unicode'))['players'][0]
assert s['primaryObjectives'][1]['enabled'] is True
`;
 const r=spawnSync(findPython(),['-c',code],{cwd:path.join(__dirname,'..'),encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
test('split primary counters accept rule before label without inventing numeric objectives',()=>{
 const code=`
from battle_reader import parse
from xml.etree.ElementTree import Element,SubElement,tostring
for value in [0,3]:
 r=Element('hierarchy')
 def add(t): return SubElement(r,'node',{'package':'com.goonhammer.ttba','content-desc':t,'enabled':'true'})
 for t in ['10-10 A vs B','A','PRIMARY: 0/45','Control Central\\n2VP | End of Your Turn','1VP | End of Your Turn','Markers on Controlled Objectives',str(value),'2VP | End of Your Turn','Another Counter','2','Round 1']: add(t)
 p=parse(tostring(r,encoding='unicode'))['players'][0]
 assert [m['name'] for m in p['primaryObjectives']]==['Control Central','Markers on Controlled Objectives','Another Counter']
 assert p['primaryObjectives'][1]['counter']==value
 assert p['primaryObjectives'][1]['enabled'] is True
 assert p['primaryObjectives'][2]['counter']==2
`;
 const r=spawnSync(findPython(),['-c',code],{cwd:path.join(__dirname,'..'),encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
test('adjacent label counter rule rows keep their own rules and player',()=>{
 const code=`
from battle_reader import parse
from xml.etree.ElementTree import Element, SubElement, tostring
r=Element('hierarchy')
for text in ['10-18 Seba vs Bruno','SECONDARY: 0/45','Bruno','PRIMARY: 8/45','Outside','1','3VP | End of Your Turn','Within','1','5VP | End of Your Turn','SECONDARY: 0/45','Round 1']:
 SubElement(r,'node',{'package':'com.goonhammer.ttba','content-desc':text})
s=parse(tostring(r,encoding='unicode'))
assert s['players'][0]['primaryObjectives'] is None
m=s['players'][1]['primaryObjectives']
assert [(x['name'],x['details'],x['counter']) for x in m]==[('Outside','3VP | End of Your Turn',1),('Within','5VP | End of Your Turn',1)]
`;
 const r=spawnSync(findPython(),['-c',code],{cwd:path.join(__dirname,'..'),encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
