# Validación local — 22 de octubre de 2026

MacBook Neo del usuario, OBS 32.2.2, WebSocket 5. Se comprobó autenticación con la configuración local de OBS sin publicar la contraseña. Se verificó disponibilidad de `GetSourceScreenshot` y captura real JPEG 640 × 360; OBS devuelve MIME `image/jpg`, contemplado junto a `image/jpeg`.

Se crearon escenas **Táctica · referencia** (reutiliza Board Cam y su transformación de Mesa) y **Táctica · salida** (referencia + Navegador transparente). No se duplicó el dispositivo de cámara. Browser: 2560 × 1440, 15 FPS, shutdown al ocultar, sin audio redirigido y sin acceso a OBS. La escena activa original se restauró después de las mediciones. Las cámaras no daban imagen durante la prueba: los JPEG eran negros.

La interfaz se abrió en el navegador del Mac, solicitó una captura real, dibujó un trazo y lo sincronizó. El usuario confirmó que pudo dibujar desde Safari en su dispositivo. Se observaron trazos recibidos por Node y visibles en una captura de la escena de salida de OBS. La referencia limpia no incluye los trazos. No se confirmó el modelo del dispositivo ni una versión concreta de iPadOS; Pencil y la precisión en las cuatro esquinas siguen pendientes. Después de la medición la cámara sí mostró imagen, que también se capturó junto con los trazos.

## Medición exploratoria

Misma escena Táctica · salida, lienzo 2560 × 1440 a 60 FPS. Dos segundos de preparación y ocho muestras separadas un segundo por modo. Los valores son los que informa `GetStats` de OBS, no el consumo total de todos sus procesos auxiliares. Las capturas incluyeron comprobación de referencia y petición JPEG por WebSocket. No hubo codificación ni emisión activa.

| Modo | CPU OBS media | Memoria OBS media | Render medio | Frames de render perdidos | Capturas |
| --- | ---: | ---: | ---: | ---: | ---: |
| Capa apagada, sin capturas | 8,48 % | 186,34 MB | 4,62 ms | 0 / 422 | 0 |
| Capa activa, manual | 10,38 % | 193,67 MB | 3,90 ms | 0 / 421 | 1 |
| Capa activa, 1 FPS | 10,62 % | 182,21 MB | 3,70 ms | 0 / 423 | 8 |

Tiempo medio de petición/comprobación/captura local: 16 ms en manual (una muestra), 15 ms a 1 FPS (ocho muestras). No incluye Wi-Fi, render del móvil ni latencia hasta el stream. La caída de memoria y variación de render indican ruido: no interpretarlas como mejoras causales. Muestra demasiado breve para prometer impacto estable. El proceso Node y la memoria de procesos CEF auxiliares no se midieron por separado.

## Pendiente antes de usar en evento

- Completar Safari en la versión concreta de iPadOS: orientación, cuatro esquinas, Pencil y rechazo de dibujo en bandas. La prueba de dibujo en Safari del usuario ya pasó.
- Cámara en vivo: reencuadrar, Borrar y actualizar, verificar correspondencia con miniaturas.
- Comparación sostenida con grabación o emisión de prueba para medir codificación y todos los procesos; estas muestras no la evalúan.
- Cambio real de Wi-Fi y nueva lectura de QR. La generación usa las interfaces actuales; no se cambió la red del Mac durante esta prueba.

Las pruebas automatizadas complementan estas comprobaciones y no sustituyen las pendientes.
