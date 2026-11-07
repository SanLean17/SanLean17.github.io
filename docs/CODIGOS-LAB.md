# CÓDIGOS — funcionamiento auditado el 7 de noviembre de 2026

Alcance: sección pública https://sanlean.com.ar/codigos/ y sus automatizaciones.
No se modifican USUARIO, otras páginas, CSS, tarjetas, imágenes ni navegación.

## Fuentes habilitadas

- Bluesky: API pública, cuenta `deadbydaylight.com`, DID
  `did:plc:rrbpnmgc4i2nn6naohkdsbhj`. Se validan identidad, tipo de publicación,
  URI, fechas y paginación. Reposts y contenido ajeno no confirman códigos.
- Wiki DBD: API MediaWiki de `deadbydaylight.wiki.gg/api.php`; plantillas de
  charms, banners y badges, revisiones e imageinfo. Conserva su procedencia Wiki.
- NightLight: DESACTIVADO, pendiente de consentimiento escrito y canal autorizado.
  No hay scraping, endpoints internos, extracción serializada ni consultas al sitio.
  `scripts/sync_nightlight_codes.py` termina sin red ni cambios de catálogo.
  Su workflow ya no tiene cron ni ejecuta ese script; ejecución manual solo informa
  del bloqueo. Se eliminó el disparador del motor asociado a ese workflow.

Bluesky usa texto y alt; Tesseract local opcional puede leer gráficas oficiales
recientes (14 días, máximo 8 imágenes por ciclo y dos por post). La caché evita
releerlas. Una instrucción inequívoca, un solo código y la identidad validada
permiten confirmar. Ambigüedades, negaciones, múltiples códigos o fechas futuras
van a REVIEW. Errores de OCR quedan en diagnóstico y no bloquean el texto.

## Calendario y recuperación

- Principal `.github/workflows/update-dbd-codes.yml`: `23 * * * *` UTC, horario.
- Respaldo `.github/workflows/codigos-agenda.yml`: `7,37 * * * *` UTC.
- Agenda consulta hasta 100 ejecuciones de main. No despacha si hay un proceso
  en cola/en curso, incluso atrasado. El job principal tiene timeout de 10 minutos.
- La agenda usa `lastCompleteSuccessAt` persistido, no el color verde del workflow.
  Si falta o tiene al menos 60 minutos solicita revisión; tras un fallo parcial
  espera al menos 15 minutos desde el intento para evitar una ráfaga de reintentos.
- Concurrencia serial `update-dbd-codes`, checkout actualizado desde main después
  de esperar el turno y comprobación adicional antes de consultar fuentes: un
  análisis completo de menos de 50 minutos evita duplicados. Un push de código
  fuerza validación y análisis para comprobar la nueva implementación.
- FAST recupera desde la última consulta exitosa de cada fuente con dos horas de
  solapamiento; FULL cada 6 horas mira 150 días; DAILY cada 24 horas mira un año
  y reconcilia publicaciones activas. El ciclo parcial no avanza FULL/DAILY.
- La pérdida de caché vuelve a DAILY; los códigos existentes se conservan y se
  deduplican. Una revisión fallida no elimina datos ni borra cursores válidos.

**Frecuencia observada antes del ajuste:** entre 6/11 17:56:54Z y 7/11 09:17:46Z
hubo cuatro disparos schedule del principal, separados por 5 h 09 min, 3 h 41 min
 y 6 h 31 min. La agenda tuvo intervalos de 3 h 48 min y 6 h 51 min. El análisis
real 42359125440 consultó ambas fuentes correctamente a las 09:18:07Z; no era
un fallo de consulta, de caché o de permisos. Los disparos de respaldo se agrupaban
cerca de NightLight y repetían análisis. Se conserva el respaldo, se desacopla de
NightLight y se impiden las consultas duplicadas.

GitHub Actions puede retrasar u omitir cron. Ninguna combinación de estos dos
workflows garantiza una ejecución exacta por hora. La recuperación ocurre en la
siguiente ejecución recibida. No se instaló un servicio externo ni de pago.
La frecuencia posterior debe medirse con los registros reales; una ejecución
manual/push correcta no demuestra por sí sola puntualidad del calendario.

## Estado, publicación y diagnóstico

- `CODE_STATE_PATH`: caché operacional de cursores, revisiones, imágenes y OCR.
  `/tmp/codigos-runtime/state.json` en Actions; nunca es la referencia NightLight.
- `data/codigos-health.json`: registro durable de la última consulta real. Incluye
  intento, último éxito de alguna fuente, último éxito de TODAS las fuentes,
  errores por fuente, ID/evento de ejecución y último cambio del catálogo.
  Se genera solamente al consultar fuentes, no al omitir un duplicado.
- Catálogo, revisión y salud se publican en un único commit del job. Rebase y
  push tienen hasta tres intentos; un conflicto falla y no fuerza ni sobreescribe.
- El catálogo mantiene su `updatedAt` cuando no hubo cambios semánticos. El
  diagnóstico sí cambia con un análisis real aunque no haya códigos nuevos.
- `publish-health.mjs` además publica `Codigos-health`: fallo total = failure;
  fallo parcial = neutral; ambas fuentes correctas = success. Registra también
  el resultado de publicación. Si todo falla, se guardan salud y vencimientos
  locales, y el workflow termina fallido después de emitir el diagnóstico.
- `?debug=1` lee el JSON durable de main. Ya no busca un check ligado al HEAD
  actual, que desaparecía de la consulta al avanzar la rama. Más de 90 minutos
  sin análisis completo se informa como atrasado; también muestra cada fuente.
- La web resuelve la revisión actual mediante `git/ref/heads/main` de la API pública
  (no-store y parámetro temporal) y consulta JSON con URL del SHA exacto. Se comprobó
  que raw/main podía devolver una revisión anterior incluso con parámetro temporal.
  La URL por SHA evita esa caché mutable. Al volver/recargar resuelve de nuevo.
  Si falla la API (incluido rate limit) o GitHub raw, usa copia Pages y avisa antigüedad.
  Si también falla, muestra reintento. No consume `data/codigos-nightlight.json`.

## NightLight: solo novedades después de autorización

Se verificaron el 7/11/2026 los términos (última modificación 6/7/2026), §4.1(i–k)
 y §4.2: requieren consentimiento escrito para recopilación automatizada y
extienden restricciones a bot, aplicación y API. La documentación pública
consultada no ofrece una integración de códigos expresamente autorizada.
No se ha solicitado ni obtenido permiso en nombre de SanLean.

El antiguo snapshot completo `data/codigos-nightlight.json` se conserva
sin modificar como registro histórico, pero no se consulta a NightLight desde
el navegador ni se utiliza el snapshot completo para agregar nuevos códigos.

**Restauración puntual de tarjetas que SanLean ya publicaba:** el 7/11/2026
se recuperaron de la copia local preexistente 44 códigos comunitarios que
estaban visibles como activos antes de esta auditoría: 40 clasificados como
permanentes y 4 con una fecha de caducidad conocida. Se conservaron
solamente en `data/codigos-legacy-community.json`, que es una selección
estática y auditable. No se importaron los 195 códigos vencidos históricos,
ni se habilitó nuevamente la recopilación automatizada de NightLight.
La página carga esta copia estática en paralelo con el catálogo oficial,
elimina duplicados por código y prioriza la ficha oficial cuando existe.
Los temporales pasan al historial al vencer y los permanentes no tienen
fecha inventada. El estado de los comunitarios representa la última
información registrada por SanLean, no una verificación en vivo. No se
presenta información comunitaria como confirmación oficial.

Esta restauración de tarjetas **ya publicadas** es distinta de la incorporación
de novedades **futuras**: esa integración sigue desactivada y exige permiso
escrito y la referencia inicial que se detalla a continuación.

`data/codigos-nightlight-state.json` está versionado y marcado
`pending_authorization`, con `activatedAt:null`: todavía NO hay activación.
`scripts/codigos/nightlight-baseline.mjs` implementa una política offline probada,
no un conector activo. Cuando exista permiso y se implemente el canal autorizado:

1. Recibir un snapshot completo de TODOS los códigos, incluidos vencidos y
   permanentes. Validar autorización/canal e identificadores normalizados.
2. Crear y guardar en Git la referencia inicial ANTES de habilitar descubrimiento.
   `activatedAt` será la fecha real de esa operación, no la de esta auditoría.
3. Conservar `baselineIds`, `seenIds`, permiso, canal y checksum. La activación
   no importa nada. La comparación usa pertenencia de IDs, nunca solo fechas.
4. Cambios de imagen, descripción, fecha, desaparición o reactivación de un ID
   original no producen novedades. Los nuevos IDs solo generan REVIEW con
   `official:false` y procedencia comunitaria; requieren corroboración habilitada.
5. Persistir vistos y candidatos atómicamente. No colocar este estado en una
   caché evictable. Estado ausente/corrupto, canal distinto o snapshot incompleto
   bloquean toda importación. Restaurar referencia desde Git; nunca reconstruir
   automáticamente una referencia vacía ni importar el historial por accidente.

Permanece pendiente el permiso y el adaptador del canal que se autorice. La
política offline no debe describirse como una integración terminada.

## Revisión de vencimientos del 7/11/2026

Se revisaron las 28 fichas del catálogo principal y los 44 códigos sin
imagen restaurados desde la copia histórica, contrastando los plazos conocidos
con diversas guías de noviembre y el snapshot local del 6/11.

**Corrección:** `MISSBEHAVIOURGC2026`, `NIGHTSHIFT` y
`GRASPINGTHEDARKNESS` estaban todavía activos en `data/codigos.json`
aunque el último snapshot comunitario que SanLean conservaba ya los marcaba
`expired`. Quedan archivados (`status:expired`) con
`expiryStatusSource:previously_archived_community_status` y
`expiryStatusObservedAt` tomado de ese snapshot. Se desconoce la fecha exacta
de caducidad, por lo que NO se inventa `expiresAt`. Se conservan sus fichas
de Wiki, imágenes y recompensas. La revisión de la Wiki no debe reactivarlos
automáticamente. La evidencia de vencimiento es **comunitaria**, no una
confirmación oficial de Behaviour.

Los otros cuatro códigos limitados del snapshot restaurado
(`DBDXHS`, `DBDXHH`, `DBDDY`, `BPFFM2026`) mantienen las fechas
futuras registradas y coincidentes con varias guías recientes.
Los 40 códigos clasificados en la copia histórica como `expiryPolicy:never`
se mantienen, pero **sin fecha de caducidad conocida no significa garantía de
que siempre sean canjeables**. Algunos directorios externos difieren en
códigos antiguos; no se marca como vencido un código solamente por figurar
en una guía desactualizada. El error de canje del juego puede significar
también que la cuenta ya tiene el premio (soporte Behaviour).

La recopilación automática de NightLight permanece desactivada a la espera
de permiso; este cambio utiliza exclusivamente evidencia que ya estaba
archivada en el repositorio, no implica nuevas consultas a su servicio.

## Precisión, imágenes y vencimientos

Código normalizado NFKC/trim/mayúsculas; una tarjeta por ID. Prioridad de imágenes:
publicación oficial > recompensas Wiki > tarjeta de texto del diseño existente.
Se conservan fuentes, recompensas y gráficos al pasar a CÓDIGOS ANTERIORES.

- Hora explícita: instante exacto; ET usa America/New_York. Expira al alcanzarlo.
- Día sin hora: convención documentada de final de día UTC, no una hora oficial.
- `before` día: comienzo de ese día. Mes: final de mes, etiqueta conserva mes.
- Inicio de disponibilidad no se interpreta como vencimiento.
- Sin fecha verificable: no inventar; no expirar por un snapshot comunitario.
- Fechas incompatibles pasan a `sourceConflicts`/REVIEW; evidencia previa intacta.
- Códigos vencidos no se reactivan automáticamente; una posible reaparición Wiki
  queda para revisión. Nuevos históricos Wiki ya vencidos no se importan.
- El navegador recalcula el estado al cargar sin esperar al próximo workflow.

## Pruebas y evidencia

`node --test tests/*.test.mjs`
`node tests/codigos-gallery.browser.cjs`
`node tests/codigos-publication.browser.cjs`

Incluyen agenda atrasada/duplicada, deduplicación oficial, referencia histórica,
reactivación histórica, pérdida de estado, falta de permiso, fuente caída,
conservación del catálogo, conflictos, precisión temporal, procedencia comunitaria,
texto sin imagen, recarga con datos nuevos, expiración en navegador y reintento.
Los códigos sintéticos solo existen en fixtures/tests; nunca en datos publicados.
Galerías y diseño se comprueban a 1440, 900, 390 y 320 px; recarga a 1440 y 390.
Los resultados de Actions y producción se verifican después del commit final.

Referencias consultadas:
- https://nightlight.gg/terms-and-conditions
- https://docs.nightlight.gg/
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- https://github.com/SanLean17/SanLean17.github.io/actions/runs/42359125440
