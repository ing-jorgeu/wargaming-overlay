#!/usr/bin/env python3
"""Local Tabletop Battles reader. Python standard library only."""
import os, argparse, copy, functools, http.server, json, pathlib, re, subprocess, threading, time, xml.etree.ElementTree as ET
ROOT = pathlib.Path(__file__).resolve().parent

def parse(xml):
    root = ET.fromstring(xml)
    nodes = [n for n in root.iter('node') if n.get('package') == 'com.goonhammer.ttba' and (n.get('content-desc') or n.get('text'))]
    texts = [(n.get('content-desc') or n.get('text')).strip() for n in nodes]
    header = next((re.fullmatch(r'(\d+)\s*[-–]\s*(\d+)\s+(.+?) vs (.+)', t) for t in texts if re.fullmatch(r'(\d+)\s*[-–]\s*(\d+)\s+(.+?) vs (.+)', t)), None)
    rnd = next((int(m[1]) for t in texts if (m := re.fullmatch(r'Round (\d+)', t))), None)
    if not header or rnd is None: raise ValueError('Abre una ronda de Tabletop Battles, sin menús encima.')
    players = [dict(name=header[i+3], score=int(header[i+1]), cp=None, primary=None, secondary=None, secondaries=None, primaryObjectives=None) for i in range(2)]
    names = [p['name'] for p in players]
    if names[0] == names[1]: raise ValueError('Usa nombres distintos para identificar a los jugadores.')
    # A scrolled two-player round can omit the first player's heading while
    # exposing its scores/missions followed by the other player's heading.
    # That next heading bounds the leading block and identifies its owner.
    headings = [(i, t) for i, t in enumerate(texts) if t in names]
    current = None
    if headings and len({name for _, name in headings}) == 1:
        first_index, next_name = headings[0]
        leading = texts[:first_index]
        if any(re.fullmatch(r'(PRIMARY|SECONDARY):\s*\d+/\d+', t) for t in leading):
            current = players[1 - names.index(next_name)]
    section = None
    for i, t in enumerate(texts):
        if t in names:
            current = players[names.index(t)]
            section = None
        if current is None: continue  # Never assign a clipped block to a guessed player.
        if t.lower() == 'cp' and i and texts[i-1].isdigit(): current['cp'] = int(texts[i-1])
        m = re.fullmatch(r'(PRIMARY|SECONDARY):\s*(\d+)/(\d+)', t)
        if m:
            section = m[1]
            current[m[1].lower()] = {'score': int(m[2]), 'max': int(m[3])}
        if section == 'PRIMARY':
            details = re.fullmatch(r'(.+)\n(\d+VP.*)', t)
            if not details and i+1 < len(texts) and re.match(r'\d+VP', texts[i+1]):
                details = (None, t, texts[i+1])
            if details:
                if current['primaryObjectives'] is None: current['primaryObjectives'] = []
                checkboxes = [n for n in nodes[i].iter('node') if n.get('checkable') == 'true']
                checked = checkboxes[0].get('checked') == 'true' if len(checkboxes) == 1 else None
                counter = None
                # Split counter rows expose label, scoring rule, then numeric value.
                if '\n' not in t and i+2 < len(texts) and texts[i+2].isdigit():
                    counter = int(texts[i+2])
                current['primaryObjectives'].append({'name': details[1], 'details': details[2], 'checked': checked, 'counter': counter})
        m = re.fullmatch(r'(.+)\n(\d+)\n/(\d+)(?:\n\+(\d+)pts)?', t)
        if m:
            if current['secondaries'] is None: current['secondaries'] = []
            current['secondaries'].append(dict(name=m[1], score=int(m[2]), max=int(m[3])))
    return dict(round=rnd, half=None, players=players)

def merge(previous, fresh):
    now = time.time()
    same = previous and previous['round'] == fresh['round'] and [p['name'] for p in previous['players']] == [p['name'] for p in fresh['players']]
    for i, player in enumerate(fresh['players']):
        stamps = {}
        for key in ('cp', 'primary', 'secondary', 'secondaries'):
            if player[key] is not None: stamps[key] = now
            elif same:
                player[key] = copy.deepcopy(previous['players'][i][key])
                stamps[key] = previous['players'][i].get('observedAt', {}).get(key)
        player['observedAt'] = stamps
    return dict(fresh, updatedAt=now, connected=True, error=None)

def save(state):
    temp = ROOT / 'game-state.tmp'
    temp.write_text(json.dumps(state, ensure_ascii=False, indent=2))
    temp.replace(ROOT / 'game-state.json')

def adb(serial, *args):
    return subprocess.run([os.environ.get('OVERLAY_ADB', 'adb'), '-s', serial, *args], check=True, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=18).stdout

def capture(serial):
    adb(serial, 'shell', 'uiautomator', 'dump', '/sdcard/codex-ttba.xml')
    return adb(serial, 'exec-out', 'cat', '/sdcard/codex-ttba.xml')

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] not in ('/', '/overlay.html', '/style.css', '/overlay.js', '/game-state.json'): self.send_error(404); return
        if self.path == '/': self.path = '/overlay.html'
        super().do_GET()
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *args): pass

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--serial'); p.add_argument('--interval', type=float, default=3)
    p.add_argument('--port', type=int, default=8765); p.add_argument('--once', action='store_true')
    args = p.parse_args()
    devices = subprocess.run(['adb', 'devices'], capture_output=True, text=True, check=True).stdout
    serials = [line.split()[0] for line in devices.splitlines() if '\tdevice' in line]
    serial = args.serial or (serials[0] if len(serials) == 1 else None)
    if not serial: p.error('Conecta y autoriza exactamente un teléfono, o usa --serial.')
    state = None
    if not args.once:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', args.port), functools.partial(Handler, directory=str(ROOT)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        print(f'Overlay: http://127.0.0.1:{args.port}/overlay.html · Ctrl+C para detener', flush=True)
    try:
        while True:
            start = time.monotonic()
            try:
                state = merge(state, parse(capture(serial)))
                save(state)
                print(f"Ronda {state['round']}: " + ' / '.join(f"{x['name']} {x['score']}" for x in state['players']), flush=True)
            except (ValueError, ET.ParseError, subprocess.SubprocessError, OSError) as e:
                print(str(e), flush=True)
                if state: state.update(connected=False, error=str(e)); save(state)
                if args.once: raise
            if args.once: break
            time.sleep(max(1, args.interval - (time.monotonic() - start)))
    except KeyboardInterrupt: pass

if __name__ == '__main__': main()
