# Analytics de la WEB pública

Implementación unificada el 26/10/2026. Measurement ID único: **G-0VBRTF7W0R**.
No se creó propiedad, stream, GTM ni servicio de correo. USUARIO está excluido.

## Instalación

Cada HTML público carga una vez `/js/public-analytics.js` con `defer`. Este archivo
inicializa dataLayer/gtag, configura el ID y descarga gtag.js de forma asíncrona.
Una guarda evita dobles inicializaciones aunque se incluya dos veces. El page_view
es el estándar automático de config; no existe un page_view manual adicional.
Para una nueva página pública basta agregar el mismo script al head.
No incluirlo en USUARIO; además tiene una guarda defensiva para esa ruta.

Páginas: index.html, ruleta-killer.html, ruleta-perks.html,
ruleta-perks-killer.html, ruleta-perks-superviviente.html, 1vs1.html,
halloween.html, tierlist-dbd.html, tierlist-halloween.html, contacto.html,
creditos.html, aviso-legal.html y codigos/index.html.

Antes había snippets HTML en Home y 1VS1 y un cargador alternativo en main.js.
Las otras once páginas ya obtenían Analytics por main.js: no estaban completamente
sin tracking en el código actual. Ambas vías se reemplazan por el archivo dedicado.
Se conservan los observadores roulette_spin preexistentes; no se añadieron eventos
nuevos de ruletas, configuraciones o Tierlist ni se modificó su lógica funcional.

## Eventos

`window.sanleanTrack(nombre, parametros)` permite exclusivamente los eventos y
parámetros declarados en su esquema. No arroja errores aunque gtag falte o falle.
Ampliar ese esquema explícitamente cuando se apruebe otra medición.

| Evento | Cuándo | Parámetros |
| --- | --- | --- |
| code_copy | Después de resolver correctamente clipboard.writeText | code, status, source_type |
| code_source_click | Activación del enlace de fuente | code, source_type, source_host |
| code_image_open | Apertura efectiva del lightbox | code, image_index, image_count |

image_index empieza en 1 y respeta la imagen seleccionada; image_count es la cantidad
verificada asociada al código. No se mide hover, cambio de imagen, drag ni swipe.
No se agregó codes_nav_click: páginas y referrer permiten reconstruir el recorrido.
Enhanced Measurement se conserva según la configuración existente de la propiedad.
Su click saliente genérico y code_source_click son eventos diferentes; para contar
consultas de fuente usar code_source_click, sin sumarlo al click genérico.

## Privacidad y resiliencia

No se leen inputs ni mensajes de Contacto, no se envían emails, nombres, user_id
ni IP manual. La función filtra claves y valores admitidos. page_location y
page_referrer se envían sin query ni fragmento; por diseño no se conserva atribución
UTM de esas URL. No se instala tracking nuevo de formularios.
Los controles siguen funcionando con Google bloqueado o sin el archivo de Analytics.
Sin logs de tracking ni panel nuevo. Un navegador puede mostrar su propio aviso de
recurso bloqueado: eso no es una excepción de la aplicación.

En GA4 revisar Administrar > Flujos de datos > stream web > Medición mejorada.
No activar recopilación de datos proporcionados por usuarios ni de contenido de
formularios. Revisar Redacción de datos (emails y parámetros URL) como protección
adicional. Mantener page views sin duplicar etiquetas o eventos desde otro sistema.
Los ajustes de la propiedad no se cambiaron desde este repositorio.

## Dimensiones e informes

En Administrar > Definiciones personalizadas, registrar dimensiones de alcance
Evento para code, status, source_type y source_host, con esos nombres exactos de
parámetro. image_index e image_count son numéricos; si se necesitan como métricas,
registrarlos como métricas personalizadas de alcance Evento, unidad Estándar.
Para desglosar por posición/cantidad se pueden registrar como dimensiones de evento.
No asumir que aparecen automáticamente como dimensiones de informe. La disponibilidad
para informes puede demorar 24–48 horas tras la configuración.

## Resumen semanal: configuración manual en GA4

Usar la propiedad existente. Con rol Administrador, abrir Informes y el informe
estándar/personalizado deseado; configurar periodo y filtros; elegir Compartir este
informe > Programar correo. Elegir destinatarios con acceso a la propiedad,
frecuencia Semanal, fecha inicial, PDF o CSV y duración (hasta 12 meses). Guardar.
Revisar/renovar en Administrar > Correos programados. No se puede programar Tiempo real.

Incluir usuarios, sesiones, vistas, páginas más vistas, dispositivos, países,
la página /codigos/ y los tres eventos code_copy/code_image_open/code_source_click.
Si no caben en un solo informe, programar informes complementarios. No hay cron,
SMTP, GitHub email, Gmail o proveedor externo en esta implementación.

## Verificación

- `node --test tests/public-analytics.test.mjs`
- `node tests/public-analytics.browser.cjs` con Playwright instalado; admite
  PLAYWRIGHT_MODULE, BROWSER_CHANNEL y CODE_BASE_URL para el sitio publicado.
- La prueba usa el tag real, pero intercepta /collect y devuelve 204 localmente:
  valida los payloads sin enviar visitas/eventos de prueba a Google.
- Comprueba un page_view por página, ID, URL sin consultas, eventos de CÓDIGOS,
  copia fallida sin code_copy y funcionalidad con Google bloqueado.
- Esto no acredita recepción en DebugView/reportes de la cuenta. Para ello el
  administrador puede hacer una visita real autorizada y verificar Tiempo real
  o DebugView en la propiedad existente, sin añadir un panel al sitio.

Fuentes oficiales:
https://developers.google.com/analytics/devguides/collection/ga4/reference/config
https://support.google.com/analytics/answer/9216061
https://support.google.com/analytics/answer/13544947
https://support.google.com/analytics/answer/14240153
https://support.google.com/analytics/answer/13722168?hl=es
