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
