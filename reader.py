import json, os, subprocess, time, sys
# Windows consoles may default to a legacy encoding; the Node pipe expects UTF-8.
sys.stdout.reconfigure(encoding="utf-8")
from battle_reader import parse, capture
ADB = os.environ.get('OVERLAY_ADB', 'adb')
SERIAL = os.environ.get('OVERLAY_SERIAL', '')

from device_connection import DeviceConnection
from pathlib import Path

if __name__ == '__main__':
    data_dir = os.environ.get('OVERLAY_DATA_DIR')
    connection = DeviceConnection(SERIAL, Path(data_dir) / 'phone-connection.json' if data_dir else None)
    while True:
        device = None
        try:
            device = connection.select()
            serial = device['serial']
            state = parse(capture(serial))
            print(json.dumps(dict(state, connected=True, phoneConnected=True, transport=device["transport"], deviceSerial=serial, updatedAt=time.time(), error=None)), flush=True)
        except Exception as e:
            message = str(e)
            if isinstance(e, subprocess.TimeoutExpired): message = 'El teléfono no respondió a tiempo. Desbloquéalo y abre la ronda; volveré a intentar la lectura.'
            elif isinstance(e, subprocess.CalledProcessError): message = 'No se pudo leer Android. Abre la ronda y cierra otros lectores UIAutomator. Se reintentará. ' + (e.stderr or '').strip()[:300]
            elif isinstance(e, FileNotFoundError): message = 'ADB no está disponible. Ejecuta wargaming-overlay setup --install-adb.'
            print(json.dumps({'connected':False, 'phoneConnected':device is not None and isinstance(e, ValueError), 'transport':device['transport'] if device is not None else None, 'error':message}), flush=True)
        time.sleep(float(os.environ.get('OVERLAY_INTERVAL', '3')))
