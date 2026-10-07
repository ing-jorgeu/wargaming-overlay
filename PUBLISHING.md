# Publicación de releases

Paquete: `@ing.jorgeu/wargaming-overlay`, cuenta npm `ing.jorgeu`. Repositorio: https://github.com/ing-jorgeu/wargaming-overlay. Código bajo 0BSD; las notas de recursos visuales están en `THIRD_PARTY_ASSETS.md`.

Desde la raíz del repositorio:

```sh
npm ci
npm version 2.5.0 --no-git-tag-version
npm test
npm pack --dry-run
npm login
npm whoami
npm publish --dry-run
```

Usa una versión nueva en cada release. Revisa el diff, crea el commit y súbelo a `origin/main` antes de publicar. Después:

```sh
npm publish --access public
npm view @ing.jorgeu/wargaming-overlay version
```

`prepublishOnly` ejecuta las pruebas. npm puede pedir autorización en el navegador tanto para login como para publicar; no guardes tokens en el repositorio. Confirma que el registro muestra la versión esperada y que el commit está en remoto.

`files` limita el paquete a código, interfaz y documentación. No incluye Excel de investigación, credenciales OAuth, estados de partidas, pruebas ni workflows. Las dependencias de gRPC se instalan por npm; no hay scripts de instalación propios. ADB se instala únicamente al invocar `setup --install-adb`.

Las pruebas automatizadas cubren el transporte gRPC local, OAuth simulado y continuidad del overlay ante errores. El acceso real a la API del canal ya se verificó; la recepción de mensajes de un directo y el cambio físico de salida de audio siguen requiriendo una prueba real. Windows/Linux no usan el TTS nativo de macOS.
