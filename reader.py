import json, os, subprocess, time, sys
# Windows consoles may default to a legacy encoding; the Node pipe expects UTF-8.
sys.stdout.reconfigure(encoding="utf-8")
from battle_reader import parse, capture
ADB = os.environ.get('OVERLAY_ADB', 'adb')
SERIAL = os.environ.get('OVERLAY_SERIAL', '')

def select_device(output):
    devices = [line.split()[:2] for line in output.splitlines() if line.strip() and not line.startswith(('List of', '*'))]
    if not devices:
        raise ValueError('ADB no detecta un teléfono. Conecta un cable de datos, desbloquea Android y activa Opciones de desarrollador → Depuración USB. No se puede distinguir cable desconectado de depuración desactivada.')
    if not SERIAL and len(devices) > 1:
        raise ValueError('Hay varios dispositivos. Reinicia con --serial SERIAL: ' + ', '.join(d[0] for d in devices))
    device = next((d for d in devices if d[0] == SERIAL), None) if SERIAL else devices[0]
    if not device: raise ValueError('El dispositivo seleccionado no está conectado: ' + SERIAL)
    serial, status = device
    if status == 'unauthorized': raise ValueError('Teléfono sin autorizar. Desbloquéalo y acepta «Permitir depuración USB» para este equipo. Si no aparece, reconecta el cable.')
    if status == 'no': raise ValueError('Sin permisos USB. Revisa reglas udev y grupos del usuario; en Ubuntu, android-sdk-platform-tools-common y plugdev. Vuelve a iniciar sesión después de cambiar grupos.')
    if status == 'offline': raise ValueError('Teléfono offline. Desbloquéalo y reconecta el cable USB.')
    if status != 'device': raise ValueError('Dispositivo no disponible: ' + status)
    return serial

if __name__ == '__main__':
    while True:
        try:
            result = subprocess.run([ADB, 'devices', '-l'], capture_output=True, text=True, encoding='utf-8', errors='replace', check=True, timeout=10)
            serial = select_device(result.stdout)
            state = parse(capture(serial))
            print(json.dumps(dict(state, connected=True, updatedAt=time.time(), error=None)), flush=True)
        except Exception as e:
            message = str(e)
            if isinstance(e, subprocess.TimeoutExpired): message = 'El teléfono no respondió a tiempo. Desbloquéalo y abre la ronda; volveré a intentar la lectura.'
            elif isinstance(e, subprocess.CalledProcessError): message = 'No se pudo leer Android. Abre la ronda y cierra otros lectores UIAutomator. Se reintentará. ' + (e.stderr or '').strip()[:300]
            elif isinstance(e, FileNotFoundError): message = 'ADB no está disponible. Ejecuta wargaming-overlay setup --install-adb.'
            print(json.dumps({'connected':False, 'error':message}), flush=True)
        time.sleep(float(os.environ.get('OVERLAY_INTERVAL', '3')))
