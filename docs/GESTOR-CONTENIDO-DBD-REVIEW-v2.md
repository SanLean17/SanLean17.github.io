# SANLEAN — GESTOR DE CONTENIDO DBD · REVISIÓN v2

Segunda pasada sobre el commit local `94e2369`. Entrega local para Windows, sin subir commits, crear ramas remotas, publicar Terrifier, modificar main ni mezclar el PR #10. La base de contenido permanece en `569ace03228d36b2a3eb23605884cb03398e9753`, rama `codex/dbd-content-catalogs`.

## Problemas encontrados y correcciones

| Problema | Corrección en v2 |
|---|---|
| Estilos administrativos aproximados | Carga directa de los archivos canónicos de USUARIO: sistema visual, shell lateral, botones, campos, badges, checkboxes, confirmaciones y selectores. El CSS del Gestor se limita a la disposición de su contenido y comportamiento responsive. |
| Navegación superior y cards desproporcionadas | Menú lateral de USUARIO con cuatro secciones; flujo móvil del mismo shell. Cards canónicas compactas con cantidades y estado. |
| Alertas nativas para nombres de archivo | Uso directo de `SanLeanConfirm`, con cancelar a la izquierda, foco seguro, Escape y backdrop. Nombres largos usan una etiqueta breve y muestran el nombre completo en el texto. |
| Archivo descargado con nombre no previsto | Acepta espacios, paréntesis y acentos; propone nombre técnico por key. Verificación SHA-256 de conservación de los bytes originales. |
| Formularios poco claros | Nombre visible obligatorio, inglés opcional, un único campo de términos de búsqueda. Se conservan los nombres históricos internamente; se deduplican los términos mostrados. ID sugerido a partir del nombre y año; fecha opcional sin programación automática. |
| Elementos de la actualización mezclados | Grupos de Killer/Superviviente con retrato y sus perks. Cantidades libres, sólo perks y varios personajes. Después de crear un personaje se ofrece agregar su perk, sin obligación. |
| Enlaces Streamer que parecían quedar en blanco | Los enlaces iban a `/obs/...`, salidas transparentes que pueden estar vacías si están ocultas o inactivas. Ahora se abre el panel `/#herramienta`; los overlays tienen monitores separados con cuadrícula, estado y enlace al control. |
| Cambio de herramienta por enlace en una pestaña ya abierta | Se incorporó manejo de `hashchange` en la copia aislada del preview. Se probaron los ocho paneles en secuencia. |
| Overlays anchos recortados dentro del monitor | El monitor escala el lienzo OBS de 1920 px para mostrarlo completo, también en tablet y móvil. No altera las fuentes ni las medidas originales de OBS. |
| Una Win Streak guardada podía bloquear el arranque al desactivar su killer | La lectura conserva las identidades históricas; nuevas selecciones sólo admiten personajes activos. Se preservan la racha, el nombre de sesión y el historial. |
| Eliminar una entrada podía invalidar tickets de ruleta guardados | Se conservan identidades, donaciones y progreso retirados. Los pools y totales visibles se calculan únicamente con el catálogo activo. |
| Checklist que mezclaba archivo y revisión humana | Cinco comprobaciones automáticas separadas de imagen, nombre, desktop, móvil y animación por herramienta. Editar invalida la revisión anterior. |
| Sin administración del catálogo base | Búsqueda en cuatro catálogos; desactivar, reactivar, eliminar y operaciones explícitas por paquete dentro de una actualización local. Confirmación con lista exacta; deshacer cambios del borrador. |
| Propietarios ausentes en perks históricas | Se informa la ausencia y se permite asociar explícitamente una perk a un personaje. No se inventaron ni dedujeron propietarios históricos. |
| Acumulación de copias locales | Auditor limitado a ubicaciones conocidas de exports y test-results. Ruta, fecha, tamaño, tipo, versión si existe y estado. Sin selección automática ni borrado al auditar. |

## Reutilización del sistema visual

Se sirven directamente desde la base incluida `css/usuario-design-system.css`, `usuario.css`, `usuario-shell-v2.css`, `usuario-stream-modules.css`, `usuario-polish-v4.css`, `usuario-canonical-selects.css`, `usuario-confirmations.css` y sus controladores canónicos. Se utiliza también la base tipográfica y gráfica existente, con fuentes locales Montserrat/Anton; los encabezados específicos heredan la fuente display definida por el sistema.

La única adaptación de la hoja general es retirar su importación remota de Google Fonts al servirla localmente: las mismas fuentes ya están incluidas. Los archivos canónicos originales no se modifican. El Gestor mantiene campos de 48 px, botones de 44 px, bordes y radios del sistema, acento `#FF003C`, etiquetas, paneles y tarjetas originales.

## Administración del catálogo y conservación de datos

Los cambios se guardan en `catalogChanges` del borrador. Los JSON base permanecen inmutables. La preparación aplica esos cambios a una copia, vuelve a validar y genera un manifiesto común para preview, simulación y exportación.

- Desactivar modifica únicamente `enabled`. Conserva key, imagen, aliases, propietario y metadatos.
- Reactivar conserva la misma identidad. Se comprueba la recuperación del progreso y los registros asociados.
- Las acciones por paquete incluyen sólo relaciones de propietario registradas. El catálogo histórico de esta base no tiene esas asociaciones; se deben confirmar con **ASOCIAR A UN PERSONAJE** antes de administrar un paquete histórico.
- Eliminar un personaje con perks asociadas se bloquea si no se elige explícitamente el paquete completo o se eliminan sus perks previamente. Las perks nuevas pendientes también bloquean una eliminación incompatible.
- La lista exacta se vuelve a comprobar en el servidor antes de aplicar. No se borran automáticamente archivos de imagen ni datos del streamer.
- Eliminar una perk actualiza sólo sus referencias en el catálogo de incompatibilidades.
- Se mantienen controles de revisión concurrente, origen local, sesión, rutas permitidas e integridad de los archivos preparados.

El parche de administración puede contener sólo cambios de catálogos, sin altas nuevas. Los parches contienen los cinco JSON, assets nuevos cuando corresponden y README. La exportación manual usa los mismos archivos modificados del manifiesto.

### Compatibilidad del Streamer

La copia de prueba incorpora las correcciones de `counter-model.cjs`, `wheel-model.cjs` y `challenge-model.cjs`. El parche inicial del sistema de catálogos incluido en v2 también se actualizó con esos tres archivos.

Antes de aplicar desactivaciones o eliminaciones al programa habitual, hay que aplicar el **parche inicial actualizado de esta v2**, incluso si se había instalado el de v1. Luego se aplica el parche de contenido. Esto no cambia sus URLs OBS ni reemplaza sus datos. Esta tarea no instala nada en el programa habitual.

## Auditor y limpieza

La auditoría se limita a patrones identificados del proyecto bajo `exports/` y a temporales de pruebas del Gestor bajo `repo/dbd-content-test/test-results/`. No recorre otras carpetas de la PC ni admite rutas arbitrarias enviadas desde la interfaz.

Se protegen el Gestor actual, su carpeta datos y carpetas que lo contienen, el programa habitual del streamer, AppData, la raíz del repositorio y la carpeta del Escritorio **Programa para cargar Superviviente-Killer**. Los temporales identificados dentro de test-results se muestran individualmente, sin ofrecer la raíz Git como candidata.

Cada selección manual produce un plan temporal con rutas, archivos y espacio. Se vuelve a comprobar el estado del disco; cambios posteriores o enlaces/junctions bloquean la operación. Se exige una confirmación específica. El destino es la Papelera de Windows, sin alternativa de borrado permanente. El espacio se libera al vaciarla.

La prueba de envío a Papelera usa un sustituto controlado sobre carpetas ficticias: **no se movió ni borró ninguna copia antigua real para probar la función**. Durante la entrega sólo se retiran los temporales creados en esta revisión, después de conservar los informes y capturas necesarios.

## Pruebas

- 27 pruebas de catálogo, mantenimiento Windows, gestor v1/v2 y migración del Streamer. Incluyen cantidades variables, sólo perks, aliases, propietarios, corrupción de imágenes, nombres descargados, transparencia, bytes originales, prefijos, manifiestos, ZIP, concurrencia, publicación simulada y bloqueo por cambio de base.
- Nuevas pruebas de desactivación/reactivación, operaciones por paquete, eliminación explícita, incompatibilidades, asociaciones de propietario, migración de datos v1 y revisión visual por aspecto.
- Conservación de Win Streak, historial, challenges y donaciones al desactivar/reactivar/eliminar; entradas retiradas excluidas de pools y totales activos.
- Auditor sin selección ni borrado automático; rechazo de ubicaciones protegidas, selección vacía, confirmación incorrecta, cambios de disco y enlaces de carpetas.
- Regresiones adicionales de ajustes privados y comportamiento de ruleta.
- Las 11 comprobaciones integradas anteriores de navegador siguen funcionando: WEB real, tres ruletas, cuatro Tierlist, USUARIO real, challenges, Win Streak, Streamer, overlays, archivos preparados, parche y exportación. La publicación se cancela y GitHub se prueba únicamente con API simulada.
- Revisión v2 con el borrador y las ocho imágenes reales del usuario: formularios y agrupación en 1440, 900, 740, 390 y 320 px; ocho paneles Streamer en 1440, 900 y 390 px; siete monitores, animaciones y resultados de ruletas; administración y auditoría por interfaz.
- Comprobación del ZIP extraído, dependencias portátiles y arranque del BAT real. Se comparan los archivos del paquete y se comprueba que los cuatro catálogos base no incluyen Terrifier.

Los informes y capturas seleccionadas acompañan la entrega. Los fixtures sintéticos de QA y sus borradores no se incluyen como datos del usuario.

## Entrega y migración

Archivo: **SanLean-Gestor-Contenido-DBD-PRUEBA-v2.zip**. Incluye el programa completo y este informe.

Se encontró el borrador real en el Escritorio, dentro de **Programa para cargar Superviviente-Killer / SanLean-Gestor-Contenido-DBD-PRUEBA / SanLean-Gestor-Contenido-DBD-PRUEBA**. Tenía ocho elementos, ocho assets y revisión 18. Se conserva intacto y se verifican sus hashes.

La entrega v2 incorpora una copia de las actualizaciones/imágenes y del progreso local de esa instalación. No vuelve a copiar las preparaciones ni los ejecutables de preview regenerables. Para comenzar: abrir el BAT, entrar a TERRIFIER — 2026, validar y abrir la vista previa. No es necesario volver a cargar las imágenes.

Para una migración manual futura, cerrar ambos gestores, extraer v2 en una carpeta nueva y vacía y copiar allí `datos/` completo de v1. Conservar la carpeta original como respaldo. No combinar dos carpetas datos con trabajo distinto sin respaldo. El lector v2 conserva los campos anteriores, reinicia la revisión visual antigua y solicita regenerar las preparaciones ausentes.

La entrega ya guardada en esta PC se puede abrir directamente: no hace falta descargar otra copia. Se mantiene una carpeta final y su ZIP, además de la instalación v1 que el usuario conserva como respaldo.

## Límites y pendientes autorizados

- No se ejecutó la publicación autenticada real. La prueba de rama, commit y PR queda para una tarea posterior autorizada; no habrá merge automático.
- La eliminación real a Papelera no se ejecutó sobre copias personales. Se validaron selección, confirmación, protección y revalidación con datos ficticios y un sustituto del envío.
- Los propietarios históricos requieren confirmación explícita; no se asignaron por intuición.
- La comprobación visual usa Edge/Chromium en Windows; no equivale a revisar todas las escenas personales de OBS ni todos los equipos posibles.
- Una actualización de la rama base exige revisar una nueva base del paquete y volver a validar los borradores; se mantiene el bloqueo ante divergencia.
- No se creó una guía Word.
