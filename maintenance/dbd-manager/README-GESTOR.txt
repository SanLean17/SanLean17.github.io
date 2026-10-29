SANLEAN — GESTOR DE CONTENIDO DBD · v2
Prueba local para Windows 10/11 de 64 bits

ABRIR
Abrí INICIAR GESTOR DE CONTENIDO DBD.bat desde la carpeta extraída.
Dejá abierta la ventana del servidor mientras usás el Gestor.
No requiere instalar Node, VS Code ni servicios pagos.
Si ya tenés esta entrega guardada en la PC, no necesitás descargar otra copia.

PUERTOS
Gestor: 127.0.0.1:4180
WEB / USUARIO preview: 127.0.0.1:4181
Streamer Tools preview: 127.0.0.1:4182
NINGUNO MODIFICA PRODUCCIÓN.

ESTA ENTREGA
Incluye una copia del borrador TERRIFIER — 2026 y las ocho imágenes que cargaste
en Programa para cargar Superviviente-Killer, en el Escritorio.
Se conserva el progreso local de esa vista Streamer. La carpeta original no se modifica.
Las preparaciones y copias de programa regenerables no se duplican en la migración.
Abrí el borrador, VALIDAR ACTUALIZACIÓN y ABRIR VISTA PREVIA para regenerarlas.
El contenido permanece exclusivamente local. No se publicó Terrifier, no se mezcló
el PR #10 ni se modificó main.

FLUJO
1. Nueva actualización: nombre, ID sugerido a partir del nombre y año, fecha opcional.
2. Agregá Killers, Supervivientes o perks. Los personajes agrupan sus propias perks.
3. Cargá PNG/WebP. Los nombres extraños se confirman en una ventana SanLean.
   Sólo cambia el nombre técnico; se conservan los bytes de la imagen.
4. Usá OTROS NOMBRES / TÉRMINOS DE BÚSQUEDA, uno por línea. Inglés es opcional.
5. Validá. El Gestor comprueba catálogo, assets, búsquedas, propietarios y totales.
6. Abrí las herramientas reales y revisá imagen, nombre, desktop, móvil y animación.
7. Simulá la publicación. Generá el parche Streamer o la exportación manual.
8. La publicación real de rama/commit/PR queda para la prueba posterior autorizada.
   El Gestor muestra un resumen y pide escribir el ID antes de subir. No hace merge.

STREAMER Y OVERLAYS
ABRIR HERRAMIENTA lleva a su panel, incluyendo enlaces directos a cada sección.
Los MONITORES DE OVERLAYS muestran la salida real sobre una cuadrícula transparente.
Un overlay inactivo u oculto puede estar vacío. El monitor informa su estado y permite
volver a la herramienta para iniciarla, mostrarla o generar/girar una ruleta.
Estas URLs de prueba no reemplazan las fuentes OBS del programa habitual.
MI PANEL LOCAL usa la copia aislada incluida, no otras instalaciones de la PC.

ADMINISTRAR CATÁLOGO
Elegí una actualización para guardar los cambios. Buscá en los cuatro catálogos.
DESACTIVAR oculta el contenido manteniendo key, imagen, aliases y propietario.
REACTIVAR recupera esa identidad; no borra progreso, preferencias ni historial.
Las acciones por paquete incluyen exclusivamente las perks con propietario registrado.
Las perks históricas no tienen ownerKey: asociá explícitamente cada perk a su personaje
con ASOCIAR A UN PERSONAJE antes de usar acciones por paquete. No se deducen dueños.
ELIMINAR exige una lista exacta y confirmación. No elimina perks automáticamente,
archivos de imagen ni datos del streamer. DESHACER CAMBIO revierte el borrador.
Para compartir cualquier cambio hay que volver a validar y revisar.

PARCHE STREAMER ACTUALIZADO
Antes de aplicar cambios de catálogo al programa habitual, cerralo y respaldalo.
Aplicá el SanLean-Streamer-Tools-Catalog-System-PATCH.zip incluido en ESTA v2,
incluso si instalaste el parche inicial de v1. Actualiza la compatibilidad de rachas
y entradas guardadas cuando un personaje se desactiva o elimina.
Después aplicá el parche de contenido. No borres datos/ ni reconfigures OBS.
La copia de prueba del Gestor ya tiene esta corrección. No se modifica automáticamente
tu programa habitual. No apliques un parche viejo después de uno nuevo.

AUDITAR COPIAS LOCALES
Revisa sólo ubicaciones conocidas de exports y temporales de pruebas del proyecto.
No recorre toda la PC. Todas las casillas comienzan sin seleccionar.
Protege el Gestor actual y sus datos, el programa habitual, AppData, el repositorio
y tu carpeta Programa para cargar Superviviente-Killer. Documentos personales no se
incluyen en la búsqueda. Los temporales identificados dentro de test-results se muestran
por separado; el repositorio nunca se ofrece como carpeta para borrar.
Seleccioná manualmente, revisá la lista y el espacio, y confirmá MOVER A LA PAPELERA.
Si una carpeta cambió o contiene enlaces, la operación se bloquea y requiere otra auditoría.
No hay borrado permanente como alternativa. El espacio se libera al vaciar la Papelera.

CONSERVAR / MIGRAR DATOS
Esta entrega ya contiene una copia de tu borrador e imágenes: no hace falta recargarlos.
Tu v1 del Escritorio queda intacta y podés conservarla como respaldo hasta aprobar v2.
Para migraciones futuras: cerrá ambos gestores, extraé v2 en una carpeta nueva y vacía,
y copiá la carpeta datos/ completa de v1 allí. No combines dos carpetas datos distintas
sin conservar antes un respaldo de ambas. No extraigas un paquete sobre datos activos.
Los datos v1 se leen conservando los campos anteriores. La revisión visual se reinicia
para verificar los nuevos controles. Las preparaciones ausentes se vuelven a generar.
datos/ contiene actualizaciones e imágenes, historial, respaldos y progreso local.
Las pruebas de USUARIO usan almacenamiento del navegador en el puerto 4181.

GITHUB
GitHub CLI oficial. Conexión en navegador, sin pedir contraseñas o tokens al Gestor.
Repositorio: SanLean17/SanLean17.github.io. Rama base: codex/dbd-content-catalogs.
La base de contenido está fijada al commit aprobado. Si la rama cambia, la subida
se bloquea para evitar reemplazar contenido nuevo; conservá datos al actualizar la base.
PUBLICADO significa subido para revisión, no producción. Nunca se hace merge automático.

No se creó una guía Word. El detalle de cambios y pruebas está en
GESTOR-CONTENIDO-DBD-REVIEW-v2.md.
