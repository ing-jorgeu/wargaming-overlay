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
| Node.js y npm | Node 20 o posterior; preferir una versión LTS mantenida. Ejecuta el CLI y servidor. npm viene con las instalaciones habituales de Node. | [Node.js](https://nodejs.org/en/download/) |
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
| `wargaming-overlay --help` | Muestra ayuda. |
| `wargaming-overlay --version` | Muestra versión. |

`setup --install-adb` usa Homebrew, WinGet, apt-get, dnf o pacman según la plataforma. No instala Node, Python ni gestores de paquetes; no activa opciones de Android, no acepta autorizaciones USB ni acuerdos por ti. Puede pedir permisos del sistema. Si termina instalando pero todavía no detecta ADB, abre otra terminal y ejecuta `doctor`.

`doctor` y `setup` devuelven código 1 si el diagnóstico no está listo, incluso si solo falta conectar el teléfono. Con ADB/Python instalados, `start` conserva el panel abierto y reintenta aunque falte el teléfono.

### Opciones

| Opción | Valor predeterminado | Uso |
| --- | --- | --- |
| `--port` | `8765` | Puerto de `start`, entero entre 1024 y 65535. |
| `--interval` | `3` | Pausa entre lecturas de `start`, entre 1 y 60 segundos. Se suma al tiempo de captura. |
| `--serial` | Selección automática si hay uno | Dispositivo para `start`, `doctor` o `setup`. |
| `--adb` | Autodetección | Ruta al ejecutable ADB para `start`, `doctor` o `setup`. |
| `--python` | Autodetección | Ruta al ejecutable Python para `start`, `doctor` o `setup`. |
| `--data-dir` | Según el sistema | Carpeta de datos para `start` y destino de `migrate`. |

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

Al cambiar de ronda no reutiliza CP ni misiones de la ronda anterior. Si consultas una ronda histórica en el teléfono, mostrará esa ronda. TOP/BOTTOM se infiere automáticamente al observar aumentos de puntuación o cambios de objetivos previamente leídos. No requiere seleccionar el turno en el panel. El orden se aprende a partir de la primera actividad observada tras una ronda nueva, o desde una partida observada en ronda 1 con ambos marcadores en cero. Si conectas a mitad de partida, puede quedar sin indicar hasta la siguiente ronda. La detección se guarda al reiniciar y es independiente del intercambio de lados. Es una estimación: puntos registrados fuera de turno o correcciones al alza pueden confundirla. No interpreta misiones que aparecen por primera vez al desplazar la pantalla como cartas recién robadas. Bajar puntos o gastar CP no cambia el turno; cambios simultáneos en ambos jugadores lo conservan. El nombre general de la primaria no siempre está expuesto; se muestran sus condiciones de puntuación.

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

La matriz de `.github/workflows/test.yml` está preparada para Node 20/22/24 en Windows, macOS y Linux. Las pruebas cubren diagnósticos, rutas, selección de instaladores, parser y estado guardado. No sustituyen las pruebas físicas de USB ni de emisión con OBS.

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
