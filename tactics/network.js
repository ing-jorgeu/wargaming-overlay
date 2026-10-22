const os=require('node:os');
function interfaces(){return Object.entries(os.networkInterfaces()).flatMap(([name,rows])=>rows.filter(r=>!r.internal&&r.family==='IPv4'&&(/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(r.address))&&!/^(utun|tun|tap|tailscale|docker|veth|bridge|vmnet|wg|awdl|llw)/i.test(name)).map(r=>({name,address:r.address})));}
function bonjourHost(){let host=os.hostname();if(process.platform==='darwin'){try{host=require('node:child_process').execFileSync('/usr/sbin/scutil',['--get','LocalHostName'],{encoding:'utf8',timeout:1000}).trim();}catch{}}return /^[a-z0-9][a-z0-9-]*(?:\.local)?$/i.test(host)?host.replace(/\.local$/,'')+'.local':'';}
module.exports={interfaces,bonjourHost};
