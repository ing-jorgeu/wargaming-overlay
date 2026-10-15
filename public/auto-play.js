(function(root){
 function config(value={}){return {enabled:value?.enabled===true,durationSeconds:Number.isInteger(value?.durationSeconds)&&value.durationSeconds>=1&&value.durationSeconds<=120?value.durationSeconds:15};}
 function createDetector(matchView){
  let previous=null,enabled=false,observed=false;
  return {update(layout,game){
   const options=config(layout?.autoPlay);
   if(!options.enabled){enabled=false;previous=null;observed=false;return null;}
   const wasEnabled=enabled;enabled=true;
   if(!Number.isInteger(game?.round)||game.round<1||game.connected===false)return null;
   if(!['top','bottom'].includes(game.half)){observed=true;return null;}
   const first=game.turn?.firstPlayer;if(!first)return null;
   const active=game.players?.find(p=>game.half==='top'?p.name===first:p.name!==first);
   const matched=matchView.matchPlayers(layout,game),index=active?matched.indexOf(active):-1;
   if(index<0)return null;
   const side=['left','right'][index],player=layout[side];
   const key=JSON.stringify([game.round,game.half,active.name]);
   const changed=wasEnabled&&observed&&previous!==key;previous=key;observed=true;
   return changed?{team:matchView.teamOf(player,side),durationSeconds:options.durationSeconds}:null;
  }};
 }
 const api={config,createDetector};
 if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
 const detector=createDetector(root.MatchView);let frame=null,timer=null,loadTimer=null;
 function hide(){clearTimeout(timer);clearTimeout(loadTimer);frame?.remove();frame=null;}
 root.OverlayAutoPlay={update(layout,game){
  if(!config(layout?.autoPlay).enabled){hide();detector.update(layout,game);return;}
  const event=detector.update(layout,game);if(!event)return;
  hide();const next=document.createElement('iframe');frame=next;
  next.title='Lista del jugador activo';next.className='auto-play-list';next.hidden=true;next.tabIndex=-1;next.setAttribute('aria-hidden','true');
  next.onload=()=>{if(frame!==next)return;clearTimeout(loadTimer);next.hidden=false;timer=setTimeout(hide,event.durationSeconds*1000);};
  next.onerror=hide;next.src='/army-list.html?side='+event.team;document.body.append(next);loadTimer=setTimeout(hide,10000);
 }};
})(globalThis);
