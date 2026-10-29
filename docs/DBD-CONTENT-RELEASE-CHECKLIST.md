# DBD CONTENT RELEASE REGRESSION

Ejecutar esta matriz antes de cambiar catálogos, ruletas, Tierlist, challenges, Gestor o Streamer Tools. El workflow `DBD content architecture` la ejecuta en cada PR. Cada comando ocupa un paso independiente: un fallo anterior nunca puede quedar oculto por el éxito del último comando de PowerShell.

## AUTOMÁTICAS

| Comprobación | Resultado obligatorio | Prueba permanente |
| --- | --- | --- |
| Catálogos y assets | JSON válido, identidades únicas, rutas dentro del paquete, archivos existentes | `ContentTools.ps1 -Mode Validate`, `dbd-maintenance.test.cjs` |
| Capítulos futuros A–H | 1 Killer + 3 perks; 1 Survivor + 3; ambos + 6; 2 Survivors + 6; 2 Killers; perks para propietario existente; personaje sin perks; 2 Killers + 3 Survivors | `dbd-content-release-regression.test.cjs` |
| Imágenes | PNG/WebP decodificables; rechazo de vacíos, corruptos, extensión falsa, ruta ajena, repetidos y archivo alterado tras preparar | `dbd-content-release-regression.test.cjs`, `dbd-manager.test.cjs` |
| Identidades | Key estable; siguiente prefijo según máximo por rol; huecos no reutilizados; duplicado numérico con ceros iniciales rechazado | `dbd-content-release-regression.test.cjs` |
| Propietarios | Existentes y del rol correcto; búsqueda por nombre/aliases del propietario, incluso desactivado; una carga tardía de otro rol no puede sobrescribir la búsqueda | `dbd-catalog.test.cjs`, `dbd-catalog-browser.cjs`, `dbd-manager-v3.test.cjs` |
| Activación | Personaje, perk individual, todas las perks y paquete son acciones explícitas; desactivar conserva los objetos | `dbd-content-release-regression.test.cjs`, `dbd-manager-v2.test.cjs` |
| Correcciones | Nombre/aliases/imagen conservan key; nueva imagen tiene ruta versionada; cambio de key publicado requiere migración aparte | `dbd-content-release-regression.test.cjs` |
| Incompatibilidades | Keys válidas, grupos sin repetidos, cuatro perks distintas y compatibles; imposibilidad explicada sin duplicar perks | `dbd-content-release-regression.test.cjs`, `roulette-tickets.test.cjs` |
| Progreso | 44→45→44→41 y 54→55→57; progreso por key, nuevas identidades pendientes, estados ocultos recuperables | `dbd-content-release-regression.test.cjs`, `dbd-streamer-model.test.cjs` |
| Win Streak y preferencias | Racha/historial conservados al desactivar, reactivar o quitar personaje; aislamiento por cuenta | `dbd-manager-v2.test.cjs`, `private-settings.cjs` |
| Entradas reales | Cada donación es un ticket con entryId; ELIMINAR quita sólo el ganador; quedan default y otros donantes | `roulette-tickets.test.cjs` |
| PANEL = OBS | Servidor real, secuencia/ganador/tiempos/donantes iguales, OBS incorporado durante giro; builds únicas de ambos roles | `dbd-streamer-release-browser.cjs` |
| WEB y USUARIO | Tres ruletas, cuatro Tierlists, activos/inactivos, búsqueda y IDs estables en 1440/390/320 px | `dbd-catalog-browser.cjs`, `all-challenges.cjs` |
| Seguridad de nombres | Acentos, ñ, ü, apóstrofes, &, dos puntos, guion y barra como texto; etiquetas ficticias nunca ejecutables | `dbd-catalog-browser.cjs` |
| Fixtures | Directorio marcado de test, actualizaciones de prueba fuera de los datos operativos; limpieza de copias temporales | `dbd-content-release-regression.test.cjs`, `dbd-manager-v2.test.cjs` |

## MANUALES VISUALES

| Revisión | Qué comprobar |
| --- | --- |
| Imágenes reales nuevas | Retrato y perk correctos, recorte, transparencia, orientación, calidad y propietario. Un decodificador no confirma la identidad artística. |
| 1440, 390 y 320 px | Nombres largos legibles, sin desborde; cards, controles y Tierlist utilizables. Revisar capturas de CI. |
| Modales | Referencia: FINALIZAR ALL KILLER CHALLENGE. Body inmóvil, scroll interno, botones accesibles, foco seguro, Esc y backdrop, incluso con confirmación anidada. |
| Configuración | GITHUB y DATOS EN ESTA PC alineados; conexión oficial actualizada sin F5. |
| OBS instalado | Siete fuentes, transparencia, tamaño, audio único, cambio de escena y reconexión en el OBS real del streamer. La prueba del navegador verifica los renderizadores, no la configuración personal de OBS. |

## PUBLICACIÓN

| Control | Condición para avanzar |
| --- | --- |
| Resumen | Totales calculados aplicando el delta sobre la rama destino actual; SHA de base confirmado. |
| Rama/commit/PR | Reintentos recuperan la misma operación; doble click no duplica. Pérdida de respuesta no equivale a operación fallida en GitHub. |
| CI | Check `content` de GitHub Actions aprobado para el SHA exacto, todos los checks terminales aceptables, sin estados fallidos. `skipped` no sirve para el check obligatorio. |
| Error | Mostrar PR, workflow, paso y enlace; detener reloj. Reintento explícito espera una nueva ejecución sin inventar actividad. |
| Base pendiente | Si la arquitectura falta en main: BLOQUEADO POR BASE. No es un error de contenido. |
| Base incorporada | Nuevas revisiones usan main. Una revisión antigua prepara otro PR sobre main sólo tras confirmación; no arrastra catálogos completos obsoletos. |
| Main actualizado | Un SHA nuevo exige revisar de nuevo. Bloquear head ajeno, conflictos, borrador, PR cerrado y base desactualizada. |
| Confirmación | Producción exige nombre y commit revisados, CI aprobada y PR válido. Nunca merge automático desde una prueba. |
| Despliegue | DESPLEGANDO sólo si Pages informa queued/building para el commit publicado. PRODUCCIÓN ACTUALIZADA exige Pages built del commit y hashes públicos coincidentes. |
| Reinicio | Reconstruir estado desde GitHub. El reloj mide sólo una fase activa, no tiempo desde que se abrió la página. |

Pruebas: `dbd-publication-v4.test.cjs` (GitHub simulado, incluidos fallos y recuperaciones) y `dbd-release-browser.cjs` (seis estados, temporizador, polling, conexión y modales). No realizan merges ni despliegues reales.

## STREAMER PATCH

| Control | Resultado obligatorio |
| --- | --- |
| Contenido | El parche actual V4 incluye el delta JSON, sólo sus assets nuevos/reemplazados y archivos de programa permitidos; se aplica sobre los catálogos instalados. Las exportaciones y el formato anterior usan catálogos completos. |
| Privacidad | Sin datos, preferencias, sesión, progreso, historial, respaldos personales ni configuración de OBS del streamer. |
| Orden | Borrador A preparado antes de B conserva B al publicar. Runtime registra campos y fechas aplicados y rechaza retroceder una modificación conocida. |
| Sustitución de imagen | Ruta con hash del contenido; un parche antiguo no pisa los bytes de una imagen nueva. No borrar la imagen anterior del disco. |
| MASTER | Conservar estructura, audio y fuentes; prueba de inicio con datos fuera de la carpeta distribuible. MASTER sin datos de uso al entregar. |
| Instalación real | Ejecutar `roulette-tickets-browser.cjs` con `SANLEAN_MANAGER_PACKAGE` y `SANLEAN_STREAMER_MASTER`; usa datos aislados y compara hashes de borradores, datos y loaders antes/después. |
| Limpieza | Eliminar sólo fixtures identificados creados por la prueba. No producir otra instalación completa ni regenerar un hotfix ajeno a la entrega. |

El registro de orden protege versiones conocidas por este runtime. Un ZIP antiguo sin delta/registro, copiado manualmente sobre los archivos, no puede reconstruir por sí solo el historial que nunca registró. Usar la versión actual del Gestor para generar nuevos parches; revisar cualquier restauración manual.
