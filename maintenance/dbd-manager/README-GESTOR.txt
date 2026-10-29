SANLEAN — GESTOR DE CONTENIDO DBD
VERSIÓN DE PRUEBA LOCAL PARA WINDOWS 10/11 DE 64 BITS

INICIO
1. Extraé el ZIP completo en una carpeta que puedas conservar.
2. Abrí INICIAR GESTOR DE CONTENIDO DBD.bat con doble clic.
3. Se abre http://127.0.0.1:4180/ en tu navegador. Dejá abierta la ventana del servidor.
4. Para cerrar el Gestor, cerrá las pestañas y detené la ventana del servidor con Ctrl+C.
No requiere VS Code, Node instalado ni servicios pagos. No ejecutar desde dentro del ZIP.

PRIMERA PRUEBA
Abrí ACTUALIZACIONES y el borrador TERRIFIER — 2026, si está incluido en tu entrega.
Contiene 1 Killer, 1 Superviviente y 6 perks con los nombres solicitados.
Los ocho espacios de imagen están vacíos: cargá tus PNG/WebP reales desde EDITAR.
No se incluyen imágenes inventadas, descargadas ni reutilizadas como si fueran Terrifier.
El nombre visible se conserva. Los nombres alternativos sólo se usan para buscar.

FLUJO
1. NUEVA ACTUALIZACIÓN: nombre, ID único y fecha opcional.
2. Agregá cualquier combinación de personajes y perks. Las cantidades son libres.
3. Cargá imágenes; confirmá el nombre técnico si no tienen nomenclatura reconocida.
4. VALIDAR ACTUALIZACIÓN. Los resultados aparecen en pantalla.
5. ABRIR VISTA PREVIA. WEB y USUARIO usan el puerto 4181; Streamer de prueba, 4182.
6. Probá las herramientas y completá el checklist visual de desktop y móvil.
7. SIMULAR PUBLICACIÓN muestra archivos y cantidades sin conexión con GitHub.
8. MARCAR LISTO PARA PUBLICAR habilita PUBLICAR ACTUALIZACIÓN.
9. PUBLICAR pide escribir el ID, guarda un respaldo y crea rama, commit y PR.
No hace merge. PUBLICADO significa subido para revisión, no publicado en producción.

DATOS Y RESPALDOS
Todo se guarda dentro de datos/ de la carpeta del Gestor.
actualizaciones/: borradores e imágenes originales.
preparados/: archivos validados, manifiestos, exportaciones y parches.
vista-streamer/: copia aislada y progreso de prueba de cada actualización.
historial/: resultados e intentos de publicación.
respaldos/: catálogos anteriores y archivos exactos de cada publicación.
Copiá la carpeta datos completa para hacer un respaldo. No la subas a GitHub.
Las pruebas de USUARIO guardan datos de demostración en el navegador del puerto 4181.
El programa habitual del streamer y sus datos no se leen ni se modifican.

GITHUB
Usa GitHub CLI oficial y su inicio de sesión en navegador. No escribas contraseñas ni
tokens en el Gestor. La conexión no sube nada por sí sola.
Repositorio fijo: SanLean17/SanLean17.github.io.
Base de esta prueba: codex/dbd-content-catalogs. Nunca main.
La publicación se bloquea si la rama base cambió: usá una nueva copia base revisada
del Gestor antes de subir. Conservá datos/ al cambiar de paquete.
Un fallo queda registrado. RECUPERAR PUBLICACIÓN retoma la misma rama y commit;
consultá el historial y el PR antes de volver a intentarlo. No se fuerza ninguna rama.

PARCHE STREAMER
La copia de prueba ya usa el sistema de catálogos. En el programa habitual hay que
instalar una sola vez SanLean-Streamer-Tools-Catalog-System-PATCH.zip.
Los parches siguientes contienen sólo catálogos completos, assets asociados y README.
Cerrar Streamer Tools, respaldarlo y extraer el parche en la raíz indicada por su README.
No borres datos/ ni reconfigures OBS. No apliques un parche viejo después de uno nuevo.
Los overlays de prueba están en 4182: no reemplaces tus fuentes OBS habituales por ellos.

EXPORTACIÓN MANUAL
EXPORTAR PARA SUBIR MANUALMENTE genera un ZIP con los archivos exactos, un manifiesto
y las instrucciones de emergencia. No sube nada. No contiene datos del streamer.

PRUEBA DE TERRIFIER
Esta entrega no publica Terrifier ni mezcla el PR #10. Faltan los ocho assets reales
para aprobar su aspecto final. La prueba técnica utiliza fixtures identificados como prueba.
No se generó una guía Word: se hará después de aprobar el flujo y las rutas finales.
