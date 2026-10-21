# Wargaming Overlay

Overlay local para OBS con marcador, ronda, CP, primarias y secundarias leídos de un teléfono Android. Incluye panel de configuración, vínculo de jugadores por nombre, indicadores de misión cumplida, persistencia de la partida y botón para restablecer los datos.

**Paquete:** `@ing.jorgeu/wargaming-overlay` · **Comando:** `wargaming-overlay` · **Licencia del código:** 0BSD.

El paquete está publicado en [npm como @ing.jorgeu/wargaming-overlay](https://www.npmjs.com/package/@ing.jorgeu/wargaming-overlay). Para usarlo no necesitas clonar el repositorio. En macOS/Linux, si npm intenta escribir en una carpeta del sistema, usa la instalación en tu usuario que se explica abajo.

## Contenido

- [Requisitos](#requisitos)
- [Instalar dependencias en macOS](#macos)
- [Instalar dependencias en Windows](#windows)
- [Instalar dependencias en Linux](#linux)
- [Instalar el CLI](#instalar-el-cli)
- [Preparar el teléfono](#preparar-el-teléfono)
- [Primer inicio y configuración de OBS](#primer-inicio-y-configuración-de-obs)
- [Comandos y ejemplos](#comandos-y-ejemplos)
- [Migrar, guardar y restablecer](#migrar-guardar-y-restablecer)
- [Solución de problemas](#solución-de-problemas)
- [Actualizar y desinstalar](#actualizar-y-desinstalar)
- [Desarrollo y publicación](#desarrollo-y-publicación)

## Requisitos

| Dependencia | Requisito y función | Descarga oficial |
| --- | --- | --- |
| Node.js y npm | Node 22 o posterior; preferir una versión LTS mantenida. Ejecuta el CLI y servidor. npm viene con las instalaciones habituales de Node. | [Node.js](https://nodejs.org/en/download/) |
| Python | Python 3.8 o posterior; preferir una versión mantenida. Interpreta el XML de Android. | [Python](https://www.python.org/downloads/) |
| ADB | Android SDK Platform-Tools. Comunica el equipo con el teléfono. | [Platform-Tools](https://developer.android.com/tools/releases/platform-tools) |
| OBS Studio | Fuente Navegador disponible. Muestra el overlay sobre el vídeo. | [OBS Studio](https://obsproject.com/download) |
| Teléfono Android | App Tabletop Battles abierta en la ronda, opciones de desarrollador y depuración USB habilitadas. | [Conectar un dispositivo Android](https://developer.android.com/studio/run/device) |
| Cable USB | Debe transmitir datos, no solo cargar. | — |

No requiere Android Studio completo, Java, paquetes pip, OCR ni dependencias npm adicionales. No lee iPhone/iOS. Aunque el nombre del proyecto es genérico, el parser actual está adaptado a la interfaz Android de Tabletop Battles; no interpreta automáticamente otras aplicaciones.

El servidor escucha únicamente en `127.0.0.1`, puerto **8765** por defecto. No necesita `sudo` ni ejecutarse como administrador. La instalación de dependencias del sistema sí puede solicitar permisos. Se necesita internet para descargar software; la lectura y el overlay funcionan localmente.

**Validación:** macOS probado con un Galaxy real. Windows y Linux tienen soporte de rutas/instaladores y escenarios simulados en las pruebas. La matriz de CI está preparada para las tres plataformas; las pruebas físicas de USB en Windows/Linux siguen pendientes. No se ha medido todavía el impacto durante una transmisión real 1440p60.

## macOS

1. Instala [Homebrew](https://brew.sh/) siguiendo las instrucciones de su página, si quieres usarlo. Abre una nueva Terminal después de instalarlo.
2. Instala las dependencias:

   ```sh
   brew install node python
   brew install --cask android-platform-tools
   ```

3. Comprueba las versiones:

   ```sh
   node --version
   npm --version
   python3 --version
   adb version
   ```

4. Instala OBS desde su [página oficial](https://obsproject.com/download).
5. Continúa con [Instalar el CLI](#instalar-el-cli).

Sin Homebrew, instala Node y Python desde sus páginas oficiales y descarga el ZIP de Platform-Tools para Mac. Extrae el ZIP, por ejemplo en `$HOME/Android/platform-tools`. Puedes añadir esa carpeta al PATH de esta sesión:

```sh
export PATH="$HOME/Android/platform-tools:$PATH"
adb version
```

Para conservarlo, añade esa línea a `~/.zshrc` y abre otra Terminal. También puedes usar `--adb "$HOME/Android/platform-tools/adb"` sin modificar PATH. macOS no necesita drivers USB adicionales para ADB. [Referencia de Homebrew para ADB](https://formulae.brew.sh/cask/android-platform-tools).

## Windows

Los ejemplos usan **PowerShell**. Ejecuta el overlay como usuario normal.

1. Instala Node.js LTS desde [Node.js](https://nodejs.org/en/download/). Incluye npm.
2. Instala Python desde [Python para Windows](https://www.python.org/downloads/windows/), siguiendo la [guía oficial](https://docs.python.org/3/using/windows.html). Abre otra terminal al finalizar.
3. Instala ADB con WinGet:

   ```powershell
   winget install --exact --id Google.PlatformTools --source winget
   ```

   Si no tienes WinGet, consulta [su instalación oficial](https://learn.microsoft.com/en-us/windows/package-manager/winget/), o descarga Platform-Tools para Windows desde [Google](https://developer.android.com/tools/releases/platform-tools). Extrae el ZIP, por ejemplo en `C:\Android\platform-tools`.

4. Abre una nueva PowerShell y comprueba:

   ```powershell
   node --version
   npm.cmd --version
   python --version
   adb version
   ```

   Si Python está instalado mediante el launcher y `python` no responde, prueba `py -3 --version`. El CLI busca `python3`, `python` y el launcher `py`.

5. Si el teléfono no aparece, instala el [driver USB de su fabricante](https://developer.android.com/studio/run/oem-usb). Para Samsung, consulta el [driver oficial](https://developer.samsung.com/android-usb-driver).
6. Instala [OBS](https://obsproject.com/download) y continúa con [Instalar el CLI](#instalar-el-cli).

Si extrajiste ADB manualmente, puedes usar una ruta explícita:

```powershell
wargaming-overlay.cmd doctor --adb "C:\Android\platform-tools\adb.exe"
```

O añadirla al PATH de la sesión:

```powershell
$env:Path = "C:\Android\platform-tools;" + $env:Path
adb version
```

Para hacer el cambio permanente, añade la carpeta a la variable **Path de tu usuario** desde las variables de entorno de Windows y abre otra terminal. Si PowerShell bloquea `npm.ps1`, usa `npm.cmd`; para el CLI usa `wargaming-overlay.cmd`. No hace falta cambiar la política de ejecución. [Referencia del instalador WinGet](https://learn.microsoft.com/en-us/windows/package-manager/winget/install).

## Linux

Instala las dependencias con el gestor de tu distribución. Comprueba siempre que `node --version` sea 20 o superior; si tu repositorio ofrece una versión más antigua, sigue una opción adecuada de la [guía oficial de Node.js](https://nodejs.org/en/download/).

### Debian / Ubuntu

```sh
sudo apt-get update
sudo apt-get install nodejs npm python3 adb android-sdk-platform-tools-common
```

Si ADB informa que faltan permisos USB, comprueba el grupo `plugdev`:

```sh
id -nG
sudo usermod -aG plugdev "$USER"
```

El segundo comando es necesario solo si tu usuario no pertenece al grupo. Cierra sesión y vuelve a entrar para aplicar el cambio. Las reglas udev se incluyen en `android-sdk-platform-tools-common`. [Guía Android para Ubuntu](https://developer.android.com/studio/run/device), [paquete adb](https://packages.ubuntu.com/en/jammy/adb).

### Fedora

```sh
sudo dnf install nodejs npm python3 android-tools
```

Si hay errores de permisos, revisa las reglas udev y permisos USB de tu distribución. No asumas que existe el grupo `plugdev` ni ejecutes el overlay con sudo. [Paquete android-tools de Fedora](https://packages.fedoraproject.org/pkgs/android-tools/android-tools/).

### Arch Linux

```sh
sudo pacman -Syu nodejs npm python android-tools android-udev
```

Este comando actualiza el sistema además de instalar las dependencias; revisa la operación que presenta pacman. [Paquete android-tools de Arch](https://archlinux.org/packages/extra/x86_64/android-tools/).

### Otras distribuciones y comprobación

Instala Python 3 y ADB con tu gestor o usa [Platform-Tools oficiales](https://developer.android.com/tools/releases/platform-tools). `setup` no instala automáticamente en distribuciones sin apt-get, dnf o pacman.

```sh
node --version
npm --version
python3 --version
adb version
```

Instala OBS siguiendo las [instrucciones oficiales para Linux](https://obsproject.com/kb/linux-installation) y comprueba que incluya la fuente Navegador.

## Instalar el CLI

Elige **una** opción. La instalación del paquete no instala ADB o Python automáticamente.

### A. Desde el código fuente, disponible ahora

Descarga/descomprime el proyecto, o clónalo si tienes la URL del repositorio. Abre una terminal en la carpeta que contiene `package.json`:

```sh
npm install -g .
wargaming-overlay --version
wargaming-overlay --help
```

En PowerShell puedes usar `npm.cmd install -g .` y `wargaming-overlay.cmd --help`.

También puedes usarlo **sin instalar globalmente**, desde esa carpeta:

```sh
node cli.js doctor
npm start
```

### B. Desde un archivo de paquete

Sustituye la ruta por la del archivo que recibiste:

```sh
npm install -g "/ruta/ing.jorgeu-wargaming-overlay-2.2.0.tgz"
```

Ejemplo Windows:

```powershell
npm.cmd install -g "$HOME\Downloads\ing.jorgeu-wargaming-overlay-2.2.0.tgz"
```

### C. Desde npm: versión publicada

Puedes ejecutar esto desde cualquier carpeta:

```sh
npm install -g @ing.jorgeu/wargaming-overlay
wargaming-overlay --version
```

En Windows usa `npm.cmd` y `wargaming-overlay.cmd` si PowerShell bloquea los scripts `.ps1`.

Si macOS/Linux responde con `EACCES: permission denied, mkdir '/usr/local/lib/node_modules/...'`, el paquete sí fue encontrado: falta permiso de escritura en la carpeta global de npm. Usa los siguientes pasos, sin sudo.

### Instalación desde npm sin sudo en macOS / Linux

1. Instala la versión publicada en tu carpeta de usuario:

   ```sh
   npm install -g --prefix "$HOME/.local" @ing.jorgeu/wargaming-overlay
   ```

2. Habilita el comando en la terminal actual y comprueba la instalación:

   ```sh
   export PATH="$HOME/.local/bin:$PATH"
   wargaming-overlay --version
   wargaming-overlay doctor
   ```

3. Para conservar PATH en nuevas terminales, abre el archivo de configuración de tu shell. En macOS con zsh:

   ```sh
   nano ~/.zshrc
   ```

   Si usas bash, abre `nano ~/.bashrc`. Añade esta línea solo si todavía no existe:

   ```sh
   export PATH="$HOME/.local/bin:$PATH"
   ```

   En nano guarda con Ctrl+O, Enter y sal con Ctrl+X. Abre una nueva terminal y comprueba:

   ```sh
   command -v wargaming-overlay
   wargaming-overlay --version
   ```

   Con esta instalación, la ruta debería terminar en `.local/bin/wargaming-overlay`.

4. Con el teléfono preparado, inicia:

   ```sh
   wargaming-overlay start
   ```

Si no quieres modificar PATH, también puedes ejecutar `"$HOME/.local/bin/wargaming-overlay" start` directamente.

**Diferencia entre instalar desde npm y desde el repositorio:**

| Comando | Origen |
| --- | --- |
| `npm install -g --prefix "$HOME/.local" @ing.jorgeu/wargaming-overlay` | Descarga el paquete publicado en npm. No vincula el comando a tu repositorio. |
| `npm install -g --prefix "$HOME/.local" .` | Instala la carpeta actual; npm puede enlazarla al repositorio local. Debes estar en la carpeta del proyecto. |

`--prefix` solo cambia el destino de esa operación; no modifica la configuración global de npm. Repite el mismo prefijo al actualizar o desinstalar:

```sh
npm install -g --prefix "$HOME/.local" @ing.jorgeu/wargaming-overlay@latest
npm uninstall -g --prefix "$HOME/.local" @ing.jorgeu/wargaming-overlay
```

Son operaciones alternativas: ejecuta la primera para actualizar o la segunda para desinstalar, no ambas seguidas. La desinstalación conserva los datos de las partidas. [Documentación npm install](https://docs.npmjs.com/cli/v8/commands/npm-install/).

### Si npm devuelve E404

E404 significa que el registro no encuentra el paquete o que tu sesión no tiene acceso; no es un error de permisos de tu disco. Comprueba el nombre y consulta el registro público:

```sh
npm view @ing.jorgeu/wargaming-overlay version --registry=https://registry.npmjs.org/ --prefer-online
```

Si devuelve una versión, vuelve a instalar consultando información actualizada:

```sh
npm install -g --prefix "$HOME/.local" @ing.jorgeu/wargaming-overlay --prefer-online
```

Si la consulta sigue fallando, revisa `npm config get registry` y la [página del paquete](https://www.npmjs.com/package/@ing.jorgeu/wargaming-overlay). No publiques otra versión ni borres la caché solo para solucionar un E404 de instalación.

## Preparar el teléfono

1. Conecta un cable USB de datos y desbloquea el teléfono.
2. Activa **Opciones de desarrollador**. Habitualmente: Ajustes → Acerca del teléfono → Información de software → pulsa siete veces **Número de compilación**. La ubicación depende del fabricante.
3. En Opciones de desarrollador activa **Depuración USB**.
4. Acepta en el teléfono **Permitir depuración USB** para tu equipo. Puedes marcar que recuerde ese equipo si es tu ordenador de confianza.
5. Comprueba la conexión:

   ```sh
   adb devices -l
   wargaming-overlay doctor
   ```

6. Abre Tabletop Battles en una partida y selecciona la ronda que quieres emitir. Mantén el teléfono desbloqueado y la app visible.

`device` significa conectado y autorizado; `unauthorized` significa que falta aceptar el permiso; `offline` significa que ADB no puede comunicarse correctamente. Si la lista está vacía, ADB no distingue entre cable ausente, cable sin datos y depuración desactivada. [Guía oficial de conexión](https://developer.android.com/studio/run/device).

## Primer inicio y configuración de OBS

1. Detén cualquier lector anterior con Ctrl+C. No ejecutes dos lectores UIAutomator contra el mismo teléfono.
2. Si tienes datos de una versión anterior, [migra antes del primer inicio](#migrar-guardar-y-restablecer).
3. Inicia:

   ```sh
   wargaming-overlay start
   ```

4. Abre el panel en [http://127.0.0.1:8765](http://127.0.0.1:8765).
5. Configura título, nombres, facciones, disposiciones y destacamentos. Si el nombre visible del overlay es distinto al de la app, completa **Nombre en la app** para cada jugador. Pulsa **Actualizar overlay**. Para cambiar de lado, pulsa **Intercambiar jugadores ⇄**: guarda también los cambios pendientes del formulario e intercambia ambos jugadores completos. Los VP, CP y misiones siguen vinculados por nombre; el cambio se refleja al instante en OBS y se conserva al reiniciar.
6. En OBS añade una fuente **Navegador**, desmarca **Archivo local** y usa:

   ```text
   http://127.0.0.1:8765/overlay-art.html
   ```

7. Configura el **ancho y alto de la fuente** según tu lienzo. El selector del panel muestra las medidas; no modifica OBS por sí mismo.
8. En el teléfono, desplázate para mostrar el nombre y los bloques de datos de cada jugador. En pocos segundos aparecerán las lecturas.
9. Mantén la terminal abierta. Ctrl+C detiene servidor y lector; el estado queda guardado.

La asignación izquierda/derecha se hace por nombre, no por posición en el teléfono. Ignora mayúsculas y espacios adicionales; no adivina apodos. Dos nombres ambiguos no se vinculan. `—` significa que no hay lectura, no cero.

### Resoluciones

| Formato | Ancho | Alto |
| --- | ---: | ---: |
| 720p | 1280 | 720 |
| 900p | 1600 | 900 |
| 936p | 1664 | 936 |
| 1080p | 1920 | 1080 |
| 1440p — referencia original | 2560 | 1440 |
| 4K UHD | 3840 | 2160 |

El diseño **original a 2560×1440** es la referencia. En las otras resoluciones se escala todo proporcionalmente: fuentes, posiciones, iconos y separaciones. No reorganiza los elementos. Se verificó la igualdad geométrica con el original a 1440p y el escalado proporcional a 720p, 1080p y 4K.

Con otra relación de aspecto mantiene 16:9, centrado horizontalmente y alineado arriba, dejando espacio transparente. No hay una composición vertical dedicada. El soporte del overlay no garantiza que YouTube/Twitch acepten esa resolución para tu cuenta; configura la salida y el bitrate en OBS de forma independiente.

## Comandos y ejemplos

| Comando | Acción |
| --- | --- |
| `wargaming-overlay start` | Inicia servidor y lector. Es el comando predeterminado. |
| `wargaming-overlay doctor` | Comprueba Python, ADB y estado del dispositivo. |
| `wargaming-overlay setup` | Muestra la guía de tu sistema y ejecuta diagnóstico; no instala nada. |
| `wargaming-overlay setup --dry-run` | Muestra el plan sin instalar ni consultar ADB. |
| `wargaming-overlay setup --install-adb` | Instala ADB si falta y hay un gestor compatible; después diagnostica. |
| `wargaming-overlay migrate CARPETA` | Copia el estado anterior sin sobrescribir archivos existentes. |
| `wargaming-overlay youtube-auth --client-secret RUTA` | Autoriza el canal con el JSON OAuth de escritorio. |
| `wargaming-overlay youtube-auth` | Reautoriza usando el cliente OAuth guardado. |
| `wargaming-overlay --help` o `-h` | Muestra ayuda. |
| `wargaming-overlay --version` | Muestra versión. |

`setup --install-adb` usa Homebrew, WinGet, apt-get, dnf o pacman según la plataforma. No instala Node, Python ni gestores de paquetes; no activa opciones de Android, no acepta autorizaciones USB ni acuerdos por ti. Puede pedir permisos del sistema. Si termina instalando pero todavía no detecta ADB, abre otra terminal y ejecuta `doctor`.

`doctor` y `setup` devuelven código 1 si el diagnóstico no está listo, incluso si solo falta conectar el teléfono. Con ADB/Python instalados, `start` conserva el panel abierto y reintenta aunque falte el teléfono.

### Comandos desde el repositorio

Instala las dependencias con `npm ci` (o `npm install` si actualizas dependencias). Todos los comandos de la tabla anterior pueden ejecutarse como `node cli.js COMANDO` sin instalación global.

| Comando | Acción |
| --- | --- |
| `npm start` | Inicia el backend desde este checkout. |
| `npm start -- --port 8766 --interval 5` | Pasa opciones al backend; el separador `--` es necesario. |
| `npm test` | Ejecuta las pruebas automatizadas; no necesita el canal ni reproduce audio. |
| `wargaming-overlay --test-tts "Hola"` | Lee un texto con la configuración TTS y termina; no inicia overlay, YouTube ni ADB. |
| `npm run test-tts` | Reproduce tres mensajes de prueba por la salida predeterminada del sistema. |
| `npm run facts:coverage` | Informa la cobertura real de curiosidades por facción. |
| `npm run facts:coverage -- --require-four-hours` | Devuelve código 1 si alguna facción no llega a 120 curiosidades. |
| `npm run prepublishOnly` | Ejecuta las pruebas previas a publicar; npm lo invoca automáticamente en `npm publish`. |
| `npm pack --dry-run` | Revisa los archivos que incluirá el paquete sin publicarlo. |

Para instalar o actualizar el comando global: `npm install -g @ing.jorgeu/wargaming-overlay`. Para una versión concreta: `npm install -g @ing.jorgeu/wargaming-overlay@3.1.0`. Usa `wargaming-overlay --version` para comprobar qué instalación ejecuta tu terminal.

### Activar y desactivar la voz de YouTube

El TTS está **desactivado por defecto**. Sin `YOUTUBE_CHAT_TTS_ENABLED=true`, el overlay no inicia el chat, la cola de voz ni Kokoro. También puedes deshabilitarlo con `"enabled": false` en `youtube-tts.json`.

```sh
# Desde el repositorio
YOUTUBE_CHAT_TTS_ENABLED=true npm start

# Con el paquete instalado globalmente
YOUTUBE_CHAT_TTS_ENABLED=true wargaming-overlay start

# Desactivar explícitamente
YOUTUBE_CHAT_TTS_ENABLED=false wargaming-overlay start
```

La variable se aplica a ese inicio. También puedes exportarla en tu terminal; para quitar un valor exportado, usa `unset YOUTUBE_CHAT_TTS_ENABLED`. La configuración opcional `youtube-tts.json`, los pasos OAuth y las limitaciones están en [YouTube Live → voz local](#youtube-live--voz-local-con-kokoro). `Ctrl+C` detiene lector, chat y voz; los cambios de código/configuración requieren reiniciar.

Para publicar una release, consulta [PUBLISHING.md](PUBLISHING.md): `npm version VERSION --no-git-tag-version`, `npm login`, `npm whoami`, `npm publish --dry-run` y `npm publish --access public`. La publicación requiere acceso a la cuenta propietaria y una versión no publicada.

### Opciones

| Opción | Valor predeterminado | Uso |
| --- | --- | --- |
| `--port` | `8765` | Puerto de `start`, entero entre 1024 y 65535. |
| `--interval` | `3` | Pausa entre lecturas de `start`, entre 1 y 60 segundos. Se suma al tiempo de captura. |
| `--serial` | Selección automática si hay uno | Dispositivo para `start`, `doctor` o `setup`. |
| `--adb` | Autodetección | Ruta al ejecutable ADB para `start`, `doctor` o `setup`. |
| `--python` | Autodetección | Ruta al ejecutable Python para `start`, `doctor` o `setup`. |
| `--data-dir` | Según el sistema | Carpeta de datos para `start` y destino de `migrate`. |
| `--client-secret` | Cliente guardado, si existe | Ruta al JSON OAuth de escritorio; solo para `youtube-auth`. |

Las opciones no se guardan como configuración del CLI: repítelas en futuros inicios si quieres mantener un puerto, serial o ruta distintos.

Puerto alternativo y lectura menos frecuente:

```sh
wargaming-overlay start --port 8766 --interval 5
```

En OBS usa entonces `http://127.0.0.1:8766/overlay-art.html`.

Varios dispositivos:

```sh
adb devices -l
wargaming-overlay doctor --serial SERIAL_DEL_TELEFONO
wargaming-overlay start --serial SERIAL_DEL_TELEFONO
```

Rutas explícitas, útiles si no están en PATH:

```sh
wargaming-overlay start --adb "$HOME/Android/platform-tools/adb" --python /usr/local/bin/python3
```

En Windows, sustituye las rutas de ejemplo por las reales:

```powershell
wargaming-overlay.cmd start --adb "C:\Android\platform-tools\adb.exe" --python "C:\Python312\python.exe"
```

Carpeta independiente para pruebas:

```sh
wargaming-overlay start --data-dir "./datos-de-prueba" --port 8766
```

No ejecutes esa instancia al mismo tiempo que otra que esté leyendo el mismo teléfono.

## Migrar, guardar y restablecer

### Migración

Detén el servidor anterior. La carpeta de origen debe contener `overlay-state.json`, `game-state.json` o ambos:

```sh
wargaming-overlay migrate "/ruta/al/overlay-anterior"
wargaming-overlay start
```

Windows:

```powershell
wargaming-overlay.cmd migrate "C:\Users\Ana\Documents\overlay-anterior"
```

La migración **copia**, no elimina el original. Se niega a sobrescribir archivos existentes en el destino. Si ya iniciaste el nuevo servidor y quieres conservar también ese estado, usa un destino nuevo:

```sh
wargaming-overlay migrate "/ruta/al/overlay-anterior" --data-dir "./partida-importada"
wargaming-overlay start --data-dir "./partida-importada"
```

No migra archivos HTML/CSS ni imágenes personalizadas: el paquete trae sus propios recursos. Para importar esas personalizaciones se requiere trabajar sobre el código fuente.

### Ubicación de los datos

| Sistema | Carpeta predeterminada |
| --- | --- |
| macOS | `~/Library/Application Support/wargaming-overlay` |
| Windows | `%LOCALAPPDATA%\wargaming-overlay` |
| Linux | `$XDG_DATA_HOME/wargaming-overlay`, o `~/.local/share/wargaming-overlay` |

`overlay-state.json` contiene los nombres, vínculos y apariencia. `game-state.json` guarda la última partida leída. Están fuera de la instalación npm para sobrevivir a las actualizaciones. Para hacer un respaldo consistente, detén el servidor y copia ambos archivos. Usa `--data-dir` si quieres conservar la ubicación de una instalación anterior al cambio de nombre.

### Persistencia y reset

Si desconectas el teléfono, abres otra pantalla o falla una captura, el overlay conserva el último estado. El panel informa del problema. Reiniciar el servidor vuelve a cargar el estado guardado.

El botón **Restablecer datos de la partida** vacía los puntos y misiones guardados, sin cambiar nombres, facciones ni diseño. Si el teléfono sigue conectado, la próxima lectura volverá a completar lo visible. Restablece cuando empieces una nueva partida con los mismos jugadores.

### Qué se puede leer

- Marcador, nombres y ronda de la pantalla abierta.
- CP, totales de primaria/secundaria y misiones visibles cuando se identifica su jugador.
- Casilla marcada o pendiente en las primarias que la exponen; contador cuando la interfaz expone uno.
- Puntos y máximo en las secundarias que los exponen.

Solo lee lo visible. Un bloque sin nombre de jugador se ignora para evitar asignaciones incorrectas. Los datos conservados pueden haber cambiado fuera de pantalla y las listas de misiones pueden ser parciales. No interpreta una lista ausente como lista vacía.

Al avanzar a la ronda siguiente conserva las secundarias sin puntuar hasta confirmar la lista actual y mantiene las condiciones de primaria, reiniciando sus marcas y contadores. Los totales acumulados se conservan; los CP conservan el último valor leído hasta que el teléfono los actualice. Las lecturas parciales no eliminan misiones fuera de pantalla. No arrastra misiones al consultar rondas anteriores o saltar varias rondas. Si consultas una ronda histórica en el teléfono, mostrará esa ronda. TOP/BOTTOM se infiere automáticamente al observar una secundaria nueva sin puntos que aparece después de la lectura inicial, incluso en listas parcialmente visibles. No requiere seleccionar el turno en el panel. El orden se toma de Tabletop Battles: el primer jugador de la interfaz juega TOP y el segundo BOTTOM. Aunque conectes en ronda 5, la siguiente secundaria nueva permite identificar la mitad sin esperar otra ronda. La primera lectura por sí sola no determina el turno activo; hasta identificarlo se muestra solo la ronda. El último turno identificado se conserva dentro de esa ronda, incluso al cambiar de pantalla o reiniciar. La detección se guarda al reiniciar y es independiente del intercambio de lados. Es una estimación: la lectura parcial puede ocultar cuándo se robó una carta. Recuerda las cartas vistas por jugador y ronda para no confundir su reaparición al desplazar la pantalla con un robo. Una carta sin puntos nunca vista antes puede ser una carta antigua que estaba fuera de pantalla: en ese caso la estimación puede adelantarse. Puntuar primarias o secundarias, marcar objetivos y gastar o ganar CP no cambia el turno; nuevas cartas simultáneas de ambos jugadores conservan el turno anterior. El nombre general de la primaria no siempre está expuesto; se muestran sus condiciones de puntuación.

## Solución de problemas

| Problema | Qué hacer |
| --- | --- |
| `wargaming-overlay: command not found` | Comprueba la instalación con `npm list -g --depth=0`. Revisa PATH y abre otra terminal. En Unix, los ejecutables están bajo `bin` del prefijo mostrado por `npm prefix -g`; en Windows, en el propio prefijo. |
| PowerShell bloquea un `.ps1` | Usa `npm.cmd` y `wargaming-overlay.cmd`. |
| npm devuelve EACCES | Ejecuta `npm install -g --prefix "$HOME/.local" @ing.jorgeu/wargaming-overlay` y añade `$HOME/.local/bin` a PATH siguiendo los pasos anteriores. |
| npm devuelve 404 | Sigue la sección «Si npm devuelve E404»: comprueba nombre, registro y consulta con `--prefer-online`. |
| ADB no encontrado | Ejecuta `setup --install-adb`, instala Platform-Tools o pasa `--adb` con la ruta completa. |
| Python ausente/incompatible | Instala Python 3.8+ y usa `--python` si tienes varias instalaciones. En Windows prueba `py -3 --version`. |
| No aparece ningún teléfono | Revisa cable de datos, puerto USB, desbloqueo y depuración USB. En Windows comprueba drivers. |
| `unauthorized` | Desbloquea el teléfono y acepta el permiso de depuración para este equipo. Reconecta el cable si no aparece. |
| `offline` | Desbloquea y reconecta el teléfono. |
| `no permissions` en Linux | Revisa reglas udev y grupos. En Ubuntu instala `android-sdk-platform-tools-common` y comprueba `plugdev`. |
| Hay varios dispositivos | Usa `adb devices -l` y pasa `--serial`. Incluye emuladores en esta comprobación. |
| El puerto está ocupado | Detén la otra instancia o usa `--port 8766` y actualiza la URL de OBS. |
| No se puede leer Android / error 137 | Abre la ronda, desbloquea el teléfono y cierra otros lectores UIAutomator. El CLI reintenta. |
| Los valores están en `—` | Revisa «Nombre en la app» y muestra el nombre y bloque del jugador en la pantalla del teléfono. |
| No cambia un dato | Desplázate para que sea visible; los valores fuera de pantalla pueden ser la última lectura guardada. |
| OBS está vacío | Comprueba que el servidor esté abierto, que el panel responda y que la URL y puerto coincidan. Desmarca Archivo local y refresca la fuente. |
| El diseño no refleja cambios | Refresca la fuente. Si editaste el código pero ejecutas un paquete global copiado, reinstala desde ese código. |
| El reset se llena de nuevo | Es normal si el teléfono sigue conectado: la siguiente captura rellena los datos visibles. |
| Migración rechazada | Ya existen archivos de estado en el destino. Usa una carpeta nueva con `--data-dir`. |

## Actualizar y desinstalar

Detén el servidor con Ctrl+C antes de actualizar. Desde el código fuente actualizado:

```sh
npm install -g .
```

Desde npm:

```sh
npm install -g @ing.jorgeu/wargaming-overlay@latest
```

Si usaste un prefijo de usuario, repite `--prefix "$HOME/.local"`. Después inicia otra vez y refresca la fuente en OBS.

Para desinstalar el CLI:

```sh
npm uninstall -g @ing.jorgeu/wargaming-overlay
```

O, con el prefijo de usuario:

```sh
npm uninstall -g --prefix "$HOME/.local" @ing.jorgeu/wargaming-overlay
```

La desinstalación no borra tus archivos de partida ni desinstala ADB, Python u OBS. Puedes conservar la carpeta de datos como respaldo.

## Desarrollo y publicación

Desde la raíz del repositorio:

```sh
npm test
node cli.js setup --dry-run
npm pack --dry-run
npm pack
```

`npm pack` genera el `.tgz` instalable. `npm pack --dry-run` lista el contenido sin crear ese archivo. No hay un paso de compilación ni dependencias npm que descargar para ejecutar las pruebas; estas sí necesitan Python.

La matriz de `.github/workflows/test.yml` está preparada para Node 22/24 en Windows, macOS y Linux. Las pruebas cubren diagnósticos, rutas, selección de instaladores, parser y estado guardado. No sustituyen las pruebas físicas de USB ni de emisión con OBS.

Consulta [PUBLISHING.md](PUBLISHING.md) para autenticarte y publicar. `npm publish` sube el paquete realmente; no es un paso necesario para usarlo localmente. El scope debe ser tuyo o de una organización en la que tengas permiso. No se han incluido credenciales en el proyecto.

## Licencia y recursos

El código se distribuye bajo **[0BSD](LICENSE)**, una licencia permisiva que permite uso comercial, modificación y redistribución sin atribución obligatoria y sin garantías. [Texto oficial](https://opensource.org/license/0bsd).

Se conservan las imágenes del overlay. Su procedencia y derechos se documentan por separado en [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md); la licencia del código no concede derechos adicionales sobre recursos de terceros. El proyecto no declara afiliación oficial con las aplicaciones o juegos a los que hace referencia.

## Caché local de estadísticas de Listhammer

Al iniciar el servidor con `wargaming-overlay start` o `npm start`, se descargan en segundo plano los datos públicos de [Listhammer Stats](https://listhammer.info/stats) y las páginas de las facciones presentes en su tabla. No requiere dependencias nuevas, cuenta ni configuración. La lectura del teléfono y OBS arrancan sin esperar esta descarga.

Se guarda `listhammer-stats.json` en la misma [carpeta de datos](#ubicación-de-los-datos) que `game-state.json`; `--data-dir` también cambia ese destino. En macOS, por defecto:

```text
~/Library/Application Support/wargaming-overlay/listhammer-stats.json
```

El JSON contiene:

- `factions`: victorias, derrotas, partidas, porcentaje de victorias, jugadores y demás agregados por facción.
- `dispositions.overall` y `dispositions.matchups`: resultados por disposición y contra cada disposición rival.
- `factionDetails`: resultados de cada facción contra las facciones rivales (`matchups`), diferencial de puntos y estadísticas y tamaño de muestra jugando primero cuando la fuente los ofrece. Incluye también el histórico semanal y los agregados de la página.
- `sourceUrl`, `fetchedAt`, `schemaVersion` y `selection`: procedencia, fecha de descarga, versión del formato, período y filtros.

Se recoge la selección inicial del sitio: **This Weekend**, sin RTTs; actualmente partidas de 40k de 11.ª edición, 2000 puntos, eventos de al menos 5 rondas y 16 jugadores, excluyendo enfrentamientos espejo. `headline` y `matchups` corresponden al período indicado; `overall` de cada facción es su histórico general y `weekly` distingue las semanas. Se conservan los porcentajes tal como los entrega Listhammer (cadenas, escala 0–100) y sus tamaños de muestra: un cero con cero partidas no representa una tasa observada. No se guardan nombres de jugadores ni sus listas.

La descarga es secuencial, con una pausa de 250 ms entre facciones y un límite de 20 segundos por petición. Se realiza una vez en cada arranque, sin consultas periódicas durante la emisión. La consola informa al terminar e indica la ruta guardada.

Si falta internet, el sitio devuelve un error o cambia de formato, aparece un aviso y se conserva la última copia completa. Si es el primer arranque y falla, aún no habrá archivo. Para reintentar, reinicia el servidor. El reemplazo es atómico y solo ocurre después de validar todas las facciones y comprobar que sus resultados y períodos coinciden con la tabla principal.

Estos datos alimentan los avisos opcionales descritos abajo. El archivo completo no tiene una ruta HTTP pública. Restablecer la partida no borra esta caché. No se incluyen copias descargadas en el paquete npm. La disponibilidad y los datos dependen de Listhammer; la licencia del código no concede derechos sobre sus datos.


## Mensajes, curiosidades y estadísticas en pantalla

En el panel encontrarás **Mensajes en pantalla**. Los avisos aparecen en la parte inferior de `overlay-art.html`, sobre una franja oscura translúcida, durante **15 segundos**. Se escalan junto con el diseño original de 1440p para todas las resoluciones compatibles.

1. Elige las facciones y disposiciones de ambos jugadores y pulsa **Actualizar overlay**. Se usan esas selecciones guardadas, no el nombre del jugador, para escoger las curiosidades y estadísticas.
2. Para un aviso propio, escribe hasta 280 caracteres y pulsa **Mostrar mensaje · 15 s**. Por ejemplo: `¡Bienvenidos! La siguiente ronda comienza en unos minutos.` Los mensajes son texto plano; los saltos de línea se convierten en espacios.
3. Activa **Mostrar un dato cada 2 minutos** para iniciar la rotación. El primer aviso automático aparece después de dos minutos. Puedes incluir **Curiosidades de las facciones**, **Estadísticas y enfrentamiento actual**, o ambas. Las opciones se guardan de inmediato, sin pulsar Actualizar overlay.
4. **Mostrar siguiente dato** adelanta la rotación incluso cuando el modo automático está pausado. Cada pulsación reemplaza el aviso actual y usa el mismo historial que la rotación automática.
5. Al empezar otra transmisión, pulsa **Nueva sesión de mensajes** para reiniciar el historial. No modifica jugadores, puntos, misiones ni la caché de estadísticas.

Un mensaje manual reemplaza cualquier aviso visible, no consume curiosidades y deja dos minutos hasta el siguiente aviso automático. Los avisos automáticos solo consumen datos cuando hay al menos una fuente del overlay conectada; tener únicamente el panel abierto no consume la rotación. Varias fuentes de OBS reciben el mismo aviso, sin crear temporizadores independientes. Si OBS se reconecta mientras hay un aviso, recibe solo el tiempo restante de sus 15 segundos.

### Selección y repetición

El catálogo contiene **764 curiosidades aprobadas en español para las 28 facciones**, con al menos 20 por facción. Solo incluye entradas auditadas; cada una conserva su enlace y fecha de revisión. Genestealer Cults dispone de 32 y Thousand Sons de 20: juntas ofrecen 52 curiosidades, más las estadísticas disponibles. Custom no tiene curiosidades inventadas.

El orden es aleatorio, con más peso para las estadísticas del enfrentamiento actual. Cada dato aparece una vez por ciclo. Al completar la lista empieza otro ciclo automáticamente, sin repetir inmediatamente el último dato si hay alternativas. El botón «Mostrar siguiente dato» también inicia el siguiente ciclo. Las partidas espejo usan una sola copia del catálogo de su facción. El panel separa curiosidades y estadísticas, e indica el ciclo y los datos pendientes. La cobertura mostrada es el tiempo hasta completar el ciclo; la rotación puede continuar indefinidamente.

El historial y las opciones se guardan en `toast-session.json`, dentro de la carpeta de datos (`--data-dir`). Recargar el panel, refrescar OBS, pausar la rotación o reiniciar el servidor no reinicia ese historial. «Nueva sesión de mensajes» es independiente de «Restablecer datos de la partida».

### Qué estadísticas se muestran

La caché local de Listhammer proporciona porcentajes generales de las facciones elegidas, resultados entre ambas facciones, diferencial de puntos y resultados jugando primero cuando hay al menos 10 partidas para esos dos últimos indicadores. También aparecen las disposiciones seleccionadas y su enfrentamiento: se identifican expresamente como resultados **entre todas las facciones**, no como estadísticas particulares de los jugadores.

Cada aviso estadístico incluye período, fecha de la copia y número de partidas. Una tasa con menos de 10 partidas se marca como **muestra pequeña**. Los resultados con cero partidas se omiten. No se calcula una probabilidad de victoria para esta partida ni se inventa un 50 % para enfrentamientos espejo. Los nombres equivalentes del selector y Listhammer se reconocen, por ejemplo Space Marines / Space Marines (Astartes), Agents of the Imperium / Imperial Agents y Genestealer Cults / Genestealer Cult.

No se consulta internet cada dos minutos: las curiosidades vienen incluidas con el paquete y los avisos de estadísticas usan la copia descargada al arrancar. Si Listhammer falla, se utiliza la última copia disponible indicando su fecha. Sin ninguna copia, continúan las curiosidades habilitadas y el panel avisa de que las estadísticas no están disponibles. Las pruebas usan un reloj simulado para verificar la cadencia, la expiración y la ausencia de repeticiones dentro de cada ciclo y continuidad entre ciclos, además de probar los endpoints y la entrega de eventos.

### Si no aparece un aviso

- Reinicia el servidor con esta versión del código y refresca el panel y la fuente Navegador de OBS. La fuente debe apuntar a `/overlay-art.html` en el mismo puerto que el panel.
- Si ejecutas una instalación global anterior, los cambios del repositorio no la actualizan automáticamente: reinstala esa versión o prueba con `npm start` desde el repositorio.
- Comprueba que guardaste las facciones, que hay contenido habilitado y que el panel muestra datos disponibles. El botón «Mostrar siguiente dato» permite comprobarlo sin esperar dos minutos.
- «Nueva sesión» borra solo el historial de avisos, no las estadísticas descargadas.


### Correspondencia de facciones y cobertura de una transmisión

El selector y los mensajes usan el mismo registro, `public/factions.json`. Las equivalencias de `factions.js` traducen **Space Marines (Astartes) → Space Marines**, **Imperial Agents → Agents of the Imperium** y **Genestealer Cult → Genestealer Cults**. Se toleran diferencias de mayúsculas, espacios y puntuación. Los capítulos se mantienen separados: Blood Angels no recibe estadísticas de Space Marines. Los nombres desconocidos se señalan en el panel y no reciben contenido de otra facción por semejanza.

Las estadísticas de un enfrentamiento se toman desde la perspectiva de la facción indicada en el texto. No se calcula el porcentaje del contrario restándolo de 100. Las disposiciones globales se identifican como datos de todas las facciones.

A un aviso cada dos minutos, cuatro horas requieren **120 datos distintos**. Para garantizar esa duración con solo curiosidades en cualquier combinación, incluidas partidas espejo, hacen falta 120 por facción. **Esa ampliación general todavía está pendiente**: Adepta Sororitas y Tyranids ya tienen 120 curiosidades por facción y cubren incluso partidas espejo durante 240 minutos. El catálogo actual cubre Aeldari vs Chaos Daemons durante 248 minutos, pero un espejo de cualquiera de ellas cubre 124 minutos y otras combinaciones tienen menos contenido. Las estadísticas disponibles pueden aumentar la duración; no se cuentan como una garantía porque dependen de la copia local de Listhammer.

El panel muestra el número de datos aún no vistos y su duración a intervalos de dos minutos. Advierte si no quedan cuatro horas. Usar «Mostrar siguiente dato» consume una entrada y reduce esa cobertura; los mensajes manuales no la consumen. La estimación presupone que mantienes las facciones y opciones seleccionadas.

Para revisar el catálogo desde el repositorio:

```sh
npm run facts:coverage
```

Para exigir cuatro horas incluso en partidas espejo (termina con código 1 mientras falten curiosidades):

```sh
npm run facts:coverage -- --require-four-hours
```

Al ampliar `data/faction-facts.json`, usa el nombre exacto del registro, conserva los IDs existentes para respetar el historial y asigna un ID estable a cada nueva curiosidad. Incluye un enlace específico, título de fuente y fecha de revisión. No añadas reformulaciones del mismo dato para aumentar artificialmente la duración.

### Continuidad entre USB y Wi-Fi

El lector recuerda el teléfono por su identificador físico en `phone-connection.json`, dentro de la carpeta de datos. Si ADB presenta USB y Wi-Fi para ese mismo teléfono, el overlay prefiere USB. Al retirar el cable, utiliza la conexión inalámbrica autorizada; al reconectarlo, vuelve a USB. Nunca elige otro teléfono por compartir el modelo o una dirección IP anterior.

Activa la depuración inalámbrica y empareja el computador con el teléfono en Android. Tener activada la opción no equivale a estar emparejado. ADB debe poder descubrir el teléfono en la red. Si el descubrimiento no funciona, conecta previamente con `adb connect IP:PUERTO` usando la dirección que Android muestra en Depuración inalámbrica. El overlay puede recuperar direcciones conocidas y servicios inalámbricos que anuncien el identificador del teléfono guardado; no activa puertos de depuración ni empareja dispositivos desconocidos automáticamente.

Para elegir otro teléfono, inicia con `--serial SERIAL` usando su identificador de `adb devices -l`. Si hay varios teléfonos diferentes y ninguno seleccionado, el lector pide seleccionar uno. El panel distingue conexión USB, Wi-Fi y espera de una ronda legible. Al enviar Tabletop Battles al fondo se conserva el último marcador; al volver a la ronda, la lectura se reanuda. Durante una reconexión puede haber una pausa de unos segundos.

## YouTube Live → voz local con Kokoro

Función opcional del mismo backend, independiente de OBS y del teléfono. Usa OAuth de solo lectura, descubre el directo activo de la cuenta autorizada y recibe el chat por `liveChatMessages.streamList` (gRPC). La voz neural Kokoro se genera localmente desde Node mediante ONNX. Sale por el dispositivo predeterminado del sistema; volumen y salida se cambian en los ajustes de audio. No necesita Python, Homebrew ni servicios TTS externos.

### Primera autorización

1. Crea un proyecto en [Google Cloud](https://console.cloud.google.com/) y habilita **YouTube Data API v3**.
2. Configura Google Auth Platform, añade tu cuenta como usuario de prueba si corresponde y crea un cliente OAuth **Aplicación de escritorio**. Descarga el JSON fuera del repositorio.
3. Desde este repositorio, ejecuta:

```sh
node cli.js youtube-auth --client-secret "$HOME/Downloads/client_secret.json"
```

Con el paquete instalado, el equivalente es `wargaming-overlay youtube-auth --client-secret /ruta/al/archivo.json`. Se abre el navegador: elige la cuenta/canal correcto y concede lectura. El retorno escucha temporalmente solo en `127.0.0.1`, valida `state` y usa PKCE. No se deben pegar tokens en la terminal ni en el chat.

Esta V1 guarda cliente OAuth y tokens en `~/.config/wargaming-overlay/youtube/`, archivos con permisos `0600`, fuera del repositorio y de los recursos HTTP del overlay. El refresh token se reutiliza al reiniciar y renueva el acceso automáticamente. Para desconectar la cuenta, detén el backend, revoca el acceso en tu cuenta Google y elimina esa carpeta. No hay almacenamiento en Keychain en esta versión.

**Google limita a siete días los refresh tokens de proyectos externos en modo Testing** para estos permisos. Antes de usarlo permanentemente, revisa el estado de publicación del proyecto. Una revocación o expiración requiere repetir `youtube-auth`; no se puede garantizar una autorización eterna.

### Arranque y prueba

```sh
YOUTUBE_CHAT_TTS_ENABLED=true npm start
npm run test-tts
```

La segunda instrucción ejecuta tres mensajes falsos, sin YouTube ni OBS. No la ejecutes a la vez que otro lector TTS: la exclusión de voces es por proceso. Para desactivar el chat, omite la variable o usa `YOUTUBE_CHAT_TTS_ENABLED=false`. No se inicia ninguna conexión YouTube cuando está desactivado. El TTS también se inicia en Windows x64 y Linux x64/ARM64 con audio de escritorio.

Si no hay directo con chat, comprueba cada 60 segundos. Al conectar omite el historial anterior a la conexión. Mantiene en memoria el identificador del chat, el cursor de continuación y hasta 1.000 IDs recientes. Ante una desconexión reintenta a 1, 2, 5, 10 y como máximo 30 segundos; una única conexión por instancia. Al terminar el directo o deshabilitarse el chat cancela la voz pendiente y vuelve a buscar. Si hay varios directos simultáneos, elige el primero por ID y lo indica en el log.

Los mensajes normales se transforman en eventos `youtube_chat_message`; los eventos administrativos, Super Chat y membresías no se leen en V1. No se escriben mensajes de texto en disco. En Windows, el audio se guarda temporalmente como WAV y se elimina al finalizar o cancelar la lectura. La terminal muestra mensajes sanitizados y estados YouTube/TTS, sin tokens. Los fallos de OAuth, chat o voz no detienen el overlay.

### Ajustes sencillos

Opcionalmente crea `youtube-tts.json` dentro de la carpeta de datos que muestra el backend al iniciar:

```json
{
  "enabled": true,
  "maxMessageLength": 300,
  "maxQueueLength": 10,
  "readUsername": true,
  "filterUrls": true,
  "extraBlockedTerms": []
}
```

Reinicia el backend para aplicar cambios. Los mensajes se truncan sin cortar palabras cuando es posible, los nombres se limitan a 40 caracteres y las URLs se sustituyen por «Enlace». Si la cola está llena, elimina el pendiente más antiguo; nunca interrumpe una voz para superponer otra. Al detener el backend cancela la voz activa y descarta los pendientes. Cada mensaje usa un proceso Node aislado para síntesis y reproducción, sin shell y con un tiempo máximo de 120 segundos. La cancelación termina ese proceso y su audio. En macOS, si Kokoro falla, se usa `say` por defecto; en Windows/Linux se registra el error y continúa la cola.

La moderación es un filtro local pequeño de patrones ES/EN para insultos discriminatorios graves, amenazas directas, llamados a violencia y algunas expresiones sexuales explícitas. Sustituye los fragmentos por «censurado» y descarta mensajes sin contenido restante. Conserva groserías coloquiales como «qué mierda de tirada» o «ese weón tuvo demasiada suerte». **No entiende contexto ni garantiza detectar todas las variantes o idiomas**; amplía `extraBlockedTerms` según el canal. También filtra los nombres y elimina instrucciones de voz embebidas antes de ejecutar `say`.

### Verificación

`npm test` incluye OAuth con callback local y renovación simulada, gRPC local real, descubrimiento de directos, continuación tras desconexión, duplicados, fin del directo, backoff, sanitización y cola sin superposición. No requiere credenciales ni envía mensajes a YouTube. La prueba real de autorización, recepción de un directo y cambio físico de salida de audio requiere la cuenta del canal y comprobación del operador.

Referencias oficiales: [OAuth de escritorio](https://developers.google.com/youtube/v3/guides/auth/installed-apps), [descubrimiento de directos](https://developers.google.com/youtube/v3/live/docs/liveBroadcasts/list), [chat por streaming](https://developers.google.com/youtube/v3/live/streaming-live-chat), [duración de tokens en Testing](https://developers.google.com/identity/protocols/oauth2).

## Listas de ejército para OBS

En el administrador abre **Listas de ejército**. Cada jugador tiene su propia lista y un enlace **Abrir lista para OBS**. El nombre, la facción y los destacamentos se editan en **Partida** y aparecen en la cabecera de la lista.

1. Pulsa **Añadir unidad** e introduce su nombre.
2. Añade, si corresponde, el nombre de una mejora, varios personajes (uno por línea) y una nota breve.
3. Ordena las unidades arrastrando el asa **⠿** y soltándola antes o después de otra unidad. **Subir / Bajar** también está disponible para teclado.
4. Marca **En reservas** para mostrar la etiqueta de reserva, o **Unidad destruida** para tacharla y atenuarla. Una unidad destruida deja de mostrar la etiqueta En reservas.
5. Pulsa **Guardar lista**. Los cambios llegan a OBS sin refrescar la fuente. Las modificaciones quedan como borrador hasta guardarlas; el navegador avisa si intentas cerrar con cambios pendientes.

En OBS crea dos escenas nuevas, cada una con una fuente **Navegador**, y pega el enlace de su jugador. Configura **1920 × 1080** (se escala proporcionalmente en otras resoluciones 16:9). Puedes cambiar de escena libremente. La URL lleva un identificador estable del jugador: sigue mostrando su lista aunque intercambies izquierda/derecha. Las etiquetas de color sí siguen el lado actual. Toda la lista aparece en una sola pantalla, sin páginas ni rotación. El diseño ajusta columnas y tamaño de texto para que quepa; las listas muy extensas tendrán texto más pequeño. Las unidades consecutivas con el mismo nombre se agrupan bajo un encabezado con su cantidad; cada copia conserva sus personajes, mejora, notas y estado. Si otra unidad interrumpe la secuencia, se inicia un grupo nuevo.

La vista está en `/army-list.html?player=IDENTIFICADOR`; copia la URL exacta desde el panel. También existen `/army-list.html?side=left` y `?side=right` para fuentes que deban seguir un lado, en vez de a una persona.

Puedes asignar una **URL de imagen de fondo** a cada jugador desde el editor. Debe ser un enlace HTTP/HTTPS directo y accesible desde OBS; deja el campo vacío para usar el fondo predeterminado. La imagen se carga en el navegador, no en el servidor, y se oscurece para mantener la legibilidad. El fondo se guarda junto con la lista y se incluye al exportar JSON.

### Importar y exportar

**Exportar JSON** descarga la lista actual, incluidos los cambios del borrador. **Importar JSON** permite recuperarla o cargar un archivo con este formato:

```json
{
  "backgroundUrl": "",
  "units": [
    {
      "name": "Rubric Marines",
      "enhancement": "Nombre de la mejora",
      "characters": ["Ahriman", "Exalted Sorcerer"],
      "notes": "Vigilar el objetivo central",
      "deepStrike": true,
      "destroyed": false
    }
  ]
}
```

También se acepta directamente el array de unidades. Los identificadores se generan al importar. La importación queda como borrador: revisa y guarda. No se interpretan automáticamente PDFs ni exportaciones de otras aplicaciones en esta versión.

Límites: 80 unidades por jugador; nombre y mejora hasta 100 caracteres; hasta 8 personajes de 80 caracteres cada uno; notas hasta 160 caracteres. No se impone que los nombres de unidades sean distintos: puedes tener varias escuadras iguales.

Las listas se guardan en `rosters.json` dentro de la carpeta de datos, fuera del paquete npm. Para respaldarlas, conserva también `overlay-state.json`, que contiene el vínculo de cada jugador. Reiniciar el servicio o restablecer los puntos de la partida no borra las listas. Al preparar otra partida puedes editar o importar las nuevas listas. Si otra pestaña modificó una lista, el servidor rechaza sobrescribirla con un borrador antiguo; exporta tu borrador si quieres conservarlo y recarga para obtener la versión actual.

Si el panel indica que el servicio está desactualizado al guardar un fondo, detén `npm start` con Ctrl+C y ejecútalo de nuevo. Recargar el navegador no actualiza el servidor Node. La URL queda en el borrador para guardarla después del reinicio. El overlay de listas ocupa toda la fuente de OBS incluso si no usa una proporción 16:9.

Cada lista admite un nombre opcional (máximo 80 caracteres), editable en «Listas de ejército». Se muestra encima del nombre del jugador en OBS y se conserva al importar/exportar JSON mediante el campo `name`. Sin nombre se muestra «ORDEN DE BATALLA». Reinicia el servicio después de actualizar para activar el guardado del campo.

Marca **Battleshocked** en una unidad y guarda la lista para mostrar su etiqueta ámbar en OBS. El estado se conserva en el campo `battleshocked` del JSON; las listas antiguas lo toman como falso. Las unidades destruidas ocultan esta etiqueta. Desmárcalo cuando deje de aplicarse.

Cuando una unidad tiene personajes asignados, sus nombres son el título principal y debajo aparece «Lidera:» con el nombre de la unidad. En los grupos consecutivos cada unidad conserva sus propios personajes y estados.

Los enlaces del administrador para OBS son fijos por color: `/army-list.html?side=blue` y `/army-list.html?side=red`. Usa «Copiar URL azul/roja» para copiarlos al portapapeles. Al intercambiar jugadores muestran la lista del nuevo ocupante de ese color, sin cambiar la URL en OBS. Los enlaces anteriores siguen siendo compatibles.

Las listas se guardan automáticamente al dejar de escribir brevemente, reordenar o cambiar estados. El panel muestra el estado del guardado y reintenta si falla la conexión. Completa los nombres de las unidades nuevas para guardar. No cierres el panel mientras indique cambios pendientes o errores.

Si se habilita `httpFallback` y `streamList` rechaza las credenciales con código 16, el chat cambia automáticamente a consultas HTTP de respaldo. Respeta el intervalo de YouTube con un mínimo de 15 segundos; puede haber esa demora adicional en la lectura. Este modo consume cuota por consulta (5 unidades, hasta unas 1.200 por hora a intervalos de 15 segundos).

### Autenticación de streamList y respaldo opcional

Si gRPC rechaza OAuth aunque la API HTTP funcione, se puede probar la autenticación oficial mediante API key. En Google Cloud crea una clave restringida a YouTube Data API v3 y guárdala en un archivo local fuera del repositorio. En `youtube-tts.json` configura `"apiKeyFile": "/ruta/privada/youtube-api-key.txt"`. Reinicia el servicio. OAuth sigue usándose para detectar el directo; streamList envía solo la API key. La clave no se imprime ni se exporta al overlay.

El respaldo por consultas HTTP está **desactivado por defecto** para conservar cuota. Para habilitarlo explícitamente configura `"httpFallback": true`. Cada consulta consume cuota; no equivale a una conexión streamList persistente.


### Instalación y configuración de Kokoro

Requiere Node 22+. `npm install` instala las dependencias TTS, pero no descarga el modelo. Kokoro descarga automáticamente su modelo v1.0 q8 y tres voces españolas (aproximadamente 96 MB) al leer el primer mensaje o ejecutar una prueba de voz con ese proveedor. Si el TTS está desactivado o eliges `say`, no descarga ni carga el modelo. La caché se guarda en `~/.cache/wargaming-overlay/kokoro/<revisión>`. Después de la primera descarga, la síntesis funciona sin internet. No hay pasos de instalación manual obligatorios para TTS. Opcionalmente puedes preparar la caché antes de transmitir con `npm run setup-tts`. Si una descarga falla, las siguientes lecturas reintentan y se aplica el respaldo configurado. La conexión a YouTube sí requiere internet.

Sistemas de audio compatibles: macOS Intel/Apple Silicon (CoreAudio), Windows x64 (PowerShell/SoundPlayer y ONNX WebAssembly), Linux x64/ARM64 con glibc y ALSA (`libasound.so.2`) y una salida de audio de escritorio. Windows ARM64, Alpine/musl y sistemas sin audio no se consideran compatibles con reproducción. No se requieren Python, Rust, CMake, ffmpeg ni espeak instalados en el sistema. Linux necesita sus bibliotecas de audio habituales; el paquete no instala componentes del sistema operativo.

Añade estas propiedades a `youtube-tts.json`, conservando las demás:

```json
{
  "ttsProvider": "kokoro",
  "ttsFallback": "say",
  "kokoroVoice": "ef_dora",
  "kokoroSpeed": 1
}
```

En Windows/Linux usa `"ttsFallback": "none"`. Voces: `ef_dora`, `em_alex`, `em_santa`. Velocidad: de 0.5 a 2. Para volver a la voz anterior en macOS cambia `"ttsProvider": "say"`. Reinicia el backend para aplicar los cambios. También puedes usar `TTS_PROVIDER`, `TTS_FALLBACK`, `KOKORO_VOICE`, `KOKORO_SPEED` y `KOKORO_CACHE_DIR`; las variables tienen prioridad sobre el JSON. `KOKORO_SKIP_DOWNLOAD=true` omite la descarga del comando opcional `npm run setup-tts`, pero no durante la primera lectura con Kokoro.

El modelo se fija a Kokoro v1.0 q8 y a una revisión verificada, para evitar cambios silenciosos. Cambiar el modelo requiere actualizar el manifiesto `tts/kokoro-assets.js` (revisión, archivos y SHA-256) y verificar que conserva las entradas/salida ONNX usadas por `tts/kokoro-engine.js`; no se aceptan IDs de modelos arbitrarios.

La cola FIFO, los filtros y el overlay conservan su funcionamiento. En Windows se usa ONNX WebAssembly para evitar instalar el runtime de Visual C++; la reproducción usa PowerShell incluido en Windows y termina con `PlaySync`. La cancelación termina el árbol de procesos. En macOS/Linux se usa ONNX nativo y CoreAudio/ALSA. La síntesis se realiza en un proceso aparte para no bloquear HTTP/SSE. Las pruebas de generación real se realizaron en macOS; la reproducción física en macOS y la ejecución real en Windows/Linux siguen pendientes. Las pruebas automáticas usan audio simulado y no reproducen sonido.

En la prueba local, la generación nativa tardó aproximadamente 2 s en caliente y 3.7 s en frío para una frase de 3.9 s. El backend WebAssembly que usa Windows tardó aproximadamente 6.5 s en la misma Mac; no es una medición de rendimiento en Windows.


### Probar un texto sin iniciar el servicio

```sh
wargaming-overlay --test-tts "Pedro dice: Magnus falló una carga de ocho pulgadas."
```

También está disponible el alias `warhammer-overlay --test-tts "Hola mundo"`. Ambos nombres ejecutan el mismo CLI.

Desde el repositorio:

```sh
npm run start -- --test-tts "Hola, esta es una prueba de voz."
npm run start -- --test-tts "Hola, soy Alex." --voice em_alex --fallback none
npm run start -- --test-tts "Esta es la voz anterior de macOS." --provider say
```

El comando lee el texto por la salida de audio predeterminada, espera a que termine la reproducción y sale. No inicia el servidor, el lector del teléfono ni conexiones a YouTube/OBS; tampoco modifica la partida o la configuración guardada. El texto de prueba se envía directamente al TTS, sin añadir nombre de usuario ni aplicar los filtros del chat. Si falta el modelo de Kokoro, lo descarga automáticamente la primera vez.

Por defecto utiliza las opciones de voz de `youtube-tts.json` en la carpeta de datos habitual y las variables de entorno TTS. Puedes elegir otra configuración con `--data-dir RUTA`. Las opciones del comando tienen prioridad sobre las variables y el archivo, y solo se aplican a esa ejecución:

| Opción | Valores |
| --- | --- |
| `--test-tts` | Texto entre comillas; obligatorio y no vacío. |
| `--voice` | `ef_dora`, `em_alex`, `em_santa`. |
| `--provider` | `kokoro` o `say` (solo macOS). |
| `--fallback` | `say` (solo macOS) o `none`. Usa `none` para probar exclusivamente Kokoro. |
| `--speed` | Número de 0.5 a 2; afecta a Kokoro. |
| `--data-dir` | Carpeta que contiene `youtube-tts.json`. |

`Ctrl+C` cancela síntesis y reproducción. El comando termina con código 0 cuando finaliza sin error, o 1 si falla la configuración o la lectura. Evita ejecutarlo a la vez que otra instancia TTS para no superponer voces.


### Elegir `say` en macOS

Puedes usar la voz nativa como proveedor principal, sin cargar Kokoro. Para una ejecución del servicio:

```sh
YOUTUBE_CHAT_TTS_ENABLED=true TTS_PROVIDER=say npm run start
```

Para conservar la elección, configura `"ttsProvider": "say"` en `youtube-tts.json`. Para una lectura puntual:

```sh
npm run start -- --test-tts "Hola mundo" --provider say
```

Para volver a Kokoro, configura `"ttsProvider": "kokoro"` y elimina cualquier `TTS_PROVIDER=say` exportado. `"ttsFallback": "say"` conserva la voz nativa como respaldo de Kokoro en macOS; `"ttsFallback": "none"` lo deshabilita. `say` no está disponible en Windows/Linux.


### Cambios de la versión 3.0.0

Requiere Node 22 o posterior. Incorpora Kokoro local opcional, selección directa de `say` en macOS, prueba puntual con `--test-tts "texto"` y alias `warhammer-overlay`. El modelo se descarga automáticamente solo al usar Kokoro. Incluye las correcciones de lectura de objetivos primarios y continuidad/autenticación del chat que estaban preparadas en el proyecto.


### Cambiar estados desde la lista del overlay

Haz clic en una unidad en la pantalla de listas para abrir un menú pequeño con **Battleshocked**, **Destruida** y **En reservas**. Cada opción se activa/desactiva de forma independiente; vuelve a pulsarla para quitar el estado. En los grupos de unidades repetidas puedes pulsar una fila individual o el título del grupo y elegir Unidad 1, Unidad 2, etc. Los cambios se guardan y se sincronizan con el administrador y las demás ventanas sin modificar nombres, personajes, notas ni el orden.

No hay botones permanentes, resaltado al pasar el ratón ni avisos de guardado en el overlay; se conservan las indicaciones existentes de los estados. El menú se cierra al elegir una opción, pulsar fuera o Escape. También se abre con Enter/Espacio sobre una unidad. En OBS usa **Interactuar** para hacer clic en una fuente de navegador. El menú temporal sí forma parte de la página: si no quieres que se vea en emisión, opera una copia de la misma URL en otra ventana del navegador; los estados se sincronizan con OBS.

## Listas remotas desde los teléfonos (opcional)

El mismo repositorio incluye un segundo servicio Node, independiente del overlay. Publica dos páginas móviles fijas: `https://tu-backend/blue` y `https://tu-backend/red`. Los jugadores no necesitan cuenta ni contraseña. El manager habilita/cierra cada lado desde el panel local; ambos empiezan cerrados y vuelven a cerrarse al reiniciar el backend. Al terminar de analizar y guardar una lista, ese lado se cierra automáticamente.

### Ejecutar el backend

En el servidor remoto, con Node 22+:

```sh
npm ci
# Configura las variables siguientes en el proveedor de hosting, o en un archivo .env privado.
npm run start:remote-lists
```

Para cargar un archivo de variables usando Node:

```sh
node --env-file=/ruta/backend.env remote-lists/start.js
```

La plantilla versionada es `remote-lists/.env.example`. Cópiala a `.env.dev` para desarrollo local y configura allí las credenciales; `.env.dev` está excluido de Git y del paquete npm. Para cargarla: `node --env-file=.env.dev remote-lists/start.js`. Variables:

| Variable | Valor / uso |
| --- | --- |
| `OPENAI_API_KEY` | Obligatoria, solo en el backend remoto. Nunca se envía al jugador ni al Mac. |
| `OPENAI_MODEL` | `gpt-6-luna` por defecto; modelo compatible con Responses API y JSON Schema estricto. |
| `REMOTE_LISTS_MANAGER_TOKEN` | Obligatoria, al menos 24 caracteres. Protege los botones y la descarga del manager, no los enlaces de los jugadores. |
| `REMOTE_LISTS_PORT` | 8080; también acepta `PORT` del hosting. |
| `REMOTE_LISTS_HOST` | `0.0.0.0`; usa `127.0.0.1` para pruebas solo en el Mac. |
| `REMOTE_LISTS_DEMO` | `false`; `true` devuelve listas de ejemplo sin OpenAI ni consultas a Wahapedia. No lo actives en producción. |
| `REMOTE_LISTS_DATA_DIR` | `./remote-lists-data`; **debe ser un volumen persistente**. |
| `REMOTE_LISTS_TOKEN_BUDGET` | 500000 tokens reservados como máximo durante la vida del archivo de estado. |
| `REMOTE_LISTS_MAX_IMPORTS` | 2 importaciones por lado y apertura; cada importación real puede hacer hasta dos llamadas al LLM. |
| `REMOTE_LISTS_MAX_OUTPUT_TOKENS` | 4000 tokens por respuesta. |
| `REMOTE_LISTS_OPEN_MINUTES` | 30 minutos; cierra las subidas abandonadas. |
| `REMOTE_LISTS_TRUST_PROXY` | `false`; activa solo si el proxy de confianza **sobrescribe** `X-Forwarded-For` con una única IP cliente y el backend no es accesible por otra vía. |

Puedes generar la credencial del manager con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` y guardarla como variable del hosting. Los jugadores siguen usando exclusivamente los dos enlaces fijos.

Despliega **una sola instancia/réplica**, con disco persistente y HTTPS mediante tu proveedor o un proxy. El estado se guarda en `lists.json` por reemplazo atómico; el bloqueo y la limitación de frecuencia son por proceso. No uses varias réplicas compartiendo ese archivo. `/health` permite comprobar que el proceso responde. El backend no sirve archivos de datos ni credenciales. El script deja el servidor preparado para desplegar; no contrata hosting ni publica una instancia automáticamente.

### Activar en tu overlay local

```sh
npm run start -- --remote-lists
# O con el comando instalado:
wargaming-overlay start --remote-lists
```

En **Listas de ejército → Listas desde los teléfonos**, guarda la dirección del backend (por ejemplo `https://listas.ejemplo.com`) y la credencial del manager. La conexión se guarda en `remote-lists-config.json` dentro de la carpeta de datos, con permisos de archivo 0600 en sistemas que los soportan. La API local nunca devuelve la credencial guardada. También puedes configurar `REMOTE_LISTS_URL` y `REMOTE_LISTS_MANAGER_TOKEN` como variables del proceso local; al reiniciar, esas variables tienen prioridad sobre el archivo.

1. Copia el enlace azul o rojo y habilita la subida de ese lado.
2. El jugador pega el texto exportado de su app y pulsa **Subir lista**. El servidor analiza y guarda automáticamente el resultado; el jugador solo recibe la confirmación de éxito. No se asignan personajes a unidades por mera cercanía en el texto.
3. Pulsa **Sincronizar listas**: descarga y aplica inmediatamente las listas guardadas al lado correspondiente, incluyendo facción y destacamentos. Conserva el fondo local y reinicia los estados solo cuando llega una importación nueva. No hay un segundo botón de carga.

No sincroniza periódicamente ni necesita abrir puertos en tu Mac. Una lista cargada queda guardada localmente y funciona sin internet. Si la lista local o los jugadores cambian durante la descarga, rechaza la sincronización para no sobrescribirlos: guarda los cambios y vuelve a sincronizar. El panel también impide cargar mientras haya ediciones manuales pendientes. Cargar la misma importación de nuevo no reemplaza estados modificados durante la partida.

**Sin `--remote-lists` no aparecen estos controles, no se cargan credenciales remotas y no se conecta al backend.** El overlay continúa como antes. La prueba `--test-tts` y el backend remoto son funciones independientes.

### Límites de uso y gasto

- Subida cerrada: se rechaza antes de llamar al LLM. Solo el manager autenticado puede abrirla.
- Hasta 6000 caracteres de texto, una interpretación activa por lado, cupo de intentos por apertura .
- Una subida exitosa cierra el lado y bloquea nuevos envíos hasta que el manager lo habilite otra vez. Consultar y sincronizar no llaman al LLM.
- El modelo, el máximo de salida y el presupuesto los fija el servidor, no el jugador. No se habilitan herramientas, búsquedas ni ejecución de código en la llamada al modelo.
- Antes de cada llamada se reserva un límite conservador de tokens (bytes UTF-8 del payload completo, instrucciones, esquema, referencias, margen y máximo de salida). Ambas fases de la interpretación se descuentan por separado antes de enviarse. La reserva **no se devuelve**, incluso ante fallo, para no permitir que errores/reintentos eludan el límite. Es un cupo de tokens, no una medición exacta del gasto en dólares. No incluye uso de esa clave en otras aplicaciones.
- El presupuesto y los intentos se conservan al reiniciar. Abrir de nuevo reinicia el cupo del lado, pero no el presupuesto global. Para un evento nuevo usa una carpeta de datos nueva; no borres el estado durante una importación.
- Hasta 60 solicitudes públicas por minuto por IP; una sola instancia. Si estás detrás de un proxy sin la configuración de confianza, el límite puede compartirse entre todos los clientes del proxy.

Los enlaces son públicos: cualquiera que los conozca puede ocupar un turno mientras esté abierto. Estos controles acotan el gasto, pero no identifican al jugador. El manager puede corregir las listas desde su editor local después de sincronizar. Las llamadas del LLM se validan de nuevo en el servidor y los textos se muestran como texto, no como HTML.

La integración se prueba con un LLM simulado, incluyendo gasto, cierres, errores, persistencia y sincronización local. Se requiere una clave real y un hosting configurado para validar una importación con el modelo en producción.


## Equipo relevante, referencias de 11.ª y pruebas locales

El importador real tiene dos fases: extrae unidades y TODO el equipo declarado, identifica la facción y el nombre inglés de referencia, y luego compara las elecciones con las secciones WARGEAR OPTIONS y UNIT COMPOSITION de Wahapedia **exclusivamente en `/wh40k11ed/`**. Conserva en `notes` reemplazos, añadidos opcionales y elecciones entre alternativas (incluida una opción predeterminada cuando existen alternativas); omite equipo fijo sin alternativas. Mantiene las cantidades declaradas; las notas generadas se limitan a elecciones de equipo verificadas. No añade equipo ausente ni comprueba la legalidad de la lista.

Las fichas e índices se guardan en `REMOTE_LISTS_DATA_DIR/references-11`. Cada entrada caduca exactamente **7 días desde su descarga**; al necesitarla de nuevo se elimina la entrada vencida y se renueva. No hay renovación en segundo plano. Si la renovación falla, no se utiliza una referencia vencida ni una de 10.ª: deja vacías las notas de equipo que no puede verificar y muestra un aviso para revisión. Las unidades traducidas se buscan mediante el nombre canónico inglés que propone el modelo; si no hay coincidencia exacta, requieren revisión.

Se descargan como máximo 16 fichas distintas por importación, reutilizando fichas para unidades repetidas; el contexto de fuentes se limita a 24 KB. La descarga no usa búsquedas de OpenAI ni concede navegación libre al LLM. La segunda llamada, cuando hay referencias, utiliza solo los fragmentos pertinentes y su consumo se incluye en el cupo persistente de tokens. Si faltan referencias, se muestra un aviso en el manager al sincronizar y no se publica equipo sin verificar basándose en la memoria del modelo. Las notas del manager admiten 160 caracteres; el manager puede corregir los resúmenes en el editor local.

### Prueba completa sin clave ni gasto

Desde la raíz del repositorio, instala las dependencias con `npm ci`. Si aún no tienes `.env.dev`, créalo a partir de la plantilla (no sobrescribas uno existente):

```sh
cp remote-lists/.env.example .env.dev
```

Para probar solo en tu computadora, configura `REMOTE_LISTS_HOST=127.0.0.1` en ese archivo. Después abre dos terminales:

```sh
# Terminal 1: backend DEMO. Carga .env.dev, pero no usa su clave OpenAI.
npm run dev:remote-lists

# Terminal 2: tu overlay local habitual, con los nuevos controles.
npm run start -- --remote-lists
```

1. Abre `http://127.0.0.1:8765` y entra en **Listas de ejército**.
2. Guarda la conexión `http://127.0.0.1:8080` y el valor `REMOTE_LISTS_MANAGER_TOKEN` de `.env.dev`. Si está vacío, el script demo usa `demo-manager-token-local-only`. Solo es una credencial de prueba: para producción configura una propia de al menos 24 caracteres.
3. Pulsa **Habilitar subida azul**. Abre `http://127.0.0.1:8080/blue` en otra pestaña; para rojo usa `/red` y habilita ese lado.
4. Pega `remote-lists/examples/demo-list.txt`. Pulsa **Subir lista** y espera el mensaje de éxito.
5. Vuelve al panel: pulsa **Sincronizar listas**. Abre la lista para OBS y comprueba nombres y comentarios.

El modo demo está identificado en la página y devuelve una respuesta predefinida. Prueba análisis, guardado automático, cierre y sincronización; **no demuestra la calidad de la interpretación ni consulta fichas reales**. `npm run dev:remote-lists` fuerza el modo demo aunque `.env.dev` diga `REMOTE_LISTS_DEMO=false`.

### Prueba real con OpenAI y Wahapedia

Detén el backend demo. En `.env.dev`, sustituye `OPENAI_API_KEY` por tu clave, configura la credencial del manager y deja `REMOTE_LISTS_DEMO=false`. Inicia:

```sh
node --env-file=.env.dev remote-lists/start.js
```

Repite el mismo flujo con una lista real de 11.ª. Esta prueba sí usa internet y consume tokens. Usa una clave con permisos de escritura para Responses API y acceso al modelo. Si falta una ficha o Wahapedia no responde, el resultado mostrará qué equipo necesita revisión. El coste y la calidad reales del LLM no se han verificado sin una clave real.

### Probar desde un teléfono físico

Teléfono y Mac deben estar en la misma Wi-Fi. Cambia `REMOTE_LISTS_HOST=0.0.0.0` en `.env.dev`, reinicia el backend y abre en el teléfono `http://IP_LOCAL_DEL_MAC:8080/blue` o `/red`. Puedes consultar la IP en los ajustes de Wi-Fi de macOS. El panel local sigue conectándose a `http://127.0.0.1:8080`; sus enlaces localhost deben sustituirse por la IP del Mac para esta prueba. Si macOS pide permiso para conexiones entrantes de Node, habilítalo para la prueba. No requiere abrir puertos del router. HTTP y credenciales ficticias son solo para desarrollo; en hosting usa HTTPS.

La página funciona en teléfono y computadora, con entradas de 16 px y botones de al menos 44 px. El jugador pega el texto y pulsa **Subir lista**: aparece un indicador de carga y, al guardar, únicamente el mensaje de éxito. Si falla, conserva el texto para reintentar. No hay vista previa, editor ni paso de confirmación.

### Verificación automática

```sh
npm test
node --test test/wargear-references.test.js test/remote-lists.test.js
```

Las pruebas verifican caducidad exacta a los siete días, rechazo de referencias/redirects de 10.ª, omisión del equipo sin referencia, aceptación de fichas sin opciones, exclusión del equipo fijo y comparación con índices de unidades y cobro de ambas fases antes de enviar peticiones. También comprueban presupuestos, autenticación del manager, subidas cerradas, persistencia, guardado automático y protección de listas locales.

### Facción, destacamentos, líderes y notas

El prompt recibe el catálogo de facciones del manager. La facción y los destacamentos se extraen automáticamente y al sincronizar se asignan al jugador correspondiente. El manager puede corregirlos en su panel. Si no se pudo identificar un dato, no se inventa. Para listas confirmadas antes de esta función, vuelve a subir la lista para incorporar esos campos.

Los personajes con una asignación explícita se incorporan a `characters` de la unidad liderada y se muestran juntos en una tarjeta, conservando mejoras y notas. El título muestra todos los líderes y apoyos unidos por «+», y debajo aparece el nombre de la unidad liderada. Si la exportación no declara la asignación, los personajes se conservan separados y el manager puede asignarlos en su editor local. No se deduce la asociación por proximidad en el texto.

Las notas generadas usan cantidades y nombres breves, un elemento por línea, con un máximo total de 160 caracteres. El overlay presenta cada línea como un bullet; también admite notas antiguas separadas por punto y coma. Si las notas combinadas de un líder y su unidad exceden el límite, el resultado se recorta y muestra un aviso para revisión.

La página del jugador muestra un indicador de carga durante el análisis, lo retira tanto al terminar como ante un error y mantiene el botón deshabilitado para evitar envíos duplicados.

### Evitar equipo obligatorio en los comentarios

La extracción inicial conserva el equipo declarado internamente en `wargear`, pero deja `notes` vacío. Las fichas de 11.ª con UNIT COMPOSITION y sin WARGEAR OPTIONS se aceptan como equipo fijo: no generan notas ni necesitan una segunda llamada al LLM. Esto también se aplica a los líderes y apoyos antes de agruparlos con su unidad. Por ejemplo, las armas obligatorias de Belisarius Cawl y Cybernetica Datasmith no aparecen en el overlay.

Solo las fichas con opciones pasan a la comparación de elecciones. Si falta una ficha, caduca y no se puede renovar, o falta un resultado de comparación, las notas permanecen vacías y aparece un aviso en el manager al sincronizar. No se usa el listado completo de armas como respaldo. Las listas ya confirmadas no se reescriben: después de desplegar el backend actualizado, habilita la subida y vuelve a subir y sincronizar la lista.

Las apariciones repetidas de la misma arma se suman antes de comparar las elecciones (dos líneas `1x Heavy reaper autocannon` se convierten en `2× Heavy reaper autocannon`). Las cantidades del resumen se contrastan con ese inventario; los calificadores de miniatura se mantienen separados. La comparación recibe también el texto original para comprobar la extracción y debe incluir las armas predeterminadas reemplazables, no solo las sustituciones.

La pantalla de listas llena las columnas de arriba abajo, empezando por la izquierda; pasa a la siguiente cuando ya no cabe otra tarjeta completa. Mantiene cada grupo unido y ajusta la tipografía para mostrar la lista completa.

El orden visual predeterminado es: personajes épicos, personajes, unidades lideradas, unidades restantes y, al final, vehículos y monstruos. Dentro de cada categoría se conserva el orden original. Las unidades con líderes o apoyos asignados se muestran como grupo liderado. El importador genera `category` (`epic_character`, `character`, `unit`, `vehicle`, `monster`) y el manager permite cambiarla en **Tipo de unidad**. Las listas antiguas sin categoría usan un catálogo de compatibilidad con nombres verificados de Death Guard y Adeptus Mechanicus; las unidades desconocidas se consideran normales hasta volver a importarlas o asignar su tipo en el editor. El orden guardado del JSON no cambia.

### Cambios de la versión 3.1.0

Listas remotas opcionales con subida en un paso, sincronización directa, facción y destacamentos automáticos, agrupación de líderes y apoyos, referencias de 11.ª con caché de siete días y notas limitadas a elecciones de equipo. Conserva cantidades repetidas, omite equipo obligatorio o sin verificar y controla el consumo del backend. Las listas se distribuyen llenando primero la izquierda y se ordenan por personajes épicos, personajes, unidades lideradas, otras unidades y vehículos/monstruos. Incluye edición de estados desde el overlay.

En Railway configura `ONNXRUNTIME_NODE_INSTALL=skip` para evitar descargar componentes GPU del TTS que el backend de listas no utiliza.

Los bloques explícitos `Attached unit N` con `Attached as: Leader`, `Support` y `Bodyguard` se contrastan con el texto original. Cuando los nombres corresponden a unidades extraídas y hay un único Bodyguard, el servidor aplica esas asociaciones sin depender de los índices propuestos por el LLM. Admite varios líderes o apoyos en el mismo bloque.

Si una importación devuelve 502, los logs del backend incluyen `list_import_failed` con `phase`, `reason` y, para fallos HTTP del proveedor, `upstreamStatus`; no incluyen la lista, claves ni el contenido de la respuesta del modelo. `output_limit` indica que la respuesta excedió `REMOTE_LISTS_MAX_OUTPUT_TOKENS`; `grouping` indica una asignación inválida y `comparison` un fallo al resumir equipo.

Cuando la ficha descargada incluye keywords identificables, su categoría prevalece sobre la propuesta del LLM: EPIC HERO, después CHARACTER, después VEHICLE/MONSTER. Los grupos liderados conservan su posición después de los personajes independientes.

## Aplicación de escritorio (macOS)

El subproyecto `desktop/` ofrece un lanzador gráfico independiente de la CLI. Guarda puerto, intervalo, dispositivo, rutas, opciones de listas remotas y TTS; permite iniciar/detener, consultar teléfonos, conectar por Wi-Fi, comprobar la conexión, probar voz, autorizar YouTube y abrir el panel. Impide dos instancias de la app y rechaza puertos ocupados. Al cerrar la ventana detiene el servidor que inició; no detiene servidores de la CLI.

La distribución inicial es para macOS Apple Silicon. Incluye Electron/Node, Python portátil y Android Platform-Tools: no requiere instalar Node, Python ni ADB. Descomprime el ZIP y arrastra **Wargaming Overlay.app** a Aplicaciones. En las opciones avanzadas puedes elegir otras rutas. Los datos del overlay permanecen en su carpeta habitual; el lanzador guarda sus opciones por separado y cifra la credencial del manager con el almacenamiento seguro del sistema. La depuración USB/inalámbrica y la autorización del teléfono siguen siendo necesarias. Para Wi-Fi utiliza la dirección de depuración ya autorizada por ADB; el botón no sustituye el emparejamiento inicial de Android.

1. Abre la app, conecta y autoriza el teléfono.
2. Selecciona el dispositivo o deja selección automática; pulsa **Comprobar conexión**.
3. Activa las funciones opcionales que utilices y pulsa **Iniciar servidor**.
4. Pulsa **Abrir panel**. Las fuentes OBS siguen usando las mismas URLs locales.
5. Pulsa **Detener** al finalizar. La configuración se conserva para la siguiente sesión.

La app inicial se genera sin certificado de firma/notarización para distribución pública. Windows y Linux tienen base de interfaz y ZIP configurados, pero aún no se han generado ni probado sus instaladores/runtimes. El comando npm continúa disponible sin Electron como dependencia del paquete CLI.

### Construir desde el repositorio

Con Node 22+ y macOS:

```sh
npm ci
node desktop/scripts/prepare-package.js
npm --prefix desktop run prepare:runtimes
npm run desktop:make
```

Los scripts previos al empaquetado regeneran el runtime desde `npm pack`, usando únicamente los archivos públicos del paquete. `desktop/out/` contiene la app y el ZIP. `desktop/runtimes/` contiene Python y ADB descargados para la arquitectura de la máquina y un manifiesto de procedencia/checksums; no se versiona. Python proviene de python-build-standalone de Astral y ADB de Google. Los runtimes conservan sus avisos/licencias. Para un DMG, en un entorno que permita montar imágenes: `npm --prefix desktop run make:dmg`. Para desarrollo: `npm run desktop:start` después de preparar el runtime (`npm --prefix desktop run prepare:runtime`) y los runtimes externos.

Las pruebas del lanzador cubren validación de opciones, puerto ocupado, argumentos sin shell, opciones desactivadas, doble inicio y parada. La validación de distribución debe incluir también arrancar la app empaquetada y comprobar su servidor HTTP. Puedes aislar la configuración del lanzador para pruebas con `OVERLAY_LAUNCHER_USER_DATA_DIR`; configura además una carpeta de datos y puerto separados antes de iniciar el servidor.

### Actualizar estadísticas y opciones desde la app

El botón **Actualizar datos de ListHammer** descarga una copia completa y confirma el período y número de facciones. Funciona con el servidor detenido o activo; cuando está activo actualiza también su caché sin reiniciarlo. Si falla, se conserva la copia anterior.

**Guardar opciones** guarda la configuración para el próximo inicio; no cambia el servidor que está ejecutándose. Detén e inicia el servidor para aplicar cambios de voz o conexión. Las listas y datos persistidos se conservan; las conexiones y mensajes pendientes de TTS se interrumpen durante el reinicio.

En macOS Kokoro reproduce mediante `afplay`, incluido en el sistema, usando la salida predeterminada. La prueba muestra el error y el respaldo utilizado si Kokoro falla, incluso cuando `say` completa la lectura.

Si Kokoro falla después de iniciar la reproducción, informa del error y no repite todo el mensaje con `say`; el respaldo se usa para fallos anteriores a la reproducción.

### Panel por jugador y posición

El panel tiene las pestañas **Partida**, **Jugador Azul** y **Jugador Rojo**. Cada jugador reúne su nombre, alias de Tabletop Battles, facción, disposición, destacamentos y lista. Guarda sus datos con **Guardar datos del jugador**; la lista mantiene el guardado automático.

En Partida se indica quién ocupa izquierda y derecha. **Intercambiar posiciones** mueve ambos jugadores conservando sus colores, listas y marcadores. Los enlaces `army-list.html?side=blue` y `side=red`, y las subidas remotas, siguen al color aunque cambie de lado. **Abrir overlay principal** abre una pestaña nueva.

El botón amarillo **Abrir overlay principal** está en la cabecera. Las pestañas de jugadores usan sus nombres y colores; Partida muestra una tarjeta por posición.

La página pública pide **Tu nombre** además de la lista. Al sincronizar se actualizan tanto el nombre visible como el nombre en Tabletop Battles con ese mismo valor, junto a facción, destacamentos y disposición declarada. Si la lista no contiene disposición, se conserva la actual. Los nombres de lista y jugador son campos distintos. Para habilitar este formulario hay que desplegar también la nueva versión del backend remoto (no basta con actualizar la app local).

### Recepción automática de listas

Con listas remotas activadas en el GUI, el servidor local consulta el backend cada cinco segundos, incluso sin el panel abierto. Al recibir una lista la aplica al jugador de su color, con nombre, alias, facción, destacamentos y disposición. Cada importación se aplica una sola vez y los reintentos conservan los estados de las unidades. El backend cierra la subida al guardar una lista correctamente; solo el manager puede habilitarla de nuevo.

En cada pestaña del panel aparece un QR generado localmente: escanéalo o haz clic para abrir la subida en una pestaña nueva. Solo se muestran los controles para habilitar/deshabilitar subidas; la dirección del backend y su credencial se configuran desde el GUI. No hace falta pulsar Sincronizar.

### Auto play de listas

En **Partida → Auto play**, activa la presentación automática y elige la duración (15 segundos por defecto; de 1 a 120). Guarda con **Actualizar overlay**. Viene apagada.

Al detectar un cambio de ronda o de TOP/BOTTOM, el overlay principal muestra a pantalla completa la misma página de lista del jugador activo y después vuelve al overlay normal. Sigue la identidad y color del jugador aunque intercambies posiciones. Si el turno ya se conoce, la primera lectura al abrir o activar la opción solo establece el turno inicial. Si pasa de desconocido a TOP/BOTTOM, se muestra la lista al detectarlo; los cambios de puntos o CP no disparan la presentación. Requiere que ambos jugadores estén enlazados correctamente por nombre con Tabletop Battles y que se conozca quién juega primero. Desactivarla oculta inmediatamente la presentación.

### Galaxy como cámara y control independiente de Tabletop Battles

Nueva opción experimental **Galaxy: cámara y marcador** en el GUI, apagada por defecto, o `npm run galaxy -- --connect IP:PUERTO`. Abre ventanas distintas de control y cámara; el overlay conserva su fuente Navegador. Requiere scrcpy instalado aparte. Si Samsung no permite leer la pantalla virtual, el modo físico conserva el lector original y puede capturar la cámara directamente.

Consulta [configuración, OBS, reconexión y pruebas pendientes](docs/galaxy-session.md). No se validó un Galaxy físico durante el desarrollo; prueba la compatibilidad antes de usarlo en un evento.
