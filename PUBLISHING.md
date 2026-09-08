# Preparación para npm

La versión 2.1.0 está empaquetada para distribución, pero NO se ha publicado ni instalado globalmente en el equipo del usuario.

## Pendiente de decidir

- Nombre elegido: `@ing.jorgeu/wargaming-overlay`. Publicar con la cuenta npm `ing.jorgeu`, confirmada por el titular.
- Licencia del código resuelta: **0BSD**, seleccionada por el usuario. Permite uso comercial, modificación y redistribución sin atribución obligatoria. Las imágenes requieren revisión por separado.
- Revisar la procedencia y permiso de redistribución de los recursos visuales; ver `THIRD_PARTY_ASSETS.md`.
- Añadir `repository`, `homepage`, `bugs` y `author` cuando se conozcan. No se han inventado datos personales ni URLs.
- Ejecutar el workflow de GitHub Actions en las tres plataformas y probar USB real en Windows y Linux. Aquí solo se validó macOS físicamente; las ramas de otras plataformas se prueban con escenarios simulados.

## Primera publicación manual

Desde la raíz del proyecto, ya con las decisiones anteriores resueltas:

```sh
npm test
npm pack --dry-run
npm login
npm whoami
npm view @ing.jorgeu/wargaming-overlay name version
npm publish --dry-run
npm publish --access public
```

Si el nombre existe y no eres su propietario, cambia `name` a `@tu-scope/wargaming-overlay` (sustituyendo el ejemplo por un scope real). Consulta el nombre elegido con `npm view` antes de publicar. Un 404 puede significar que el nombre no existe; otros errores no prueban disponibilidad. Usa una versión nueva si ya fue publicada.

El último comando publica realmente. No se ha ejecutado. La autenticación y la verificación de npm deben completarse en tu sesión; no guardes tokens en el repositorio.

`prepublishOnly` ejecuta las pruebas. `files` limita el paquete a código, interfaz y documentación; no incluye estado personal, backups, pruebas ni workflows. No hay scripts de instalación automáticos. ADB se instala únicamente al invocar `setup --install-adb`.

Para releases posteriores se puede configurar Trusted Publishing con GitHub Actions desde la configuración del paquete en npm. No se ha creado un workflow de publicación con repositorio o identidad inventados.

Fuentes oficiales: [npm publish](https://docs.npmjs.com/cli/v7/commands/npm-publish/), [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/).
