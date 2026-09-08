const factionArt = { 'Thousand Sons': 'assets/thousand-sons-texture.png', 'Deathwatch': 'assets/deathwatch-texture.png' };
const teamColors = { left: '#245eb8', right: '#7d1520' };
const formationStyle = {
  'Take and Hold': ['take-and-hold', '#126634'],
  'Purge the Foe': ['purge-the-foe', '#8d2425'],
  'Disruption': ['disruption', '#07557d'],
  'Reconnaissance': ['reconnaissance', '#087e7e'],
  'Priority Assets': ['priority-assets', '#a78b18']
};
const slugify = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function fit(el){ let size=Math.round(2560 * 0.035); el.style.fontSize=size+'px'; while(el.scrollWidth>el.clientWidth && size>20){ el.style.fontSize=--size+'px'; } }
function render(s){ document.querySelector('#battleTitle').textContent = s.title || ''; ['left','right'].forEach(side=>{const p=s[side], team=document.querySelector('.team.'+side), formation=document.querySelector('#'+side+'Formation'), detachmentList=document.querySelector('#'+side+'Detachments'), selected=formationStyle[p.formation] || formationStyle['Take and Hold']; document.querySelector('#'+side+'Name').textContent=p.name; document.querySelector('#'+side+'Faction').textContent=p.faction; team.style.setProperty('--team',teamColors[side]); team.style.setProperty('--art', factionArt[p.faction] ? `url('${factionArt[p.faction]}')` : 'none'); team.querySelector('.faction-icon img').src=`assets/factions/${slugify(p.faction)}.png`; formation.style.setProperty('--formation', selected[1]); formation.querySelector('.formation-mark').innerHTML=`<img src="assets/formations/${selected[0]}.png?v=5" alt="">`; formation.querySelector('span:not(.formation-mark)').textContent=p.formation || 'Take and Hold'; detachmentList.innerHTML=(Array.isArray(p.detachments) ? p.detachments : []).filter(Boolean).slice(0,3).map(name=>`<span class="detachment"></span>`).join(''); [...detachmentList.children].forEach((item,index)=>item.textContent=p.detachments[index]); fit(document.querySelector('#'+side+'Name'));}); }
new EventSource('/events').onmessage=e=>render(JSON.parse(e.data)); window.addEventListener('resize',()=>document.querySelectorAll('.fit').forEach(fit));
