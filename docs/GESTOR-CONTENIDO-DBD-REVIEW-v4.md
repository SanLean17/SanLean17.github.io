# SANLEAN — Gestor de contenido DBD v4

Revisión local del 29/10/2026. No se publicó contenido ni se hizo push o merge.

## Instalación que se utiliza

`Documents\Programa SanLean\Gestor de contenido DBD` contiene el programa, su runtime, la base de preview y `datos/`. Se abre con `INICIAR GESTOR DE CONTENIDO DBD.bat`. No hace falta descargar otra copia.

`Documents\Programa SanLean\SanLean Streamer Tools` es la distribución MASTER real y limpia. SanLean Local y SanLean Usuario son launchers de la misma preview en el puerto 4181. Los archivos que ejecutan están en `Gestor de contenido DBD/base/web`, dentro de Documents; no hay dependencia de `.codex` para usarlos. La preview Streamer comparte una única carpeta temporal y escucha en 4182. No instala loaders OBS.

La copia Git de trabajo de esta entrega es `C:\Users\Lean\.codex\.chatgpt-projects\g-p-6ab548a8c5d08191b7b59a6ef5977ea5\repo\dbd-content-test`, rama `codex/dbd-content-catalogs`. Las otras carpetas Git existentes se conservaron; no se creó otro repositorio.

## Catálogo, actualizaciones y guardado

- CATÁLOGO ACTUAL abre directamente la base, con total, activos y desactivados por categoría. Abrir una actualización no cambia esa base.
- Guardar un cambio permite elegir una actualización nueva o existente mediante el select canónico. Las asociaciones de propietarios también se guardan en una actualización elegida.
- Las actualizaciones guardan altas y operaciones sobre entradas. La combinación de actualizaciones es una acción explícita, crea una nueva y rechaza cambios incompatibles; conserva los originales.
- Activar, desactivar y reactivar ejecuta la validación corta: catálogos, referencias, totales, filtro de activos y conservación de progreso. Queda CAMBIO LISTO PARA PUBLICAR; preview opcional.
- El contenido nuevo mantiene la revisión completa. Hay una card por herramienta, aprobación visual por sección o total y MARCAR COMO PREPARADA. La validación automática no se altera al aprobar checks.
- Revalidar una preparación intacta conserva sus aprobaciones y fechas. Los formularios tienen un guardado local recuperable al recargar; GUARDAR ELEMENTO incorpora esa edición al contenido.
- Se muestran creación, última modificación y lanzamiento, cuando fue declarado. La vista mobile integrada usa 390 px.

## Terrifier y separación de pruebas

TERRIFIER — 2026 es la única actualización en `datos/actualizaciones/`. Su documento sigue siendo exactamente el mismo, comprobado por SHA-256, con ocho imágenes verificadas, revisión 22 y estado VALIDADO. Conserva los dos grupos visuales que estaban aprobados: WEB Killers y Streamer Perks Survivor. No se aprobaron los demás por cuenta del usuario.

Creada: `2026-10-29T01:28:12.981Z`. Última modificación: `2026-10-29T18:01:50.613Z`. Se conservó también su cambio local anterior sobre El Liche. No se aplicó Terrifier al MASTER ni se publicó.

Los cinco borradores técnicos se movieron a `datos/tests/archivados`, con verificación de sus documentos. Las pruebas nuevas requieren una carpeta bajo `datos/tests` y una identificación de fixture. Los antiguos scripts de navegador rechazan expresamente un servidor operativo. Las capturas y temporales de navegador están bajo `datos/temp`.

## GitHub y producción

El acceso oficial de GitHub CLI obtuvo el código de acceso de dispositivo durante la prueba. El almacén seguro de Windows pasó la comprobación. No se inició sesión ni se guardaron tokens en el Gestor. Falta que el usuario complete CONECTAR GITHUB cuando lo necesite.

PUBLICAR PARA REVISIÓN muestra y confirma la rama destino y su commit. Crea rama, commit y PR, sin merge automático. Las operaciones se registran por fase y se pueden recuperar si una subida se interrumpe. Los cambios se combinan sobre los catálogos de la rama destino, conservando cambios ajenos.

PUBLICAR EN PRODUCCIÓN requiere PR abierto y fusionable hacia main, el commit exacto revisado, CI aprobada y confirmación explícita. Si la revisión se hizo sobre la rama de arquitectura, primero se necesita un PR separado hacia main y su CI. ACTUALIZADO sólo aparece después de confirmar el commit desplegado por Pages y los archivos servidos en sanlean.com.ar; entonces se actualiza la base local. El tiempo mostrado es transcurrido, sin ETA inventada.

**Requisito pendiente de producción:** main (`43b6e5226cbb0382f2d58e5fc88187519eb1ebfe`) aún no tiene la arquitectura compartida `js/dbd-catalog.js`. El Gestor bloquea una publicación incompatible hasta que esa base sea aprobada y desplegada. Esta revisión no la publica. La rama remota de revisión permanece en `569ace03228d36b2a3eb23605884cb03398e9753`.

Los flujos de subida, CI, merge y despliegue se verificaron con respuestas simuladas y bloqueos de seguridad. La prueba real de desactivar/publicar/reactivar queda para después de la revisión de UX/UI del usuario.

Referencias de implementación: [acceso oficial de GitHub CLI](https://cli.github.com/manual/gh_auth_login), [merge con SHA esperado](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request), [estado de Pages](https://docs.github.com/en/rest/pages/pages#get-latest-pages-build).

## Streamer y OBS

El parche local incluye operaciones de catálogo y sólo los assets nuevos, si los hay. Al reiniciar, el runtime materializa esos cambios sobre el catálogo instalado. Evita que una actualización antigua deshaga otra. Hay un registro de aplicación y recuperación ante escritura interrumpida; se incluye el soporte de operaciones para instalaciones anteriores que ya tienen el sistema de catálogos.

ACTUALIZAR STREAMER TOOLS MASTER respalda antes, aplica, comprueba el arranque con datos temporales y restaura si falla. Se rechaza un MASTER que contenga datos personales. La distribución real sigue limpia. No se tocaron los loaders OBS ni sus rutas; el reinicio conserva la reconexión automática. Streamer se actualiza mediante PATCH LOCAL, no desde GitHub.

## Verificación y limpieza

Pasaron 25 pruebas previas del Gestor y 13 comprobaciones finales de catálogo, publicación y progreso del Streamer. La prueba del auditor que necesita un enlace de Windows se repitió con el permiso correspondiente y pasó. También se verificaron desactivación/reactivación en navegador: WEB, Tierlist, USUARIO, All Killer, Win Streak y Streamer; 1440, 900, 740, 390 y 320 px sin desbordamiento del Gestor; autosave tras recarga; checks por sección/total; estado preparado persistente; mobile embebido de 390 px; arranque del programa instalado y del MASTER. No hubo diálogos nativos ni errores de página en la integración final.

La limpieza envió 62 ubicaciones auditadas a la Papelera: 8.860.874.453 bytes (8,25 GiB). Antes se verificaron reemplazos en Documents y se preservaron 43 archivos históricos en un respaldo compacto. No se vació la Papelera: ese espacio se libera cuando el usuario la vacía. Se conservaron el repositorio, datos actuales, preparación vigente de Terrifier, MASTER, instalaciones personales, OBS y entregas de otras tareas sin reemplazo completo demostrado.

El detalle de rutas, tamaños y motivos está en `Documents\Programa SanLean\COPIAS-LOCALES-LIMPIEZA.md`. Las evidencias se conservan bajo `Documents\Programa SanLean\VERIFICACION`.
