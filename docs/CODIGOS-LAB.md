# CÓDIGOS: arquitectura real multifuente

Ruta aislada: https://sanlean.com.ar/codigos/; diagnóstico: `?debug=1`.
Sin enlaces desde menú/footer y con noindex,nofollow. No es una ruta privada.
No se modifican páginas existentes, estilos compartidos ni USUARIO.

## Calendario único en GitHub Actions

Workflow `.github/workflows/update-dbd-codes.yml`, cron `17,47 * * * *` (UTC).
No depende de ejecuciones manuales. workflow_dispatch es respaldo; push de archivos
propios dispara validación. Un único motor elige el trabajo pendiente:

- FAST: cada ejecución de 30 minutos; Bluesky desde último éxito con 2h de solapamiento,
  Wiki solo IDs de revisión de cinco páginas y contenido que haya cambiado.
- FULL: primera ejecución tras 6h desde la última conciliación profunda correcta;
  Bluesky 150 días, Wiki revisiones y actualización de referencias de imágenes.
- DAILY: primera ejecución tras 24h desde la última diaria correcta; Bluesky 365 días
  más consulta directa de posts de códigos activos existentes; Wiki vuelve a leer
  las páginas observadas aunque su revisión no haya cambiado. Incluye FULL.
- Primera ejecución o caché ausente: DAILY. Retrasos no pierden la ventana: se calcula
  por timestamps persistidos, no por igualdad exacta de la hora del runner.
- Cada ejecución evalúa expiraciones locales, incluso si fallan todas las fuentes.

GitHub puede retrasar u omitir schedules bajo carga y desactivarlos tras 60 días sin
actividad en repositorios públicos. No se ofrece SLA ni tiempo real. Se conserva el
catálogo; la próxima consulta recupera novedades. El diagnóstico avisa ATRASADA
cuando no hay éxito registrado en más de 6h. No aparece esa alarma en modo normal.

## Fuentes habilitadas

1. Bluesky, `official_direct`:
   `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed`.
   Identidad exacta deadbydaylight.com y DID ya permitido; sin autenticación.
   getProfile verifica identidad; getPosts reconcilia anuncios activos en DAILY.
   No se interpreta una imagen/noticia como código sin instrucción de canje.
2. Wiki, `official_wiki` (comunitaria apoyada oficialmente, NO official_direct):
   `https://deadbydaylight.wiki.gg/api.php`, MediaWiki action=query.
   Revisiones: prop=revisions; contenido: rvslots=main, rvprop=ids|timestamp|content;
   imágenes: prop=imageinfo, iiprop=url. Sin autenticación ni scraping HTML.
   Páginas limitadas:
   - Template:General Event Charms
   - Template:General Event Banners
   - Template:General Event Badges
   - Template:Special Banners
   - Template:Special Badges
   En FULL/DAILY busca también candidatos REVIEW por código exacto (máximo 20,
   hasta 3 resultados por código). Solo acepta filas con instrucción explícita;
   las páginas relevantes descubiertas se observan por revisión (máximo 25 total).
   Parser por filas de tabla y texto explícito Redeemable via code. Nombres/recompensas
   múltiples se unen por código. Conserva revisión, página y cláusula como evidencia.
   No importa referencias históricas anteriores a 2026 como novedades; sí concilia
   códigos históricos ya presentes. Now redeemable permite disponibilidad explícita
   sin inventar vencimiento. La cobertura es deliberadamente limitada, no toda la Wiki.

Fuentes conocidas pero desactivadas (`sources/index.mjs`): web DBD /news/ sin contrato
público estable verificado, Discord dbd-announcements por requerir autenticación y
permisos, X @deadbydaylight, @DbDBHVR_ES y @DbDPulse, registradas como official_direct
según el proyecto, pero sin API paga, scraping, intermediarios o cuentas nuevas.
No se ha verificado contenido nuevo de esas cuentas mediante esta automatización.
Fuentes comunitarias comunes solo aportan candidatos REVIEW, nunca publicación.

## Estado y diagnóstico sin commits artificiales

CODE_STATE_PATH apunta a /tmp/codigos-runtime/state.json en el runner Ubuntu.
Caché Actions restore/save preserva cursores, revisiones, imágenes y salud por fuente:
lastAttemptAt, lastSuccessAt, lastError, itemsFetched y candidatesFound.
Cada run tiene clave nueva, recupera la anterior por prefijo; tamaño pequeño y sujeto
al límite/evicción de caché estándar. La pérdida de caché dispara reconciliación DAILY.
El estado NO está versionado y no se escribe en data solo para registrar consultas.

`publish-health.mjs` publica un check GitHub `Codigos-health` con diagnóstico pequeño,
sin cursores ni secretos. `?debug=1` lo lee mediante REST público. El estado completo
sigue en caché; logs y step summary documentan cada intento. Permisos del job:
contents:write para datos; checks:write para diagnóstico. Token efímero integrado,
ninguna credencial nueva. Concurrencia serial. No force push ni continue-on-error.
Si ambas fuentes fallan, el job publica salud fallida después de conservar expiraciones.
Un fallo parcial queda visible como fuente con error; la otra continúa.

Solo se commitean cambios semánticos de catálogo/revisión: código, fuente, recompensa,
imagen, vencimiento, estado o evidencia. Dos runs idénticos no producen commits.
Las actualizaciones de bots no disparan Pages; la página lee JSON de main mediante
raw.githubusercontent.com y conserva fallback al JSON de Pages con aviso de antigüedad.

## Jerarquía, deduplicación y expiraciones

Clave: code.toUpperCase(). `sources[]` conserva evidencia de ambas fuentes.
Datos directos ya informados tienen prioridad; Wiki puede completar campos ausentes,
pero no sustituye recompensas curadas de imágenes ni gráficas directas.
Wiki se identifica en la UI como WIKI OFICIAL DE DBD. Una revisión Wiki no se presenta
como fecha de publicación de un anuncio; `publishedAt` queda null si no se conoce.
Fechas contradictorias entre recompensas Wiki no se resuelven eligiendo una al azar.
No hay eliminación automática del historial ni reactivación silenciosa de expirados.

- Hora/zona explícita: expiresAt exacto (ET convertido con America/New_York).
- Solo día: cutoff de sistema al final del día UTC; `expiryPolicy` registra esta
  convención, que NO es una hora anunciada por Behaviour.
- Texto «before día»: cutoff al comienzo de ese día UTC.
- Solo mes: final del mes UTC; en pantalla sigue figurando solamente mes/año.
- Sin fecha: no se inventa expiresAt ni se finaliza automáticamente.
- expiresAt vencido: active → expired localmente; UI deriva ambas secciones del JSON.

GROUNDCHUCKHBD: Ground Chuck Charm, 31/10/2026, fuente General Event Charms,
imagen de recompensa VAN_017.png obtenida por imageinfo; no se presenta como gráfica
original de redes. FINDERSCREEPERS combina evidencia directa y plazo Wiki 25/11/2026.
MISSBEHAVIOURGC2026: Pixel Dwight Banner + Pixel Sable Banner desde Special Banners,
sin fecha inventada. BPFFM2026 y PLAYXENOMORPHIN2V8 siguen en REVIEW sin confirmación
en las fuentes habilitadas. Los candidatos resueltos guardan resolvedBy.

## Imágenes y UI

Prioridad: gráfica directa > imagen oficial relacionada > recompensa Wiki > bloque
oscuro con código y SIN IMAGEN OFICIAL. Solo URLs de hosts permitidos, sin descargas
masivas ni imágenes fan/IA. Los blobs del CDN no garantizan conservación permanente;
si falla una URL, fallback de tamaño estable y log `image unavailable`.

Diseño conservado: 3 columnas >1200px, 2 hasta 1200px, 1 hasta 760px; radio14px,
contain, archivo horizontal con drag mouse y swipe nativo. Copiado sin cambio de
geometría. Hover rojo/glow solo en activas y zoom1.03 solo desktop. Lightbox solo
imágenes activas con cierre X/backdrop/Escape, foco contenido en dialog y retorno al
botón. Scrollbar fina con thumb #FF003C opaco. No lightbox sobre el archivo.

## Costos y verificación

Repositorio público + ubuntu-latest estándar: minutos de Actions sin coste adicional.
No larger runners, pagos, nuevas cuentas, API paga, Supabase ni servidor externo.
Caché pequeña dentro del límite estándar; no se incrementa almacenamiento contratado.

Pruebas:
`node --test tests/dbd-codes.test.mjs tests/codigos-multisource.test.mjs`
Incluyen ambas fuentes funcionando, cada caída por separado, ambas caídas con expiración
local, no-op, deduplicación, prioridad, múltiples recompensas, imágenes, REVIEW y modos.
Fixtures Wiki provienen de la API real. La salud real debe comprobarse en Actions;
las pruebas de fallo son simulaciones explícitas, no caídas provocadas a terceros.

Referencias:
https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
https://docs.github.com/en/billing/concepts/product-billing/github-actions
https://docs.discord.com/developers/resources/message#get-channel-messages
