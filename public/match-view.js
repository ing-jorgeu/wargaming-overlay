(function (root) {
  const normalize = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  function swapPlayers(layout) {
    const next = structuredClone(layout);
    [next.left, next.right] = [next.right, next.left];
    return next;
  }
  function matchPlayers(layout, game) {
    const matches = ['left', 'right'].map(side => {
      const key = normalize(layout[side].appName || layout[side].name);
      if (!key) return null;
      const found = (game?.players || []).filter(player => normalize(player.name) === key);
      return found.length === 1 ? found[0] : null;
    });
    if (matches[0] === matches[1]) matches.fill(null);
    return matches;
  }
  function roundLabel(layout, game, matched) {
    const round = matched && Number.isInteger(game?.round) && game.round > 0 ? game.round : '—';
    const half = {top: 'TOP · PRIMER TURNO', bottom: 'BOTTOM · SEGUNDO TURNO'}[matched ? game?.half : null];
    return `RONDA ${round}${half ? ` · ${half}` : ''}`;
  }
  const api = {swapPlayers, matchPlayers, roundLabel};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MatchView = api;
})(globalThis);
