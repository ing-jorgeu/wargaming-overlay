# Publicación de releases

Paquete: `@ing.jorgeu/wargaming-overlay`, cuenta npm `ing.jorgeu`. Repositorio: https://github.com/ing-jorgeu/wargaming-overlay. Código bajo 0BSD; las notas de recursos visuales están en `THIRD_PARTY_ASSETS.md`.

Desde la raíz del repositorio:

```sh
npm ci
npm version minor --no-git-tag-version
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

## Backend de listas y validación del release

El paquete incluye el backend opcional de listas, la página adaptable para jugadores y la plantilla `remote-lists/.env.example`. Publicar en npm no despliega ese backend: se ejecuta por separado con `npm run start:remote-lists`. El overlay lo utiliza únicamente al iniciarse con `--remote-lists`.

Antes del release, sigue las pruebas locales del README: primero el flujo demo sin gasto y después, si tienes credenciales, una importación real. `npm test` valida el flujo con un LLM simulado; no acredita por sí solo la calidad ni el coste de respuestas reales. Revisa en `npm pack --dry-run` que se incluyan `remote-lists` y `public/remote-lists-control.js`, y que no haya `.env.dev`, credenciales, datos de partidas ni cachés.

Para desplegar el backend utiliza Node 22+, una sola réplica, HTTPS y un volumen persistente indicado por `REMOTE_LISTS_DATA_DIR`. Configura `OPENAI_API_KEY`, una credencial propia del manager y `REMOTE_LISTS_DEMO=false` en las variables del hosting. La caché de referencias de 11.ª caduca a los siete días. La configuración local y el presupuesto persistente no se publican con el paquete.
