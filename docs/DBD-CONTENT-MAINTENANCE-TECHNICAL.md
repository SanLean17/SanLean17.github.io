# Mantenimiento de contenido DBD

Versión de prueba, rama `codex/dbd-content-catalogs`. No autoriza publicación ni activa Terrifier. No cambia estilos, cuentas, permisos, servicios remotos ni configuraciones de OBS.

## Fuentes de verdad

| Catálogo | Contenido | Imagen |
|---|---|---|
| `data/killers.json` | Personajes Killer | `image` obligatoria, en `assets/killers/` |
| `data/survivors.json` | Personajes Superviviente | `image` obligatoria, en `survivors/` |
| `data/perks-killer.json` | Perks Killer y slot vacío existente | `image` opcional; fallback `killer/{key}.png` |
| `data/perks-survivor.json` | Perks Superviviente y slot vacío existente | `image` opcional; fallback `survivor/{key}.png` |
| `data/perk-conflicts.json` | Grupos incompatibles por rol | No requiere incluir perks sin conflictos |

Los cuatro catálogos actuales se conservan sin reescritura: 44 Killers, 54 Supervivientes, 145 perks Killer y 176 perks Superviviente. Cada catálogo de perks incluye además su `slot_vacio`/`rombo.png`, que sigue disponible en ruletas y se excluye de Tierlist.

WEB, USUARIO y el programa local siguen siendo superficies independientes. Comparten el contrato `js/dbd-catalog.js`; el parche copia exactamente este archivo a `public/js/dbd-catalog.js`. El servidor local usa la misma implementación mediante CommonJS y `catalog-store.cjs`. No hay un catálogo alternativo que mantener.

## Objetos y valores por defecto

`key` y `name` son obligatorios. Las claves de personajes son estables, únicas dentro de su catálogo, minúsculas y sin espacios. Las perks conservan sus claves históricas con mayúsculas y prefijos numéricos; el prefijo numérico no puede repetirse, incluso con ceros iniciales diferentes. Nunca renumerar contenido existente.

| Campo | Tipo | Omisión |
|---|---|---|
| `enabled` | booleano JSON | `true` |
| `aliases` | texto o array de textos | `[]` |
| `image` en perks | ruta relativa | fallback por rol/key |
| `ownerKey` en perks | key exacta del personaje del mismo rol | sin vínculo nuevo; respaldo histórico de búsqueda |
| `updateId` | minúsculas/números separados por guiones, por ejemplo `capitulo-2026` | contenido anterior sin paquete |

Se admiten PNG y WebP. Las rutas son relativas a la raíz del sitio/contenido, con `/`, sin URL externa, `..`, enlaces simbólicos ni rutas de disco. El slot vacío conserva su excepción `rombo.png`.

## Preparar y activar

`enabled: false` excluye el objeto de ruletas, Tierlist, búsqueda, configuración, totales, challenges y presentación OBS. El validador igualmente exige datos e imágenes válidos para lo preparado. `enabled: true` lo habilita tras recargar la WEB/USUARIO o cerrar y abrir el programa local. No se cambia ningún número ni JavaScript. Cada objeto controla su habilitación: activar un capítulo significa activar todos sus objetos previstos.

La carga se comparte dentro de cada página. Una publicación no modifica a mitad de un giro la página ya abierta. Recargar al terminar la sesión; en local, cerrar antes de extraer el parche y volver a abrir.

## API compartida y búsqueda

`loadKillers()`, `loadSurvivors()`, `loadKillerPerks()`, `loadSurvivorPerks()` y `load(type)` devuelven sólo contenido activo. `prepare(items,type,{includeDisabled})` es la entrada para Node/pruebas. También se exponen `filterEnabled`, `normalizeAliases`, `normalizeSearch`, `resolveItemImage`, `validateItem`, `buildSearchText`, `matches`, `count` y `projectOverlay`.

La búsqueda incluye nombre, clave (también sus fragmentos), aliases y el nombre/key/aliases del propietario declarado. Acentos, capitalización, guiones, apóstrofes rectos o curvos y espacios repetidos se normalizan. Los propietarios se cargan antes de resolver búsquedas de perks. No se necesita repetir sus aliases en cada perk.

`projectOverlay` filtra copias guardadas de pools/resultados contra el catálogo activo sin escribir ni borrar el estado del propietario. Admite PNG y WebP en el renderizador.

## Compatibilidad y mapas históricos

Los mapas antiguos de `roulette.js`, `search-aliases.js`, `usuario.js` y búsquedas de challenges se mantienen como respaldo de contenido antiguo. Los datos declarados y `ownerKey` tienen prioridad. No se deben ampliar esos mapas para capítulos nuevos.

No se migraron automáticamente propietarios históricos: la auditoría detectó rangos incompatibles entre mapas (por ejemplo Wesker comienza en 96 en `usuario.js` y en 97 en `search-aliases.js`) y asociaciones tempranas de perks generales. Convertirlos ciegamente en `ownerKey` consolidaría errores. La migración futura requiere verificar cada asociación; la arquitectura nueva funciona sin ella. Los cuatro JSON permanecen equivalentes a la base en esta entrega.

Tierlist eliminó los arrays `killerFiles` y `survivorFiles`. Todas sus tarjetas se construyen con `type + '-' + key`; ordenarlas o insertar contenido no cambia la identidad. Su estado anterior era únicamente de la página, sin un formato persistido de índices que migrar.

Los challenges cuentan sólo personajes activos y consultan estados por key. Un personaje nuevo se muestra pendiente. La migración local conserva también el estado de personajes temporalmente deshabilitados, sin sumarlos al total. La ruleta agrega las entradas base faltantes conservando donaciones, opciones deshabilitadas e identificadores usados. Datos corruptos continúan provocando errores de validación; no se descartan para arrancar en blanco.

## Herramientas Windows

En la raíz del proyecto extraído, ejecutar con doble clic:

1. `VALIDAR CONTENIDO DBD.bat`: revisa JSON, objetos, claves, prefijos, tipos, rutas, imágenes (incluidas las preparadas), propietarios y conflictos. Muestra errores en español y devuelve código de salida distinto de cero si falla.
2. `CREAR PARCHE DE CONTENIDO STREAMER.bat`: valida, pide el ID, cuenta los objetos y assets asociados y crea `exports/SanLean-{updateId}-PATCH.zip`. Si el ID no existe o hay errores, no crea el ZIP. Si ya existe un ZIP del mismo ID, solicita conservarlo o moverlo antes de generar otro.

No requieren Git, VS Code ni instalar Node. Usan Windows PowerShell 5.1, incluido en Windows. Los `.bat` conservan la ventana abierta para leer el resultado. Para automatización se puede ejecutar `maintenance/dbd-content/ContentTools.ps1 -Mode Validate` o `-Mode Patch -UpdateId ...`, opcionalmente `-Root` y `-OutputDirectory`.

El parche de capítulo contiene los cuatro JSON completos, `perk-conflicts.json`, sólo los assets del `updateId` y `README-PATCH.txt`. No escanea ni copia datos del usuario. Nunca incluye `datos/`, progreso, preferencias, historial, sesión, respaldos, loaders ni AppData. Como los JSON son completos, generar desde una copia actualizada del proyecto; aplicar un parche viejo después de uno nuevo haría retroceder el catálogo.

## Parche inicial del programa local

`maintenance/dbd-content/Build-InitialPatch.ps1` genera `SanLean-Streamer-Tools-Catalog-System-PATCH.zip`. El origen comprobado es la instalación local 1.2.0 con sus mejoras de entradas, Killer y loaders; sus hashes de referencia están en `maintenance/dbd-content/streamer-baseline.json`.

Este primer parche contiene la arquitectura genérica, los catálogos actuales, sus assets existentes y las herramientas de mantenimiento. Cerrar el programa, hacer copia de seguridad, extraer encima de la carpeta que contiene el lanzador y aceptar reemplazos. Abrir y comprobar contenido/progreso. No ejecutar de nuevo el configurador de OBS ni cambiar sus escenas.

Desde ese momento el programa lee `data/` en su raíz. Las copias históricas que una instalación anterior conserve en `public/data/` quedan sin uso para estos cuatro catálogos y conflictos: no editarlas. Las rutas HTTP y las fuentes de OBS mantienen sus direcciones. El servidor sirve los recursos de contenido desde la raíz y mantiene el resto de recursos en `public/`. Los parches siguientes son únicamente assets + JSON + instrucciones.

## Archivos que no se editan para un capítulo normal

No editar HTML de ruletas, `roulette.js`, `search-aliases.js`, `tierlist-dbd.js`, `usuario.js`, controladores de challenges, renderizadores OBS, `application.cjs` ni `wheel-model.cjs`. Tampoco actualizar contadores, listas PNG, rangos ni loaders. Sólo los catálogos, assets y, si hay incompatibilidades nuevas, `perk-conflicts.json`.

## Plantillas y Terrifier

`maintenance/dbd-content/templates/` contiene cuatro plantillas con placeholders. `examples/terrifier/` contiene Art, Sienna y tres ejemplos de perks por rol, todos `enabled: false`, fuera de `data/`. Los datos del pedido son provisionales; las perks no especificadas tienen placeholders deliberados. No se crearon ni descargaron assets. Estos ejemplos no son catálogos listos para publicar y deben fallar si se copian sin completar.

Antes de publicar Terrifier: confirmar nombres españoles, claves definitivas, prefijos libres, las seis perks, archivos PNG/WebP reales y sus rutas; completar owners/aliases/updateId; validar preparado; revisar la versión de prueba; activar el conjunto; validar otra vez; autorizar la publicación y generar el parche correspondiente. El Word visual se hará después de aprobar la arquitectura y sus rutas.

## Pruebas reproducibles

- `node --test tests/dbd-catalog.test.cjs tests/dbd-maintenance.test.cjs tests/dbd-streamer-model.test.cjs`
- `node tests/dbd-catalog-browser.cjs`: fixtures separados de producción, falso/verdadero en las tres ruletas, cuatro Tierlist y ruletas privadas; búsqueda por key, idioma, alias y propietario; escritorio 1440 y móvil 390.
- `node tests/all-challenges.cjs`: ambos challenges, 44→45/54→55, progreso previo, nuevo pendiente, permisos, aislamiento de propietarios, recarga y 1440/390/320.
- `node tests/tierlist-interaction.cjs`: arrastre, scroll y selección móvil, incluidas las colecciones preexistentes, 320/390/740.
- `node tests/private-settings.cjs` y `node tests/killer-repeat-controller.cjs`: almacenamiento por cuenta y comportamiento de repetición.
- `node tests/dbd-streamer-package.cjs`: requiere `SANLEAN_LOCAL_SOURCE` y `SANLEAN_INITIAL_PATCH`; copia controlada del programa real, extracción de ambos tipos de ZIP, datos ficticios, mismos loaders, ambos órdenes de arranque, reconexión, dos escenas, sonido y escritorio/móvil. No modifica la instalación original ni AppData.

Las pruebas de navegador requieren Playwright para desarrollo/CI, no para el uso del validador ni del generador. CI de esta rama valida en Windows y no despliega Pages. La entrega incluye resultados y límites conocidos en `docs/DBD-CONTENT-REVIEW.md`.
