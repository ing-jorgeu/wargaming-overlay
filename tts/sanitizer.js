// Deliberately small local ES/EN filter, not semantic moderation.
// Ordinary profanity and in-game violence are not blanket-blocked.
const severe=[
 /\b(?:n[i1]gg(?:er|a)s?|f[a4]gg?[o0]ts?|k[i1]kes?|sp[i1]cs?|sudacas?|maricones)\b/giu,
 /\b(?:heil\s+hitler|sieg\s+heil)\b/giu,
 /\b(?:te\s+voy\s+a\s+(?:matar|violar)|voy\s+a\s+(?:matarte|violarte)|i(?:'ll|\s+will)\s+(?:kill|rape)\s+you)\b/giu,
 /\b(?:maten|matad|exterminen|hay\s+que\s+matar|kill|exterminate)\s+(?:(?:a|a\s+los|los|las|all|the)\s+)*(?:judios|negros|gays|musulmanes|inmigrantes|jews|blacks|muslims|immigrants)\b/giu,
 /\b(?:chupa(?:me)?\s+(?:la\s+)?(?:polla|verga)|suck\s+my\s+(?:dick|cock)|(?:sexo|pornografia|porn)\s+(?:con\s+)?(?:ninos|menores|children))\b/giu
];
function truncate(text,max){const chars=Array.from(text);if(chars.length<=max)return text;let cut=chars.slice(0,max-1).join('');const space=cut.lastIndexOf(' ');if(space>max*.7)cut=cut.slice(0,space);return cut.trimEnd()+'…';}
function clean(input,{filterUrls=true,extraBlockedTerms=[]}={}){
 let text=String(input||'').slice(0,10000).normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu,' ').replace(/[\[\]<>]/g,' ').replace(/\s+/g,' ').trim();
 if(filterUrls)text=text.replace(/(?:[a-z][a-z\d+.-]*:\/\/|www\.)[^\s]+|\b(?:[\p{L}\d-]+\.)+[a-z]{2,63}(?:\/[^\s]*)?/giu,' Enlace ');
 // Accent-insensitive matching with offsets mapped back to the original spelling.
 const chars=Array.from(text),folded=[],offsets=[];let offset=0;
 for(const ch of chars){const f=ch.normalize('NFD').replace(/\p{M}/gu,'');for(let j=0;j<f.length;j++)offsets.push([offset,offset+ch.length]);folded.push(f);offset+=ch.length;}
 const normalized=folded.join(''),spans=[];
 const patterns=[...severe,...extraBlockedTerms.filter(t=>typeof t==='string'&&t.trim()).slice(0,100).map(t=>new RegExp(t.normalize('NFD').replace(/\p{M}/gu,'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'giu'))];
 for(const re of patterns){re.lastIndex=0;for(const m of normalized.matchAll(re))if(m[0].length)spans.push([offsets[m.index][0],offsets[m.index+m[0].length-1][1]]);}
 spans.sort((a,b)=>a[0]-b[0]);const merged=[];
 for(const span of spans){const last=merged.at(-1);if(last&&span[0]<=last[1])last[1]=Math.max(last[1],span[1]);else merged.push([...span]);}
 for(const [start,end] of merged.reverse())text=text.slice(0,start)+'[censurado]'+text.slice(end);
 return text.replace(/\s+/g,' ').trim();
}
function sanitize(message,config={}){
 const text=truncate(clean(message.text,config),config.maxMessageLength||300);
 if(!text || !text.replace(/\[censurado\]|[^\p{L}\p{N}]/gu,''))return null;
 const author=truncate(clean(message.author,config),40)||'Usuario';
 return {author,text,spoken:config.readUsername===false?text:`${author} dice: ${text}`};
}
module.exports={sanitize,clean,truncate};
