# Auditoría de publicación y futuras actualizaciones DBD

## Causa exacta del PR #11

El run [40949923635](https://github.com/SanLean17/SanLean17.github.io/actions/runs/40949923635) falló en **Test shared model, errors, ZIP contents and local progress migration**. La validación previa de catálogos/assets sí pasó: 43 Killers activos, uno desactivado, 54 Survivors, 146 perks Killer y 177 perks Survivor.

Tres aserciones heredadas suponían que todo el catálogo siempre estaba activo:

1. `dbd-catalog.test.cjs`: comparaba la longitud filtrada (43) con los 44 registros históricos.
2. El escenario staged del mismo archivo volvía a usar 44 como cantidad activa.
3. `dbd-streamer-model.test.cjs`: intentaba agregar una donación a `trapper`, aunque ese PR lo desactiva explícitamente; el modelo rechazaba correctamente la opción.

No falló el JSON, el ZIP, la conexión, la creación del PR ni la migración de progreso. PR #10 no mostraba estas aserciones fallidas porque Trampero permanecía activo. Se corrigieron los tests para distinguir catálogo completo y activo, elegir identidades activas y comprobar explícitamente la conservación del progreso oculto. Se mantuvieron las pruebas, sin omitirlas.

La primera corrección produjo el commit `a8512a2099f20c67aec43c22422924cb2e43399b`. Aunque GitHub marcó success al run 40959281931, la inspección completa del log descubrió un timeout anterior de navegador: PowerShell había propagado sólo el resultado del último comando. El workflow ahora ejecuta cada comando en un paso separado; las pruebas de navegador también usan las cantidades activas. Ese success intermedio no se considera la validación final.

Al incorporar toda la regresión del Gestor a PR #11, el run 40965776716 detectó una expectativa adicional de `dbd-manager-v2.test.cjs`: exigía cuatro catálogos modificados aun cuando tres ya estaban normalizados y no cambiaban. La prueba ahora contrasta los hashes del archivo original y preparado, exige Killers entre los cambios y verifica que el manifiesto incluya exactamente los archivos modificados. El ZIP del formato anterior se comprueba por separado como paquete completo y sin datos personales; el parche actual V4 aplica sólo su delta sobre el catálogo instalado.

La revisión de todas las ejecuciones, incluidas push y pull_request, detectó además un fallo intermitente real en `js/search-aliases.js`: su carga asíncrona enriquecía siempre `#cfgGrid` con perks de Killer, también en la página de Superviviente. Si terminaba después de construir la grilla, reemplazaba el índice de búsqueda con el propietario del rol incorrecto. Cada grilla carga ahora su propio rol. Una prueba de carga tardía con keys idénticas entre roles impide que reaparezca; las pruebas del navegador también retrasan deliberadamente la respuesta del catálogo Killer.

## Cambios del sistema

- `publication.cjs`, `server.cjs`, `ui/app.js`, `ui/publication-view.js`: fases reales, duración congelada, diagnóstico de CI, reintento explícito, consultas secuenciales, vigilancia ligera de PR/main, conexión automática y protección de producción.
- `corrections.cjs`, `catalog-admin.cjs`, `core.cjs`: nombres/aliases/imagen editables sin cambiar key; detección de duplicados y assets inválidos; relación owner independiente del estado enabled; conflictos validados.
- `updates.cjs`, `release-files.cjs`, `master.cjs`, runtime `catalog-delta.cjs`: parches por delta, assets versionados, protección frente a retrocesos conocidos, lista central de archivos de programa y arranque de MASTER con datos de prueba externos.
- `js/dbd-catalog.js`, runtime `server.cjs` y `wheel-model.cjs`: búsqueda por propietario desactivado, proyección de nombres/imágenes actuales sin alterar datos guardados, exclusión de contenido inactivo y builds válidas.
- `js/roulette.js`, tres páginas de ruletas y `js/usuario.js`: corrección de interpolación de nombres como HTML; selección de cuatro perks compatibles o mensaje de imposibilidad.
- `css/usuario-confirmations.css`, `js/usuario-confirmations.js`, estilo del Gestor: bloqueo global de scroll, modales anidados, contenido interno desplazable, acciones accesibles y cards de configuración alineadas.
- Helpers originales de eventos/audio/loaders del paquete local incorporados a `streamer-runtime/public/js` sin cambios funcionales, para que el test permanente PANEL/OBS pueda usar el mismo programa en CI sin depender de una instalación personal.
- Workflow y suites: `dbd-content-release-regression.test.cjs`, `dbd-release-browser.cjs`, `dbd-streamer-release-browser.cjs`; ampliación de catálogos, publicación, challenges y tickets.

## Flujo de revisión y base

[PR #10](https://github.com/SanLean17/SanLean17.github.io/pull/10) contiene la arquitectura y el Gestor, hacia main. [PR #11](https://github.com/SanLean17/SanLean17.github.io/pull/11) conserva la desactivación de Trampero sobre esa rama. Ambos permanecen abiertos y sin fusionar.

Mientras falte la arquitectura en main, una CI correcta se muestra como **BLOQUEADO POR BASE**, con **CI APROBADA** por separado. Una incorporación futura de la base permite preparar un nuevo PR de producción confirmado sobre el main de ese momento. Si cambia main o el head revisado, publicar queda bloqueado hasta nueva revisión. La tarea actual no ejecuta esa transición ni producción.

Cada reloj usa las fechas de inicio/final del check o despliegue real. Los resultados terminales detienen el reloj y las consultas de esa fase. Una vigilancia de metadatos del PR/base permite detectar cambios externos; el botón VOLVER A VERIFICAR fuerza una consulta. No se anuncian tiempos estimados.

## Evidencia y límites

La matriz reproducible está en [DBD-CONTENT-RELEASE-CHECKLIST.md](DBD-CONTENT-RELEASE-CHECKLIST.md). CI conserva capturas e informes bajo el artefacto `dbd-content-browser-evidence`. La regresión incluye capítulos A–H, cantidades variables, PNG/WebP, claves/prefijos, duplicados, propietarios, conflictos, progreso por key, tickets/donantes, correcciones y orden de parches.

Las pruebas de publicación usan GitHub simulado para éxito, fallo, cancelación, omisión, reinicio, pérdida de respuesta, doble click, base cambiante y Pages. Las pruebas reales de GitHub de esta entrega se limitan a ramas de revisión y CI. Las pruebas de UI usan 1440, 390 y 320 píxeles, textos largos y etiquetas ficticias de seguridad.

No se automatiza la aprobación artística de cada imagen ni la configuración de escenas/audio en el OBS personal del streamer. El navegador comprueba los renderizadores, su secuencia y sincronía; eso no sustituye mirar/escuchar las fuentes en OBS antes de una emisión.

Un parche anterior a la introducción del delta y su registro no aporta fechas de modificaciones: su copia manual queda fuera de la detección retrospectiva. Los parches nuevos rechazan retrocesos conocidos y las imágenes reemplazadas tienen rutas distintas.

Terrifier permanece como preparación local y se verifica mediante hashes. El ZIP HOTFIX de entradas reales se mantiene separado e intacto. No se modifica main ni se fusionan los PR en esta revisión.
