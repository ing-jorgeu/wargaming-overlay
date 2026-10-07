const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createReaderStatus}=require('../reader-status');
test('reports first success, transport change, failure and recovery without polling spam',()=>{
 const messages=[],report=createReaderStatus(m=>messages.push(m));
 const s={connected:true,transport:'usb',round:1,players:[{name:'A'},{name:'B'}]};
 report(s);report(s);assert.equal(messages.length,1);assert.match(messages[0],/Leyendo teléfono por USB.*A vs B/);
 report({...s,transport:'wifi'});assert.match(messages[1],/Wi-Fi/);
 const failure={connected:false,phoneConnected:true,transport:'wifi',error:'Abre una ronda'};
 report(failure);report(failure);assert.equal(messages.length,3);assert.match(messages[2],/lectura pendiente.*Abre una ronda/);
 report({connected:false,error:'Reconectando'});assert.match(messages[3],/Sin lectura.*Reconectando/);
 report(s);assert.equal(messages.length,5);
 report({...s,round:2});assert.match(messages[5],/ronda 2/);
});
