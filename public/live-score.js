(() => {
 const normalize=s=>(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
 const make=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n};
 const panel=make('section','','live-score');document.querySelector('#overlay-stage').append(panel);
 let settings=null,game=null;
 function renderLive(){
  panel.replaceChildren();if(!settings)return;
  const matches=['left','right'].map(side=>{const key=normalize(settings[side].appName||settings[side].name);const found=(game?.players||[]).filter(p=>normalize(p.name)===key);return found.length===1?found[0]:null});
  if(matches[0]===matches[1])matches.fill(null);
  const round=make('div',matches.every(Boolean)?`RONDA ${game.round}`:'RONDA —','live-round');panel.append(round);
  ['left','right'].forEach((side,i)=>{
   const p=matches[i],card=make('article','',`live-player ${side}`);
   const value=v=>v==null?'—':typeof v==='object'?`${v.score}/${v.max}`:v;
   card.append(make('div',`${value(p?.score)} VP`,'live-vp'));
   card.append(make('div',`${value(p?.cp)} CP`,'live-cp'));
   const missions=make('div','','live-missions');card.append(missions);
   if(p?.primary){
    const primary=make('section','','live-primary');
    primary.append(make('div',`PRIMARIA · ${value(p.primary)}`,'mission-heading'));
    for(const objective of p.primaryObjectives||[]){
     const row=make('div','','primary-objective');
     row.append(make('span',objective.name,'objective-name'));
     const hasCounter=objective.counter!=null;
     const marker=make('span',hasCounter?String(objective.counter):objective.checked===true?'✓':objective.checked===false?'':'—',hasCounter?'objective-counter':'objective-check');
     marker.setAttribute('aria-label',hasCounter?`Contador: ${objective.counter}`:objective.checked===true?'Cumplida':objective.checked===false?'Pendiente':'Sin lectura');
     if(objective.checked===true)marker.classList.add('completed');
     row.append(marker);primary.append(row);
    }
    missions.append(primary);
   }
   if(p?.secondaries?.length)missions.append(make('div','SECUNDARIAS','mission-heading'));
   for(const m of p?.secondaries||[])missions.append(make('div',`${m.name}  ${m.score}/${m.max}`,'live-mission'));
   if(!p)card.append(make('div','Sin jugador vinculado','live-note'));
   panel.append(card);
   const rect=document.querySelector('.team.'+side+' .faction-icon').getBoundingClientRect();
   const stage=document.querySelector('#overlay-stage').getBoundingClientRect();
   const scale=stage.width/2560;
   const icon={left:(rect.left-stage.left)/scale,right:(rect.right-stage.left)/scale,top:(rect.top-stage.top)/scale,width:rect.width/scale,height:rect.height/scale};
   const vp=card.querySelector('.live-vp'),cp=card.querySelector('.live-cp');
   vp.style.top=(icon.top+icon.height/2)+'px';
   if(side==='left')vp.style.right=(2560-icon.left+12)+'px';else vp.style.left=(icon.right+12)+'px';
   cp.style.left=(icon.left+icon.width/2)+'px';
   cp.style.top='185px';
  });
 }
 window.addEventListener('resize',renderLive);
 new EventSource('/events').onmessage=e=>{settings=JSON.parse(e.data);renderLive()};
 async function poll(){try{const r=await fetch('/game-state.json',{cache:'no-store',signal:AbortSignal.timeout(2500)});if(r.ok){game=await r.json();renderLive()}}catch{}finally{setTimeout(poll,1500)}}poll();
})();
