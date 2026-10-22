# Anotaciones tácticas desde un teléfono o iPad

Función opcional. Node sirve dos páginas pequeñas y conecta a OBS WebSocket 5; no abre cámaras ni retransmite vídeo. OBS mantiene su cámara en vivo. El móvil recibe JPEG estáticos y envía vectores. Solo se añade `ws` al paquete; se reutiliza el generador QR existente.

## Inicio

En el GUI activa **Anotaciones tácticas desde teléfono o iPad**, inicia el servidor y pulsa **Abrir anotaciones**. Apagado por defecto. El manager existente permanece en `127.0.0.1:8765`; únicamente el servicio táctico usa un puerto LAN independiente.

Para probar sin Android, desde el repositorio:

```sh
npm run tactics
```

Desde el paquete instalado:

```sh
wargaming-overlay tactics
# O junto con el overlay habitual:
wargaming-overlay start --tactics
```

El registro muestra el enlace privado del panel local (`http://127.0.0.1:8767/#...`). Abre ese enlace en el Mac. El panel permite conectar a OBS, seleccionar una escena y elegir interfaz de red. No requiere que esta pestaña permanezca abierta.

En OBS: **Herramientas → Ajustes del servidor WebSocket**, habilitar servidor y autenticación, y pulsar **Aplicar**. Pulsa **Conectar con OBS de este equipo** en el panel local. Lee el archivo estándar de configuración de OBS en macOS/Windows/Linux y conecta a loopback; no envía la contraseña al navegador. En OBS portable o si no se encuentra ese archivo, abre **Conexión manual** e introduce `ws://127.0.0.1:4455` y la contraseña actual. Se conserva en memoria del proceso, no se manda al móvil ni se guarda en archivos o URLs. Al reiniciar vuelve a introducirla. Opcionalmente establece `OBS_WS_URL`, `OBS_WS_PASSWORD` y `OBS_REFERENCE_SCENE` en el entorno del proceso; evita guardar la contraseña en el repositorio.

WebSocket 5 no ofrece un permiso específico de solo captura: la contraseña da acceso a la API de OBS. La aplicación solicita únicamente versión, escenas, composición, ajustes de fuentes, dimensiones y capturas. No arranca emisiones ni grabaciones. Mantén la autenticación activa y no abras el puerto de OBS a internet.

## Escena y alineación

1. Crea **Táctica · referencia** con la cámara ya existente de OBS: **Añadir existente**, no una segunda captura de cámara. Usa el encuadre definido y el tamaño completo del lienzo de OBS. No incluyas la capa de anotaciones, ni en grupos ni en escenas anidadas.
2. En el panel local selecciona esa escena. Se verifican las solicitudes disponibles y la composición antes de cada captura. Cambiar de referencia borra los trazos.
3. Crea **Táctica · salida** con la escena de referencia como fuente, a tamaño completo y posición `0,0`.
4. Añade una fuente **Navegador**, encima de la referencia, usando el enlace de salida de solo lectura que aparece en el panel. Usa exactamente las dimensiones indicadas (por ejemplo, **2560 × 1440**), posición `0,0`, sin recortes ni estiramiento. Si tu OBS usa 1920 × 1080, usa esas dimensiones.
5. Establece FPS personalizados a **15** (puedes probar 10), activa **Apagar la fuente cuando no esté visible**, desactiva audio y concede a la página **ningún acceso a OBS**. La página solo contiene un lienzo transparente.

No uses la escena de salida como referencia. Se rechaza una referencia con la capa táctica para impedir realimentación. No se sigue la cámara ni las miniaturas automáticamente. Si modificas el lienzo, vuelve a configurar las dimensiones de la fuente.

## Móvil

Mac y móvil en la misma red. Abre el QR del panel con la cámara del teléfono, o su enlace clickeable. Si hay varias interfaces privadas, elige la Wi-Fi correcta en el panel. Las interfaces de VPN habituales se excluyen; si una VPN usa un nombre de adaptador genérico, comprueba manualmente la IP seleccionada. El panel consulta las interfaces cada cinco segundos y regenera el QR cuando cambia la dirección. La alternativa Bonjour `.local` se obtiene del nombre local del Mac; no es imprescindible.

Acepta permisos de red local/firewall de macOS si aparecen. No configures redirección de puertos. Las redes de invitados suelen aislar dispositivos; usa otra red o, opcionalmente, un router de viaje. La comunicación funciona sin internet.

Usa el móvil o iPad en horizontal. Pulsa **Actualizar imagen**, elige Libre/Flecha/Línea/Círculo, color y grosor y dibuja con el dedo o Pencil. Las bandas alrededor de la imagen no son zona de dibujo. Hay Deshacer y Borrar todo.

- **Manual**, predeterminado: solo una captura al pulsar el botón.
- **Seguir cámara**: como máximo una captura por segundo (se programa la siguiente después de recibir la anterior). Se detiene al empezar a dibujar o al ocultar la pestaña.
- **Borrar y actualizar**: úsalo al mover la cámara. Las marcas antiguas dejan de corresponder al nuevo encuadre.
- Referencia inicial de **640 px** de ancho, conservando proporción (640 × 360 en 16:9); opción **960 px**. JPEG calidad 65.

Se permite un controlador. Cierra su pestaña antes de abrir otro. Una conexión inactiva libera el control tras unos 15–20 segundos. Al reconectar se recuperan los vectores desde Node; pide una nueva referencia si la página se recargó. No se guardan capturas en disco. El estado vectorial se guarda en `tactics-state.json` dentro de la carpeta de datos.

Los tokens de control y salida son distintos y se generan al iniciar. No compartas el enlace del controlador con espectadores. Tras reiniciar el servicio, abre el nuevo QR y actualiza la URL de la fuente Navegador de OBS. El panel de administración solo admite conexiones desde localhost y requiere su propio token.

## Opciones

```sh
wargaming-overlay tactics --port 8767 --interface en0 --data-dir /ruta/datos
```

Con `start --tactics` o el GUI: variables `TACTICS_PORT` (8767) y `TACTICS_INTERFACE` (por ejemplo `en0`). El servidor táctico escucha en IPv4; rechaza clientes fuera de localhost/redes IPv4 privadas. No está diseñado para alojamiento público. HTTP local no cifra los trazos: usa una red de confianza. La contraseña de OBS no viaja por esa red: la conexión con OBS se limita a loopback.

## Validación y rendimiento

Las pruebas automatizadas cubren autenticación OBS, compatibilidad, rechazo de referencias anidadas con anotaciones, límites de coordenadas, sincronización y recuperación, un solo controlador, salida de solo lectura, exclusión de capturas simultáneas y controlador oculto. No sustituyen la prueba táctil en Safari/iPadOS.

Antes de un torneo, prueba en el teléfono y en el modelo concreto de iPad/iPadOS: dibuja cerca de las cuatro esquinas y comprueba la alineación, gira el dispositivo, prueba todos los tipos de trazo, oculta y vuelve a abrir Safari, desconecta/reconecta Wi-Fi y verifica que no captura en segundo plano. Cambia de red en el Mac y verifica el nuevo QR. Mueve la cámara y usa Borrar y actualizar.

Compara la misma escena con la capa apagada, activa en manual y siguiendo a 1 FPS: CPU/memoria de OBS, tiempo de renderizado y deltas de frames perdidos. Para evaluar codificación hace falta una grabación/emisión de prueba bajo las condiciones reales; contadores a cero sin codificar no prueban rendimiento. Repite con cámara en vivo y una sesión de varios minutos. Si empeora, reduce primero frecuencia y resolución.

Consulta los resultados y límites de la prueba local en `docs/tactics-validation.md`. No se garantiza consumo despreciable ni una latencia específica.

Protocolo oficial: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md
