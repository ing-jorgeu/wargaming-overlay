(function (root) {
  const normalize = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  function swapPlayers(layout) {
    const next = structuredClone(layout);
    [next.left, next.right] = [next.right, next.left];
    return next;
  }
  function matchPlayers(layout, game) {
    const matches = ['left', 'right'].map(side => {
      const key = normalize(layout?.[side]?.appName || layout?.[side]?.name);
      if (!key) return null;
      const found = (game?.players || []).filter(player => normalize(player.name) === key);
      return found.length === 1 ? found[0] : null;
    });
    if (matches[0] === matches[1]) matches.fill(null);
    return matches;
  }
  function roundLabel(layout, game, matched) {
    const round = matched && Number.isInteger(game?.round) && game.round > 0 ? game.round : '—';
    const half = {top: 'TOP', bottom: 'BOTTOM'}[matched ? game?.half : null];
    const first=game?.turn?.firstPlayer;
    const active=half && first ? game?.players?.find(p=>game.half==='top' ? p.name===first : p.name!==first) : null;
    const matches=matchPlayers(layout,game);
    const side=active ? matches.indexOf(active) : -1;
    const color=side===0?'AZUL':side===1?'ROJO':null;
    return `RONDA ${round}${half ? ` · ${half}` : ''}${color ? ` · ${color}` : ''}`;
  }
  function turnStatus(game, layout={}) {
    const label=roundLabel(layout,game,Number.isInteger(game?.round));
    const first=game?.turn?.orderSource==='ui-order' ? game.turn.firstPlayer : null;
    const second=first ? game.players?.find(p=>p.name!==first)?.name : null;
    return {label,order:first && second ? `TOP: ${first} · BOTTOM: ${second}` : 'Orden de jugadores pendiente de lectura',reason:game?.turn?.reason || 'Esperando actividad de puntuación en Tabletop Battles.'};
  }
  const api = {swapPlayers, matchPlayers, roundLabel, turnStatus};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MatchView = api;
})(globalThis);
