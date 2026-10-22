# Galaxy: cámara portátil y Tabletop Battles desde el Mac

## Estado y alcance

Prototipo optativo. El modo normal del overlay conserva su lector ADB/UIAutomator y no necesita scrcpy. No hay una API de Tabletop Battles: se continúa leyendo su interfaz accesible.

Inspección inicial: `main`, HEAD local y `origin/main` en `d6b3fee`; árbol limpio, 0 commits por subir y 0 por bajar. La integración pertenece a un commit nuevo. En esta Mac se comprobó scrcpy **5.0.1**, sus flags y ADB. **ADB no detectó ningún teléfono** durante la implementación: Android/One UI del S21, dos vídeos simultáneos, accesibilidad Samsung, OBS, latencia, temperatura y batería NO están certificados.

Referencias primarias:
- [scrcpy: pantallas virtuales](https://github.com/Genymobile/scrcpy/blob/master/doc/virtual-display.md)
- [scrcpy: cámara, Android 12+](https://github.com/Genymobile/scrcpy/blob/master/doc/camera.md)
- [Android UiAutomation: ventanas de todos los displays](https://developer.android.com/reference/android/app/UiAutomation#getWindowsOnAllDisplays())

## Preparar el Galaxy

1. Instala/actualiza Tabletop Battles (`com.goonhammer.ttba`). Usa nombres distintos para los jugadores y abre una ronda.
2. Activa Opciones de desarrollador y Depuración USB. Conecta primero un cable de datos y acepta la autorización del Mac.
3. En Android 11+ activa **Depuración inalámbrica → Vincular dispositivo con código**. En Terminal ejecuta `adb pair IP:PUERTO_DE_VINCULACIÓN` e introduce el código en su solicitud interactiva. No lo guardes en el repositorio.
4. Usa la **dirección y puerto de conexión**, que son distintos del puerto de vinculación: `adb connect IP:PUERTO_DE_CONEXIÓN`. No se activa `adb tcpip 5555` ni se abre la depuración sin emparejar automáticamente.
5. Comprueba `adb devices -l`; utiliza la conexión Wi-Fi en el launcher y retira el USB después de validar. No cambies de red ni bloquees el Galaxy durante la prueba.
6. Mac y Galaxy deben compartir una red estable; preferiblemente Mac por Ethernet y Galaxy en Wi-Fi de 5/6 GHz con buena señal. ADB Wi-Fi transporta también el vídeo comprimido de scrcpy; no se asume estabilidad solo porque ADB responda.

Instala scrcpy desde su [fuente oficial](https://github.com/Genymobile/scrcpy) o un gestor conocido, por ejemplo `brew install scrcpy` en macOS. ADB, Python y scrcpy deben estar disponibles; scrcpy **no está incluido en el instalador del overlay**. El GUI puede usar su ADB/Python incluidos y una ruta externa a scrcpy. No necesitas Java, Android Studio ni compilar el helper para ejecutar la sesión.

## Arranque desde este repositorio

Detén la instancia del overlay anterior para liberar 8765. El launcher no mata procesos ajenos ni toma el puerto por la fuerza.

```bash
cd /Users/jurbina/Dev/wargaming-overlay
npm run galaxy -- --doctor --connect IP:PUERTO
npm run galaxy -- --connect IP:PUERTO
```

Para una prueba inicial por USB:

```bash
npm run galaxy -- --doctor --serial SERIAL --allow-usb
npm run galaxy -- --serial SERIAL --allow-usb
```

En el GUI, activa **Galaxy: cámara y marcador**, selecciona pantalla **Virtual**, cámara **scrcpy**, el serial Wi-Fi y pulsa **Iniciar servidor**. La opción viene apagada para preservar la configuración actual.

Abre la ronda en la ventana **Overlay - Tabletop Battles**. Usa mouse/teclado del Mac allí. La pantalla física queda libre: la cámara se captura directamente por scrcpy y no requiere abrir una app de cámara. **No abras una segunda app que intente usar la misma cámara**.

El launcher crea un display virtual, obtiene su ID dinámico del proceso scrcpy y verifica que pueda leerlo por accesibilidad antes de iniciar cámara/overlay. No supone que el display sea siempre 1. Usa `--no-vd-destroy-content` para pedir a Android que conserve/mueva la app al cerrar el display, sin forzar su detención. Android o la propia app aún pueden recrear una actividad; revisa que siga abierta la ronda después de una reconexión.

El lector virtual es un pequeño JAR DEX propio (~3 KB), enviado a `/data/local/tmp`. Se ejecuta como shell, sin instalar APK, sin root, sin servicio permanente y sin red. Obtiene las ventanas accesibles del display elegido; el parser sigue filtrando `com.goonhammer.ttba`. Si Samsung impide acceder al display, el arranque falla y propone el modo físico: **no lee la cámara como si fuera el marcador**. Al detenerse/reconectarse invalida el estado del display y mantiene el último puntaje válido.

### Ajustes de vídeo

```bash
npm run galaxy -- --connect IP:PUERTO \
  --display-size 1080x1920/320 \
  --camera-size 1280x720 --camera-fps 30 --bit-rate 2M
```

Cámara: 1280×720 o 1920×1080; FPS 15/24/30/60; bitrate 2M/4M/8M. Valores iniciales: 1080p30 a 4M, marcador a 20 FPS/2M, H.264 y audio desactivado en ambas ventanas. Son puntos de partida, no mediciones de rendimiento de tu Galaxy. En una Mac que ya emite 1440p60 prueba primero 720p30/2M y observa los frames perdidos de OBS.

## OBS: fuentes separadas

1. Añade una fuente **Captura de ventana/macOS Screen Capture** y elige exclusivamente **Overlay - Android Camera**. No selecciones Tabletop Battles ni toda la pantalla del Mac. Da permisos de grabación de pantalla a OBS si macOS lo pide.
2. Usa el lienzo de OBS como siempre; transforma/ajusta la imagen de cámara dentro de la escena sin cambiar el tamaño de la fuente del marcador.
3. Conserva la fuente Navegador del marcador: `http://127.0.0.1:8765/overlay-art.html`, con su tamaño actual. Colócala encima de la cámara.
4. La fuente del marcador sigue siendo el servidor local, no una captura del teléfono. No se configura OBS automáticamente ni se asegura que el selector de ventanas vuelva a enlazar una ventana recreada: compruébalo después de recuperar vídeo.
5. En macOS no se presenta scrcpy como una webcam virtual. En este prototipo se captura su ventana.

## Alternativas si Samsung bloquea el display virtual

### Marcador físico + cámara directa (preferida para recuperación)

```bash
npm run galaxy -- --connect IP:PUERTO --score-display physical --camera-mode scrcpy
```

Aquí Tabletop Battles se controla por scrcpy en la pantalla física y el lector tradicional sigue leyendo esa interfaz. La cámara se captura por separado sin app visible, por lo que no es necesario alternar a una pantalla de cámara. Requiere Android 12+ y compatibilidad real de cámara/encoder simultáneos; debe probarse. Si abriste otra app de cámara, ciérrala.

### Pantalla virtual + cámara Wi-Fi externa

```bash
npm run galaxy -- --connect IP:PUERTO --camera-mode external
```

El launcher no inicia ni configura esa app. Abre una solución Wi-Fi, por ejemplo VDO.Ninja en el teléfono o una app RTSP elegida por ti, y añade su fuente correspondiente en OBS. Esa app ocupa la pantalla física y la cámara: utiliza este modo solo cuando la lectura **virtual** ya esté validada. No combines cámara externa en primer plano con `--score-display physical`: ocultaría la ronda al lector tradicional. No se ha probado ninguna app externa durante esta implementación; no se han añadido cuentas ni servicios de pago.

`--camera-mode none` permite probar solo el control/lector virtual antes de consumir dos encoders. Si ni la pantalla virtual ni cámara directa + marcador físico funcionan en el firmware, vuelve al flujo normal (`npm start`) y reserva otro dispositivo para cámara. No se promete control manual de todos los campos ni sincronización oficial de Tabletop Battles.

## Detener y recuperar

- **Detener** en el GUI o `Ctrl+C` en la sesión: cierra únicamente los procesos que abrió esta sesión, con SIGTERM y un límite antes de SIGKILL. Guarda los datos del overlay en su ubicación habitual; no borra listas, OAuth ni rondas.
- Si scrcpy termina, reconecta con espera progresiva hasta 30 segundos; comprueba la identidad física del Galaxy antes de aceptar otro transporte. Puede encontrar puertos Wi-Fi renovados anunciados por ADB mDNS para **ese mismo teléfono**, no teléfonos arbitrarios. No ejecuta `adb kill-server`, no reinicia OBS ni limpia otros procesos scrcpy.
- El servidor del marcador permanece activo durante la recuperación del vídeo; el lector conserva el puntaje anterior mientras no hay display válido. Si el propio servidor termina, también se vuelve a iniciar.
- Cada pantalla virtual nueva obtiene su ID y se vuelve a verificar. El puerto/IP Wi-Fi que cambia sin un anuncio mDNS válido requiere detener y arrancar con el nuevo `--connect`.
- `--no-reconnect` detiene la sesión al fallar un proceso. La opción GUI normal mantiene la recuperación activa.
- Los bloqueos de procesos que ya no existen se recuperan automáticamente al iniciar; los de procesos vivos o sin permiso de consulta se conservan. Si aparece `galaxy-session.lock` y persiste el error, comprueba que no quede otra sesión propia abierta. Tras un cierre forzado solo elimina ese archivo si confirmas que el PID que contiene ya no corresponde a la sesión. No borres `game-state.json`, `rosters.json` ni `overlay-state.json`.
- Una desconexión USB puede interrumpir ADB Wi-Fi o el estado de la cámara en ciertos firmware. Valida desconectar el cable antes del evento; mantén carga con un cargador independiente si es necesario, evitando introducir otra captura USB en el Mac.

## Validación física pendiente (hazla antes del torneo)

- Registrar modelo, Android y One UI con `--doctor`; anotar la cámara y resolución aceptadas por `scrcpy --serial SERIAL --list-cameras` y `--list-camera-sizes`.
- Cambiar VP, CP, ronda y secundarias desde el Mac y comprobar los mismos valores en OBS mientras la cámara continúa. Probar alias/nombres y scroll.
- 30 minutos como mínimo: moverse alrededor del tablero, estimar latencia con un gesto o cronómetro visible, registrar reconexiones, batería inicial/final, temperatura y frames perdidos de OBS.
- Apagar/reconectar Wi-Fi, retirar USB, bloquear/desbloquear y cerrar una ventana de scrcpy. Comprobar último puntaje, identidad, recuperación de ronda y fuente de OBS.
- No usar en producción el modo virtual hasta pasar esas pruebas; si falla, conservar el mensaje exacto del launcher y usar el modo físico o el flujo normal.

## Desarrollo del lector

`galaxy/android/display-dump.jar` se distribuye precompilado e incluye únicamente `classes.dex` propio. `build.py` compila el fuente con JDK 17 y Google R8 8.3.37 (`R8_JAR`, SHA-256 en `r8.sha256`), sin Android SDK. Ejemplo:

```bash
JAVA_HOME=/ruta/jdk-17 R8_JAR=/ruta/r8-8.3.37.jar python3 galaxy/android/build.py
npm test
```

R8 es una herramienta de build obtenida de Google Maven, no una dependencia de ejecución. El helper usa las APIs de accesibilidad Android y el wrapper shell del sistema mediante reflexión. Samsung puede restringirlas: la comprobación del dispositivo decide si se puede continuar y el fallback físico usa el lector original.
