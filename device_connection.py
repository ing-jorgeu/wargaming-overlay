"""Track one physical Android device across authorized ADB transports."""
import json
import os
import re
import subprocess
import time
from pathlib import Path


def run_adb(*args):
    return subprocess.run([os.environ.get('OVERLAY_ADB', 'adb'), *args],
                          capture_output=True, text=True, encoding='utf-8',
                          errors='replace', check=True, timeout=5).stdout


def devices(output):
    rows = []
    for line in output.splitlines():
        fields = line.split()
        if len(fields) >= 2 and not line.startswith(('List of', '*')):
            serial = fields[0]
            wireless = ':' in serial or '._adb-tls-connect._tcp' in serial
            rows.append({'serial': serial, 'state': fields[1],
                         'transport': 'wifi' if wireless else 'usb'})
    return rows


class DeviceConnection:
    def __init__(self, serial='', path=None, run=run_adb, now=time.monotonic):
        self.run, self.now, self.explicit = run, now, serial
        self.path = Path(path) if path else None
        self.identity, self.aliases = None, set()
        self.retry_at = 0
        if self.path:
            try:
                saved = json.loads(self.path.read_text())
                if not serial or serial in saved.get('aliases', []):
                    self.identity = saved.get('identity')
                    self.aliases = set(saved.get('aliases', []))
            except (OSError, ValueError, TypeError):
                pass

    def identify(self, serial):
        for prop in ('ro.serialno', 'ro.boot.serialno'):
            try:
                value = self.run('-s', serial, 'shell', 'getprop', prop).strip()
                if value and value.lower() not in ('unknown', 'null'):
                    return value
            except (OSError, subprocess.SubprocessError):
                pass
        return None

    def remember(self, matching):
        self.aliases.update(d['serial'] for d in matching)
        if self.path:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temp = self.path.with_suffix('.tmp')
            temp.write_text(json.dumps({'identity': self.identity, 'aliases': sorted(self.aliases)}))
            temp.replace(self.path)

    def reconnect(self):
        if not self.identity or self.now() < self.retry_at:
            return
        self.retry_at = self.now() + 15
        targets = {a for a in self.aliases if ':' in a and not a.startswith('adb-')}
        # Only discover services advertising the remembered device, never arbitrary LAN phones.
        try:
            for line in self.run('mdns', 'services').splitlines():
                fields = line.split()
                if (len(fields) >= 3 and fields[0].startswith('adb-' + self.identity + '-')
                        and '_adb-tls-connect._tcp' in fields[1]):
                    targets.add(fields[2])
        except (OSError, subprocess.SubprocessError):
            pass
        for target in sorted(targets)[:4]:
            if re.fullmatch(r'[A-Za-z0-9.\-\[\]:]+:\d+', target):
                try:
                    self.run('connect', target)
                except (OSError, subprocess.SubprocessError):
                    pass

    def select(self):
        rows = devices(self.run('devices', '-l'))
        ready = [d for d in rows if d['state'] == 'device']
        # Verify the physical identity even for remembered IP addresses: DHCP can reuse them.
        for d in ready:
            d['identity'] = self.identify(d['serial'])
        if self.identity:
            matching = [d for d in ready if d['identity'] == self.identity]
        elif self.explicit:
            matching = [d for d in ready if d['serial'] == self.explicit]
            if matching:
                self.identity = matching[0]['identity']
                if self.identity:
                    matching = [d for d in ready if d['identity'] == self.identity]
        else:
            identities = {d['identity'] or d['serial'] for d in ready}
            if len(identities) > 1:
                raise ValueError('Hay varios teléfonos diferentes. Selecciona uno con --serial SERIAL.')
            matching = ready
            if matching:
                self.identity = matching[0]['identity']
        if not matching:
            self.reconnect()
            if any(d['state'] == 'unauthorized' for d in rows):
                raise ValueError('Autoriza este computador en el teléfono; para Wi-Fi completa el emparejamiento de depuración inalámbrica.')
            raise ValueError('Reconectando al teléfono seleccionado por USB o Wi-Fi. Comprueba la conexión y la depuración inalámbrica.')
        # If identity is unavailable, stick to the chosen transport, never guess another phone.
        chosen = sorted(matching, key=lambda d: d['transport'] != 'usb')[0]
        if not self.identity:
            self.explicit = chosen['serial']
        self.remember(matching)
        return chosen
