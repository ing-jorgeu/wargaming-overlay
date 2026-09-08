const http = require('http');
const fs = require('fs');
const path = require('path');

const dataDir = process.env.OVERLAY_DATA_DIR;
if (!dataDir) throw new Error('Inicia con wargaming-overlay start o npm start.');
const { spawn } = require('child_process');
const readline = require('readline');
const {mergeGame, emptyGame} = require('./game-store');
let game = emptyGame();
const gamePath = path.join(dataDir, 'game-state.json');
try { game = {...JSON.parse(fs.readFileSync(gamePath, 'utf8')), connected:false}; } catch {}
function persistGame() { fs.writeFileSync(gamePath + '.tmp', JSON.stringify(game, null, 2)); fs.renameSync(gamePath + '.tmp', gamePath); }
const readerOptions = { env: { ...process.env, PYTHONIOENCODING: "utf-8" }, stdio: ['ignore', 'pipe', 'inherit'] };
if (process.env.SUDO_UID) { readerOptions.uid = Number(process.env.SUDO_UID); readerOptions.gid = Number(process.env.SUDO_GID); }
let reader;
function startReader(){
let lastError = '';
reader = spawn(process.env.OVERLAY_PYTHON || 'python3', [path.join(__dirname, 'reader.py')], readerOptions);
readline.createInterface({ input: reader.stdout }).on('line', line => {
  try { const incoming = JSON.parse(line); game = mergeGame(game, incoming); persistGame(); if (incoming.error !== lastError) { if (incoming.error) console.error(incoming.error); else if(lastError) console.log('Teléfono conectado. Lectura recuperada.'); lastError = incoming.error; } } catch (e) { console.error('Lectura:', e.message); }
});
reader.on('error', e => console.error('Lector:', e.message));
reader.on('exit', () => { game = mergeGame(game, {connected:false, error:'Lector detenido. Reinicia el servidor.'}); persistGame(); });
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { reader?.kill(); process.exit(); });
process.on('exit', () => reader?.kill());
const root = path.join(__dirname, 'public');
const statePath = path.join(dataDir, 'overlay-state.json');
const defaultState = {
  title: '',
  left: { name: 'PLAYER ONE', faction: 'Space Marines', color: '#245eb8' },
  right: { name: 'PLAYER TWO', faction: 'Chaos Space Marines', color: '#7d1520' }
};
let state = defaultState;
try { state = { ...defaultState, ...JSON.parse(fs.readFileSync(statePath, 'utf8')) }; }
catch { /* First run: use the defaults. */ }
const listeners = new Set();
function broadcast() { const msg = `data: ${JSON.stringify(state)}\n\n`; listeners.forEach(r => r.write(msg)); }
function send(res, code, type, body) { res.writeHead(code, { 'Content-Type': type }); res.end(body); }
function saveState() { const temporaryPath = `${statePath}.tmp`; fs.writeFileSync(temporaryPath, JSON.stringify(state, null, 2)); fs.renameSync(temporaryPath, statePath); }

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control','no-store');
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/game/reset' && req.method === 'POST') { game = emptyGame(); persistGame(); return send(res, 200, 'application/json', JSON.stringify({ok:true})); }
  if (url.pathname === '/game-state.json') { res.setHeader('Cache-Control', 'no-store'); return send(res, 200, 'application/json', JSON.stringify(game)); }
  if (url.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    listeners.add(res); res.write(`data: ${JSON.stringify(state)}\n\n`);
    req.on('close', () => listeners.delete(res)); return;
  }
  if (url.pathname === '/state' && req.method === 'GET') return send(res, 200, 'application/json', JSON.stringify(state));
  if (url.pathname === '/state' && req.method === 'POST') {
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      try { state = JSON.parse(body); saveState(); broadcast(); send(res, 200, 'application/json', JSON.stringify({ ok: true })); }
      catch { send(res, 400, 'application/json', JSON.stringify({ error: 'Invalid data' })); }
    }); return;
  }
  const file = url.pathname === '/' ? 'control.html' : url.pathname.slice(1);
  const filePath = path.join(root, file);
  if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return send(res, 404, 'text/plain', 'Not found');
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  send(res, 200, types[path.extname(filePath)] || 'application/octet-stream', fs.readFileSync(filePath));
});
server.on('error', e => { console.error(e.code==='EADDRINUSE' ? 'El puerto está ocupado. Detén el otro servidor o usa --port 8766.' : 'No se pudo iniciar: '+e.message); reader?.kill(); process.exitCode=1; });
server.listen(Number(process.env.PORT || 8765), '127.0.0.1', () => { startReader(); console.log(`Panel: http://127.0.0.1:${process.env.PORT || 8765}\nOBS: http://127.0.0.1:${process.env.PORT || 8765}/overlay-art.html\nDatos: ${dataDir}\nCtrl+C para detener.`); });
