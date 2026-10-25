# CÓDIGOS — laboratorio público aislado

Ruta: https://sanlean.com.ar/codigos/ (`?debug=1` muestra diagnóstico).
Sin enlaces de entrada desde el sitio, sin sitemap y con `noindex,nofollow`.
La URL y los JSON son públicos: REVIEW significa pendiente editorial, no privado.

## Alcance y presentación

Todos los archivos son nuevos. No se modifica ninguna página, navegación, fondo,
footer global o archivo de USUARIO. La página carga las hojas y navegación públicas
existentes; las reglas propias viven exclusivamente en `codigos/codigos.css`.
Usa Anton/Montserrat, #FF003C, fondos actuales, tarjetas oscuras y botones redondeados.
`<base href="/">` mantiene correctos los enlaces existentes al usarlos en una subruta.
El modo normal jamás carga ni muestra candidatos REVIEW.

## Archivos

- `codigos/index.html`, `codigos/codigos.css`, `codigos/codigos.js`: página independiente.
- `data/codigos.json`: catálogo confirmado e historial, fuentes y textos oficiales.
- `data/codigos-review.json`: candidatos pendientes con motivo y publicación.
- `scripts/codigos/sources/bluesky.mjs`: acceso público y validación de identidad.
- `scripts/codigos/sources/index.mjs`: registro modular de fuentes habilitadas.
- `scripts/codigos/detector.mjs`: clasificación y extracción conservadora.
- `scripts/codigos/catalog.mjs`: deduplicación, historial y cambios semánticos.
- `scripts/codigos/update.mjs`: actualización transaccional respecto de publicación.
- `.github/workflows/update-dbd-codes.yml`: automatización.
- `tests/dbd-codes.test.mjs`, `tests/fixtures/codigos/official-feed.json`: pruebas y
  extractos de publicaciones oficiales reales (no datos inventados del catálogo).

## Fuente V1

Cuenta: https://bsky.app/profile/deadbydaylight.com
DID permitido: `did:plc:rrbpnmgc4i2nn6naohkdsbhj`.
Endpoint: `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed`.
Antes de consultar el feed se valida también `app.bsky.actor.getProfile`.
Sin autenticación, contraseña, cuenta nueva ni API key.
Se excluyen reposts, identidades distintas y contenido citado de terceros.
Ventana móvil de 150 días, hasta 12 páginas de 100 entradas, con reintentos y timeout.
Una consulta incompleta o identidad distinta aborta sin publicar datos parciales.
El historial del catálogo se conserva aunque una publicación salga de la ventana.
Se guardan URL/alt de imágenes oficiales como evidencia; no se descargan ni renderizan.
No se lee texto incrustado en imágenes ni se recorren hilos/respuestas.

Fuentes futuras X_ES y DBD_WEB quedan desactivadas en el registro. X Español
no tiene integración paga, scraping, intermediario ni RSS. La página oficial
https://deadbydaylight.com/news/ se evaluó, pero no se verificó un contrato público
estructurado estable apto para esta V1; no se agregó scraping de su página dinámica.

## Detector y estado

CONFIRMED exige identidad oficial y una instrucción explícita de canje asociada
con un único código. Normaliza uppercase y deduplica por `code`. Conserva todas las
publicaciones en `sources`. Recompensas se conservan en idioma original; si faltan,
se indica la ausencia. `this Charm` es literalmente el anuncio de MACHETE: no se
inventa el nombre a partir de su imagen.
Noticias de NieR y «DIABLO COLLECTION AVAILABLE NOW» son REJECTED.
Varios códigos, negaciones, ejemplos, disponibilidad futura o contexto incompleto
van a REVIEW. MAURICEPRIDE + WORLDPRIDE2026 quedan en REVIEW porque su anuncio no
asocia individualmente las dos recompensas.
No se reactiva automáticamente un código finalizado que reaparece: va a REVIEW.

Solo un plazo con día, hora y zona inequívocos produce `expiresAt` ISO. ET se
convierte con America/New_York (incluye horario estacional). Un año omitido solo se
infiere del año de publicación cuando no implica un salto de año, y queda señalado.
Los plazos parciales conservan `expiryText` y `expiryPrecision`; no se inventa una
fecha/hora oficial. `expiryUpperBound` es un límite conservador de ordenamiento,
NO un timestamp de vencimiento y NO dispara finalización automática.

**Únicamente `expiresAt` dispara active → expired automáticamente.** Si falta,
se mantiene activo hasta revisión/evidencia oficial. Sin plazo alguno aparece
«SIN FECHA DE FINALIZACIÓN CONFIRMADA». ROADTRIP dice «until October 2027», no un
día inventado. Para los códigos históricos SHINEBRIGHT, BIKERIDE y THESLASHER,
el plazo oficial ya pasó al 25/10/2026: la carga inicial guarda `statusEvidence`
de esa revisión y mantiene expiresAt null. STARSGUIDE y CROWCAW sí tienen hora ET.
Nunca se borra el historial. ACTIVO refleja anuncios oficiales, no una prueba de
canje real dentro del juego. Los anuncios pueden cambiar o resultar incompletos.

## Actualización y publicación

GitHub Actions ejecuta `17,47 * * * *` (UTC: cada 30 minutos), `workflow_dispatch`
y push a main de archivos del detector/workflow/tests. Permiso global contents:read;
solo el trabajo actualizador tiene contents:write para los dos JSON. Usa el token
integrado efímero de GitHub, sin secretos o credenciales nuevos. Concurrencia serial,
10 minutos máximo. No instala paquetes. Ejecuta las pruebas antes de consultar.
Solo commitea si cambian entradas/evidencia/revisiones/estados; no cambia timestamps
cada 30 minutos. Logs y resumen incluyen consultas, candidatos y clasificaciones.
Un conflicto de push falla sin forzar ni sobrescribir otros cambios.

Los commits del token integrado NO disparan otro workflow/Pages automáticamente.
Por eso únicamente esta página consulta el JSON público de `main` en
raw.githubusercontent.com, con cache:no-store y parámetro de actualización.
No se modifica la configuración global de Pages ni se requiere un PAT. Si falla,
se usa la copia incluida en Pages y se muestra aviso con su fecha. El CDN puede
introducir minutos de demora. Una pestaña se actualiza al recargar la página.
Debug consulta además el último run público de Actions; si GitHub limita esa
consulta, muestra «No disponible». Sus contadores son los del último cambio de
catálogo; las consultas sin cambios se consultan en los logs del workflow.

Manual: GitHub → Actions → Update DBD codes → Run workflow → main.
Pausa: Disable workflow en esa misma pantalla. No hay automatización de Codex.
GitHub puede demorar/omitir ejecuciones programadas y deshabilita schedules en
repositorios públicos sin actividad durante 60 días. Revisar Actions si deja de
actualizar. No garantiza detección instantánea ni cobertura exhaustiva.

## Costos y límites

Repositorio público y runner estándar Linux de GitHub Actions, API pública Bluesky:
sin pago, nuevas cuentas, suscripciones, API keys ni servidor permanente. No se
contrata ningún servicio. X y otras integraciones quedan para evaluación futura.
El detector prioriza precisión sobre cobertura: anuncios ambiguos pueden requerir
revisión y códigos publicados solo como imagen pueden no detectarse.

## Validación

`node --test tests/dbd-codes.test.mjs`
`node scripts/codigos/update.mjs`
Una segunda ejecución con la misma evidencia debe informar «Cambios realizados: no».
El catálogo inicial contiene 7 activos y 5 finalizados; todas las tarjetas conservan
su URL oficial. Las pruebas cubren falsos positivos, fuente adulterada, múltiples
códigos, deduplicación, idempotencia, zona horaria, plazos parciales y fallos de identidad.
Pruebas de navegador: 1440, 740, 390 y 320px; copiar real/feedback, estados,
fuentes, menú mobile, no desborde, recuperación de fallo de datos y sin errores JS.

Referencias técnicas oficiales:
- https://docs.bsky.app/docs/api/app-bsky-feed-get-author-feed
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow
