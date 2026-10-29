# SANLEAN — GESTOR DE CONTENIDO DBD

Entrega local de prueba. Base de contenido: `569ace03228d36b2a3eb23605884cb03398e9753`, rama `codex/dbd-content-catalogs`, repositorio `SanLean17/SanLean17.github.io`, PR #10. No se trabajó desde main, no se mezcló el PR, no se subió contenido ni se activó Terrifier en producción.

## Arquitectura

Aplicación administrativa separada de WEB y USUARIO. Lanzador BAT, Windows PowerShell, Node portátil y navegador. El paquete incluye el runtime y las dependencias; no necesita VS Code, una instalación de Node ni servicios pagos.

El Gestor escucha sólo en `http://127.0.0.1:4180/`. La preview WEB/USUARIO usa 4181 y el Streamer aislado usa 4182. La instalación habitual del streamer, su puerto 4175, su carpeta datos y sus loaders OBS no se modifican.

Se reutilizan `js/dbd-catalog.js` y `maintenance/dbd-content/ContentTools.ps1`. El primero resuelve aliases, normalización, propietarios, rutas, enabled y búsquedas. El segundo vuelve a validar los catálogos y genera el mismo parche de contenido que el BAT existente. El Gestor agrega decodificación completa de PNG/WebP, dimensiones, transparencia, duplicados, estados editoriales, manifiestos y una interfaz visual.

## Archivos creados y modificados

Nuevos: `INICIAR GESTOR DE CONTENIDO DBD.bat`, `maintenance/dbd-manager/` (servidor, modelo, publicación, preview, interfaz, lanzador PowerShell, verificación del almacén de credenciales, constructor de paquete y README), `tests/dbd-manager.test.cjs`, `tests/dbd-manager-browser.cjs` y este informe.

Modificados: `.gitignore`, para excluir datos privados y archivos del paquete; `.github/workflows/dbd-content.yml`, para añadir las pruebas del Gestor. El workflow sigue sin desplegar Pages.

No se modificaron los cuatro catálogos activos, conflictos, assets productivos, HTML público, controladores de USUARIO, sistema visual, METAS ni loaders OBS. El borrador Terrifier se crea exclusivamente en el paquete local, fuera de Git. El código de pruebas usa fixtures; los datos reales del borrador no se agregan al repositorio.

## Inicio y almacenamiento

Extraer el ZIP completo y abrir `INICIAR GESTOR DE CONTENIDO DBD.bat`. Si esa misma carpeta ya está abierta, el lanzador reutiliza el Gestor. Si otro programa ocupa 4180, informa el problema y no lo reemplaza.

Los borradores quedan en `datos/actualizaciones/<id>/actualizacion.json` y sus imágenes en `imagenes/`. `datos/preparados/` contiene preparaciones inmutables por revisión, manifiestos, ZIPs y catálogos completos de prueba. `datos/historial/` y `datos/respaldos/` registran publicaciones y recuperación. `datos/vista-streamer/` conserva sólo progreso de prueba. Nada de estas carpetas se añade automáticamente a GitHub.

Los estados BORRADOR, PREPARADO, VALIDADO, LISTO PARA PUBLICAR y PUBLICADO son independientes de enabled. PUBLICADO significa **subido para revisión**; no significa producción. Editar nombres, propietarios, imágenes o enabled invalida la preparación y el checklist anterior. Se detectan guardados concurrentes para no sobrescribir cambios de otra ventana.

## Preview y archivos de publicación

Preparar produce los cuatro catálogos completos, conserva byte a byte los catálogos sin cambios y copia los assets nuevos sin modificarlos visualmente. Se registran SHA-256 de los archivos de contenido y del manifiesto. La preview sirve estos mismos bytes. Publicar y exportar leen los archivos preparados; no vuelven a generar una versión diferente.

WEB usa sus páginas y controladores reales. USUARIO usa el adaptador local ya existente, con identidad y datos de demostración. La salida del monitor local usa su puente original. Se agregan fuentes locales a la respuesta de preview para no depender de Google Fonts. Los catálogos y assets de publicación no se alteran por esa adaptación de entorno.

Streamer se ejecuta desde una copia limpia incluida, con puerto de prueba y almacenamiento propio por actualización. La reapertura conserva ese progreso y migra el contenido por key. Las URLs de prueba se muestran como tales. No hay instalación automática en el streamer habitual.

## Auditoría de consumidores

| Consumidor | Comportamiento comprobado |
|---|---|
| Ruleta Killers y ambas ruletas de perks | Catálogos compartidos, nombres, aliases y assets nuevos |
| Cuatro Tierlist DBD | IDs estables por tipo/key, catálogo dinámico, retratos y perks |
| USUARIO: Killers y perks | Catálogos compartidos; búsqueda por propietario y aliases; tarjetas respetan su control existente de mostrar/ocultar |
| All Killer / All Survivor | Nuevo personaje pendiente, total dinámico y progreso previo por key |
| Renderer de challenges / OBS | 19 columnas en 1920 px; última fila izquierda, centro y derecha; sin cantidades agregadas manualmente |
| Win Streak | Selector existente de Killer incluye el nuevo personaje; no se agregó selector de Survivor |
| METAS | En USUARIO usa rol y contadores, sin selector de personajes. El modelo local de contadores comparte validación de Killer con Win Streak, pero no requiere agregar controles a METAS. No se modificó |
| Ruletas y overlays privados | Consumen los mismos catálogos; se conserva el aislamiento local |
| Streamer Tools | Capa de catálogos existente, migración de progreso, donaciones, preferencias e historial conservados |

## Publicación en GitHub

La simulación es local y muestra archivos nuevos/modificados, entradas JSON, assets y totales antes/después. PUBLICAR requiere validación, preview de esa preparación, simulación, checklist completo y escribir el ID en un modal específico. Se vuelve a verificar la revisión y los hashes al confirmar.

Se incluye GitHub CLI oficial. La conexión comprueba primero la disponibilidad del almacén de credenciales de Windows con una prueba descartable sin secretos. El módulo admite una credencial activa de keyring o una credencial proporcionada al proceso por su entorno; rechaza credenciales activas provenientes de un archivo en texto plano. No hay campos de contraseñas/PAT, secretos OAuth ni service role. El inicio oficial se abre sólo al pulsar CONECTAR GITHUB. Referencia: [autenticación de GitHub CLI](https://cli.github.com/manual/gh_auth_login).

Al publicar se comprueba que la rama remota todavía apunta a la base revisada. Se guardan catálogos anteriores, archivos exactos, manifiesto, hashes, listado de assets, commit base y parche. Después se crean blobs, árbol, commit, rama nueva `content/<updateId>-<identificador>` y un PR borrador hacia `codex/dbd-content-catalogs`. Nunca se envía una actualización a main ni se hace merge automático.

Cada paso queda en un registro local. Si se interrumpe una operación, el botón de recuperación consulta la misma rama/commit/PR antes de continuar. No se fuerza ninguna referencia. La arquitectura no contiene una ruta de merge: una futura publicación definitiva deberá incorporar su propia confirmación explícita.

## Parches y exportación manual

GENERAR PARCHE DEL STREAMER reutiliza `ContentTools.ps1 -Mode Patch`. El ZIP contiene los cuatro JSON, conflictos, únicamente los assets del updateId y README. No contiene datos, sesiones, progreso, preferencias, historial, AppData ni loaders.

El parche inicial `SanLean-Streamer-Tools-Catalog-System-PATCH.zip` está incluido y puede descargarse desde la interfaz. Se instala una sola vez en una instalación que todavía no usa catálogos. La copia de prueba incluida ya está adaptada. No hace falta reconfigurar OBS.

La exportación manual incluye los archivos exactos que irían al PR, un manifiesto y las instrucciones de emergencia. No se conecta a GitHub. Al publicar se genera automáticamente el parche y queda vinculado al historial.

## Pruebas ejecutadas

- Diez pruebas nuevas del Gestor: actualización vacía; ID; cantidades variables (1 y 2 Killers, 1 y 3 Survivors, sólo perks y cantidades distintas); propietarios existentes/nuevos; nombres y aliases; keys y siguiente prefijo; assets corruptos/extensión/dimensiones/transparencia/duplicados/WebP; validación; revisión y caducidad; manifiesto alterado; ZIP; publicación simulada, respaldo y recuperación; bloqueo por base desactualizada.
- Ocho pruebas existentes de catálogo, mantenimiento PowerShell y migración del Streamer. La prueba de migración se ejecutó con su directorio temporal dentro del espacio de trabajo para evitar una restricción de permisos del entorno temporal del ejecutor.
- Regresiones de ajustes privados y ruleta: aislamiento por cuenta, retención tras fallos, guardado serializado, repeticiones, 30 salidas únicas, agotamiento y reinicio.
- Navegador real: crear/editar/cargar PNG/guardar/recargar/buscar; formularios en 1440, 740, 390 y 320 px; WEB real con tres ruletas y cuatro Tierlist; USUARIO real con ruletas, búsqueda, ambos challenges y Win Streak; Streamer real y overlays.
- Integración local Terrifier con ocho imágenes sintéticas de QA, claramente separadas del borrador entregado: nombres y aliases exactos; normalización de acentos/apóstrofe; sin alias inventado Triquiniela; 44→45 y 54→55; nuevos pendientes; progreso, donaciones y preferencias conservados; tres alineaciones OBS.
- Igualdad de los hashes entre los archivos preparados y las respuestas de preview; simulación, parche y exportación desde esa preparación. La publicación se prueba con un sustituto de la API de GitHub, sin crear ramas o PR reales de contenido.

La evidencia de navegador se guarda bajo `test-results/manager-browser-*/`. El paquete final incluye el informe de la ejecución aprobada y capturas seleccionadas. Los fixtures y el progreso de QA no se entregan como contenido del borrador.

## Límites y prueba de Terrifier

No hay ocho assets reales de Terrifier suministrados en esta tarea. Por eso el borrador entregado tiene ocho slots vacíos. Para probar su aspecto real: abrir TERRIFIER — 2026, editar cada elemento, cargar los dos retratos y las seis perks, validar y abrir la preview. No se afirma una aprobación visual de los assets reales sin verlos.

La publicación autenticada real no se ejecutó: el pedido prohíbe subir contenido nuevo. El flujo de rama/commit/PR, los bytes enviados, los bloqueos y la recuperación se probaron mediante una API simulada. GitHub CLI se incluye, pero el usuario debe conectar su cuenta mediante el botón cuando decida usarla.

La base de esta entrega está fijada al commit indicado. Si la rama cambia, se requiere una nueva copia base revisada del paquete; el Gestor bloquea la subida para evitar reemplazar contenido posterior. Los borradores se conservan copiando datos/ al nuevo paquete y volviendo a validar. La incorporación de nuevos elementos puede exigir revisar prefijos que hayan sido ocupados entretanto.

La aplicación exige Windows de 64 bits. La revisión de navegador se realizó con Edge/Chromium; las pruebas locales no equivalen a probar escenas personales de OBS ni todas las configuraciones de Windows. Los loaders originales no se editaron. No se creó la guía Word.
