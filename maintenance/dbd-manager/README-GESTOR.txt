SANLEAN — GESTOR DE CONTENIDO DBD · v4
Local para Windows 10/11 de 64 bits

YA ESTÁ INSTALADO
Documents\Programa SanLean\Gestor de contenido DBD
Abrí INICIAR GESTOR DE CONTENIDO DBD.bat. No hace falta descargar otra copia.
Incluye el runtime. No requiere suscripciones ni servicios pagos.

CATÁLOGO ACTUAL
Abrí ADMINISTRAR CATÁLOGO sin elegir una actualización.
Después de cambiar un personaje o perk, elegí una actualización nueva o existente.
Cada actualización guarda sus cambios; abrirla no cambia la base ni otros borradores.
COMBINAR ACTUALIZACIONES crea una copia nueva explícita y señala conflictos.

DOS RECORRIDOS
ACTIVAR / DESACTIVAR / REACTIVAR: validación automática de catálogo, referencias,
totales, filtro y progreso. Estado CAMBIO LISTO PARA PUBLICAR. Preview opcional.
CONTENIDO NUEVO: contenido, validación, preview, revisión visual y MARCAR COMO
PREPARADA. Estado PREPARADA PARA PUBLICAR. Los checks se conservan al reabrir.
Los formularios se guardan localmente mientras editás. GUARDAR ELEMENTO los
incorpora al contenido. Podés continuar o descartar una edición pendiente.

TERRIFIER
Es la única actualización real conservada. Mantiene ocho imágenes, aliases,
estado VALIDADO, dos herramientas aprobadas, fechas y revisión anteriores.
No fue publicada ni se completaron checks visuales por vos.
Las pruebas técnicas están separadas en datos/tests; los temporales en datos/temp.

PUBLICACIÓN
GitHub: CONECTAR GITHUB utiliza el acceso oficial de GitHub CLI y el almacén
seguro de Windows. Debés completar el inicio de sesión en tu navegador.
PUBLICAR PARA REVISIÓN crea rama, commit y PR. No realiza merge automático.
PUBLICAR EN PRODUCCIÓN requiere PR hacia main, CI aprobada y tu confirmación.
Si la arquitectura compartida aún no existe en main, se explica el requisito y
la producción queda bloqueada. No se inventa una hora de finalización.
ACTUALIZADO exige comprobar el commit de Pages y los archivos servidos por la WEB.
La próxima prueba real de GitHub queda para después de tu revisión de UX/UI.

STREAMER
Se actualiza con PATCH LOCAL; GitHub no modifica las instalaciones de los streamers.
GENERAR PARCHE funciona también para cambios de estado sin imágenes nuevas.
Streamer existente: cerrar, extraer encima, aceptar reemplazar y volver a abrir.
Los loaders OBS reconectan sin cambiar sus rutas. Refresco manual: contingencia.
ACTUALIZAR STREAMER TOOLS MASTER aplica el parche, respalda antes y prueba el arranque.
MASTER limpia: Documents\Programa SanLean\SanLean Streamer Tools.
Puede comprimirse para entregar. Ejecutar su BAT directamente crea datos personales;
para mantener la MASTER limpia usá la preview del Gestor para las pruebas.

UBICACIONES
Gestor: 127.0.0.1:4180. Preview WEB/USUARIO: 4181. Preview Streamer: 4182.
SanLean Local y SanLean Usuario son launchers de esa misma preview temporal.
Su base real vive en Gestor/base/web; no dependen de .codex para ejecutarse.
Conservá datos/ y la MASTER actual. COPIAS-LOCALES-LIMPIEZA.md detalla lo retirado.
Los elementos enviados a la Papelera ocupan espacio hasta que vos la vacíes.
