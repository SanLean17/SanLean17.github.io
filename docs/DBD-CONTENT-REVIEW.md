# Entrega de prueba — mantenimiento DBD

Base: `43b6e5226cbb0382f2d58e5fc88187519eb1ebfe`, repositorio real `SanLean17/SanLean17.github.io`. Rama: `codex/dbd-content-catalogs`. No se mezcló a main ni se desplegó. Terrifier permanece únicamente como ejemplo aislado.

## Resultado

Un capítulo normal se incorpora mediante assets y objetos JSON. El filtro `enabled`, búsqueda por aliases/propietario, rutas y totales se comparten entre WEB, USUARIO y el programa local. Se eliminaron los dos arrays manuales de retratos de Tierlist y sus IDs por índice. Ningún CSS ni catálogo activo existente fue modificado.

La entrega contiene el parche inicial del programa y una copia completa limpia para probar, con los cuatro catálogos vigentes. Los fixtures no se incluyen en los catálogos de esos entregables. El parche de capítulo se generó y extrajo durante QA con ocho assets de prueba reutilizados, sin crear material de Terrifier.

## Evidencia local aprobada

| Prueba | Resultado |
|---|---|
| Contrato, omisiones, aliases, propietario, PNG/WebP, carga/reintento | 6 pruebas del módulo aprobadas |
| Validador Windows 5.1 y ZIP | JSON roto; keys/prefijos duplicados; tipos; aliases; updateId; owner; rutas; extensiones; assets; conflictos; ID inexistente; rechazo de reemplazo; 14 archivos, 8 assets, ningún dato privado |
| Migración de modelos locales | Progreso por key, pendiente nuevo, 44→45 y 54→55, donaciones, estados/entradas usadas, preferencias, historial y una sola carpeta datos; ocultar y reactivar conserva progreso |
| WEB + USUARIO | Fixtures desactivados/activados en tres ruletas, cuatro Tierlist, ruletas privadas; búsquedas por nombre/key/alias/propietario; 1440 y 390 px |
| All Challenges privados | Ambos roles, activación con progreso anterior, permisos por propietario, cambio de espacio, recarga, fallos y reintento; 1440, 390 y 320 px |
| Tierlist | Arrastre, scroll de bordes, selección móvil y cinco colecciones; 320, 390 y 740 px; regresión de Halloween incluida |
| Configuración privada | Aislamiento por cuenta, retención tras fallo y guardado serializado |
| Ruleta privada | Repeticiones, 30 salidas únicas, agotamiento, reinicio y duración |
| ZIP sobre programa real copiado | Parche inicial + capítulo preparado + mismo capítulo activo; catálogos, contadores y búsqueda; donaciones y preferencias conservadas; escritorio 1366 y móvil 390 |
| Loaders OBS existentes | Los 7 archivos de entrada funcionan sin modificarse; ambos órdenes de arranque; cierre transparente; reconexión; dos vistas sincronizadas; URLs intactas |
| Audio local | AudioContext running; 74 ticks observados en un giro; una sola voz por evento; entradas usadas conservadas tras reinicio |

Las pruebas de loaders utilizan el navegador Chromium con los archivos locales originales y su handshake, conexión y audio reales. No se abrieron ni reconfiguraron las escenas personales de OBS. Los perfiles de prueba contienen únicamente datos ficticios. La instalación original permanece intacta.

## Riesgos y límites comprobados

- La prueba antigua `tests/roulette-bits-ui.cjs` falla en la primera comprobación de los 40 cambios rápidos (`aria-pressed: false` frente a `true`). Se reprodujo el mismo fallo en la base `43b6e52`, sin estos cambios. No se presenta como aprobada ni se modificó el comportamiento de BITS fuera del alcance. Sus operaciones reales de Twitch no se ejecutaron.
- No se convirtieron rangos históricos dudosos en `ownerKey`; se conserva su respaldo de búsqueda. El nuevo contenido sí usa los vínculos JSON.
- Los catálogos se recargan al abrir la página o reiniciar el programa. Extraer parches con el programa cerrado y conservar una copia de seguridad.
- Los parches contienen catálogos completos; generar siempre desde la versión más reciente. Las copias viejas de catálogos en `public/data` quedan inactivas después del parche inicial.
- La migración se comprobó contra la versión local final encontrada (1.2.0 con sus mejoras posteriores), no contra instalaciones desconocidas o alteradas manualmente.

## Uso de los entregables

Para revisar sin intervenir la instalación habitual: extraer `SanLean-Streamer-Tools-Catalogos-PRUEBA.zip` en otra carpeta, cerrar el programa habitual y ejecutar el lanzador incluido. Comparte el puerto habitual 4175; no abrir las dos copias a la vez. Esta copia empieza sin progreso personal.

Para actualizar una copia de la instalación existente: cerrar, respaldar y extraer `SanLean-Streamer-Tools-Catalog-System-PATCH.zip` encima de la carpeta del lanzador. No volver a configurar OBS. El README incluido explica el orden.

Validador: doble clic en `VALIDAR CONTENIDO DBD.bat`. Generador: doble clic en `CREAR PARCHE DE CONTENIDO STREAMER.bat`, escribir el `updateId` y revisar `exports/`. No requieren instalar Node, Git ni VS Code.

Antes de Terrifier faltan los datos y assets reales confirmados de lanzamiento, completar los placeholders, validar, revisar y autorizar la publicación. No se preparó el Word final.

La especificación completa, esquema, API y procedimiento de mantenimiento están en [DBD-CONTENT-MAINTENANCE-TECHNICAL.md](DBD-CONTENT-MAINTENANCE-TECHNICAL.md).

## Archivos creados

- `.github/workflows/dbd-content.yml`
- `.gitignore`
- `CREAR PARCHE DE CONTENIDO STREAMER.bat`
- `VALIDAR CONTENIDO DBD.bat`
- `docs/DBD-CONTENT-MAINTENANCE-TECHNICAL.md`
- `docs/DBD-CONTENT-REVIEW.md`
- `js/dbd-catalog.js`
- `maintenance/dbd-content/Build-InitialPatch.ps1`
- `maintenance/dbd-content/Build-ReviewPackage.ps1`
- `maintenance/dbd-content/ContentTools.ps1`
- `maintenance/dbd-content/README.md`
- `maintenance/dbd-content/examples/terrifier/LEER-ANTES.txt`
- `maintenance/dbd-content/examples/terrifier/killers.json`
- `maintenance/dbd-content/examples/terrifier/perks-killer.json`
- `maintenance/dbd-content/examples/terrifier/perks-survivor.json`
- `maintenance/dbd-content/examples/terrifier/survivors.json`
- `maintenance/dbd-content/streamer-baseline.json`
- `maintenance/dbd-content/streamer-runtime/application.cjs`
- `maintenance/dbd-content/streamer-runtime/catalog-store.cjs`
- `maintenance/dbd-content/streamer-runtime/challenge-model.cjs`
- `maintenance/dbd-content/streamer-runtime/counter-model.cjs`
- `maintenance/dbd-content/streamer-runtime/disk-store.cjs`
- `maintenance/dbd-content/streamer-runtime/public/control.html`
- `maintenance/dbd-content/streamer-runtime/public/counter-overlay.html`
- `maintenance/dbd-content/streamer-runtime/public/js/challenge-roster-view.js`
- `maintenance/dbd-content/streamer-runtime/public/js/control.js`
- `maintenance/dbd-content/streamer-runtime/public/js/counter-overlay.js`
- `maintenance/dbd-content/streamer-runtime/public/js/counters.js`
- `maintenance/dbd-content/streamer-runtime/public/js/roulette-entries.js`
- `maintenance/dbd-content/streamer-runtime/public/js/roulette-view.js`
- `maintenance/dbd-content/streamer-runtime/public/js/tools.js`
- `maintenance/dbd-content/streamer-runtime/public/js/wheel-overlay.js`
- `maintenance/dbd-content/streamer-runtime/public/overlay.html`
- `maintenance/dbd-content/streamer-runtime/public/wheel-overlay.html`
- `maintenance/dbd-content/streamer-runtime/server.cjs`
- `maintenance/dbd-content/streamer-runtime/spin-sequence.cjs`
- `maintenance/dbd-content/streamer-runtime/wheel-model.cjs`
- `maintenance/dbd-content/templates/killer-perk-template.json`
- `maintenance/dbd-content/templates/killer-template.json`
- `maintenance/dbd-content/templates/survivor-perk-template.json`
- `maintenance/dbd-content/templates/survivor-template.json`
- `tests/dbd-catalog-browser.cjs`
- `tests/dbd-catalog.test.cjs`
- `tests/dbd-content-support.cjs`
- `tests/dbd-maintenance.test.cjs`
- `tests/dbd-streamer-model.test.cjs`
- `tests/dbd-streamer-package.cjs`
- `tests/fixtures/dbd-content/chapter.json`

## Archivos modificados

- `1vs1.html`
- `Usuario/challenge-simulation.html`
- `Usuario/index.html`
- `Usuario/overlay.html`
- `aviso-legal.html`
- `contacto.html`
- `creditos.html`
- `halloween.html`
- `index.html`
- `js/challenge-roster-view.js`
- `js/main.js`
- `js/roulette-view.js`
- `js/roulette.js`
- `js/search-aliases.js`
- `js/stream-overlay.js`
- `js/stream-tools.js`
- `js/tierlist-dbd.js`
- `js/usuario-all-killer-challenge.js`
- `js/usuario-bits.js`
- `js/usuario-desafios.js`
- `js/usuario-roulettes.js`
- `js/usuario-votacion.js`
- `js/usuario.js`
- `ruleta-killer.html`
- `ruleta-perks-killer.html`
- `ruleta-perks-superviviente.html`
- `ruleta-perks.html`
- `tests/all-challenges.cjs`
- `tests/roulette-harness.cjs`
- `tierlist-dbd.html`
- `tierlist-halloween.html`

Las páginas públicas auxiliares sólo cambian la versión de caché de main.js; el diseño y contenido permanecen iguales.
