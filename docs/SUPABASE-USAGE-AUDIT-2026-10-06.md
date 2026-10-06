# Auditoría de consumo — 6 de octubre de 2026

## Estado comprobado

Proyecto SanLean, organización Free. Se revisaron Usage en la sesión real de Supabase, logs agregados, esquema y tamaños actuales, código publicado y la cuenta real de Cloudflare. El repositorio se actualizó a `e2f2f81` antes de trabajar para conservar los últimos cambios de roles y accesos.

Usage muestra el ciclo **23/09–23/10/2026**:

| Métrica | Valor mostrado |
| --- | ---: |
| Edge Function Invocations | 1.312.135 / 500.000 |
| Egress | 10,168 / 5 GB |
| Cached Egress | 0 GB |
| Storage | 0 GB; consulta actual: cero objetos |
| Realtime | 290 / 2.000.000 mensajes; pico de 2 conexiones |
| Usuarios activos mensuales | 2 |
| Tamaño de base en Usage | 28,77 MB |

La consulta directa `pg_database_size(current_database())` da 14 MB. No coincide con la cifra mostrada por Usage; ninguna explica los 10 GB de transferencia. Las tablas mayores son chat (432 KiB), ajustes privados de ruletas (360 KiB) y overlays (336 KiB). No se borraron datos, historiales, recibos ni archivos.

**Alerta operativa:** el panel informa final del período de gracia el **07/10/2026** y posibles respuestas HTTP 402 si continúan las restricciones por exceso. El texto del banner dice “previous billing cycle”, aunque el selector muestra el ciclo 23/09–23/10: se registra literalmente esta inconsistencia del panel. No se interpreta como garantía de continuidad. Optimizar no elimina el acumulado ni garantiza que Supabase levante una restricción. No se contrató ni cambió el plan. **Restricción del usuario: mantener todo gratuito; no activar suscripciones ni cobros por excedentes.**

## Qué produjo el consumo

El correo citado por el usuario (1.294.914 invocaciones y 9,12 GB) es una captura anterior al total actual. No hay un desglose completo por ruta de ese acumulado exacto en los logs disponibles: no corresponde atribuir cada una de esas invocaciones históricas a una función sin evidencia. Sí se comprobaron el patrón anterior, la caída tras el cambio y el origen actual.

El informe del 01/10 conserva una muestra anterior de 295.593 llamadas a `stream-overlay` y 33.439 a `stream-bits/alerts` en 24 h. El primero era un intermediario que descargaba el mismo estado reiteradamente. Desde el cambio a RPC directa, desaparece de la muestra actual, pero OBS seguía descargando settings/state completos cada 500 ms.

Valores diarios visibles del gráfico de Usage (redondeados por la interfaz):

| Día | Edge invocations | PostgREST egress | Functions egress |
| --- | ---: | ---: | ---: |
| 27/09 | 108 mil | 396,308 MB | 358,264 MB |
| 28/09 | 341 mil | 914,774 MB | 658,885 MB |
| 29/09 | 275 mil | 656,187 MB | 451,704 MB |
| 30/09 | 365 mil | 911,510 MB | 557,543 MB |
| 01/10 | 147 mil | 777,431 MB | 190,943 MB |
| 02/10 | 33 mil | 1,321 GB | 2,777 MB |
| 03/10 | 24 mil | 1,312 GB | 2,004 MB |
| 04/10 | 2 mil | 109,732 MB | 176,011 KB |
| 05/10 | 7,4 mil | 433,573 MB | 645,340 KB |
| 06/10, parcial | 9,8 mil | 563,321 MB | 851,815 KB |

El 05/10, PostgREST representa **99,8 %** del egress diario. Storage apenas registró 2,734 KB y 1,238 KB el 29 y 30/09; hoy no tiene objetos. Los sonidos predeterminados, imágenes, CSS y JavaScript están en GitHub Pages, fuera de Supabase. El peso principal actual es repetir respuestas de datos, no servir archivos pesados.

Logs de funciones: ventana fija **05/10 17:20 UTC–06/10 17:20 UTC** (14:20 de Argentina):

| Ruta, sin OPTIONS | Solicitudes | Errores HTTP |
| --- | ---: | ---: |
| stream-bits/alerts | 13.541 | 0 |
| stream-bits/status | 53 | 0 |
| stream-bits-sounds/status | 41 | 0 |
| stream-bits/webhook | 14 | 0 |
| stream-kick/status | 11 | 0 |
| stream-bits-sounds/resolve | 5 | 0 |
| stream-bits/test-alert | 1 | 0 |
| **Total facturable observado** | **13.666** | **0** |

64 OPTIONS se excluyen. **99,1 %** son lecturas periódicas de alertas. No hay tormenta de errores. Una muestra REST tomada minutos antes mostró 237.922 lecturas de overlays, 237.964 preflight OPTIONS, 27.199 lecturas de eventos Bits, 13.710 de settings Bits y 13.641 de bonos. El endpoint anterior de alertas hacía varias consultas internas por llamada. Estos conteos REST no son invocaciones Edge adicionales.

Las cabeceras `content_length` de los logs son incompletas y no equivalen al contador de egress; no se usaron para reconstruir GB facturados. No se guardan tokens, IPs, contenidos de mensajes ni nombres de donantes en el informe.

## Cambios

1. **OBS: lectura condicional.** `get_stream_overlay_delta` invoca la lectura ya autorizada por token y calcula una revisión sobre el resultado completo. Si no cambió, devuelve revisión y `payload:null`; si cambió, devuelve la instantánea completa. La autorización se comprueba en cada consulta, incluso si coincide la revisión. Cambios de settings con igual número de opciones, cambios de estado y revocación no se ocultan. El cliente conserva animaciones en respuestas sin cambios. Frecuencia: **500 ms después de cada respuesta**, sin ralentizar ruletas, CARTAS, METAS, DESAFÍOS ni SORTEOS.
2. **Bits: lectura directa y separada por modo.** `get_stream_bits_feed` reemplaza el intermediario `/stream-bits/alerts` para clientes nuevos. El token de alertas determina el workspace en el servidor; el cliente no elige workspace. Modo alerta lee solo eventos/sonido; modo entradas activas lee los bonos y pausa. Conserva ventana de cinco minutos, página de 50, cursor inicial sin replay y agrupación del dock. El cursor no retrocede ni salta páginas. Mantiene **2 s para alertas y 5 s para entradas activas**. No altera webhooks, OAuth, reglas, cantidades, vencimientos, giros ni escrituras.
3. **Chat: Realtime primero.** Con Realtime suscrito, respaldo REST cada 15 s, en lugar de cada 800 ms; los mensajes Realtime se procesan al instante. Desconectado vuelve al intervalo rápido. Fallos REST tienen espera progresiva hasta 30 s y timeout de 12 s. Una página llena se recupera inmediatamente en el siguiente tick. No se avanza el cursor REST con eventos Realtime, evitando perder mensajes intermedios. Se descartan respuestas y estados de canales anteriores al cambiar workspace.
4. **Audio predeterminado versionado:** permite caché de navegador/CDN para los archivos estáticos con versión. El audio personalizado conserva su actualización inmediata y su mecanismo actual; Storage está vacío, por lo que migrarlo ahora no tendría ahorro medible.

Las dos funciones públicas nuevas son `SECURITY INVOKER`. Solo el helper de Bits es `SECURITY DEFINER`, en esquema privado con `search_path=''`, validación de token y lista explícita de campos. Se habilita ejecución a `anon`, `authenticated` y `service_role`, y uso del esquema auxiliar a `anon`/`authenticated`. No se conceden permisos de lectura directa ni escritura de tablas. La revisión automática pidió autorización específica para estos permisos y el usuario la concedió en esta conversación antes del despliegue.

## Ahorro esperado y límites

- Bits elimina las **13.541 invocaciones/día** del intermediario de la muestra después de recargar sus fuentes OBS. Quedarían unas **125/día**, o **3.750/30 días**, si se repite exactamente el resto del patrón observado: reducción arquitectónica del **99,1 %** de Edge frente a esa muestra. Más streams, mensajes/webhooks, pruebas y sesiones cambian esa proyección. No es una medición mensual posterior al despliegue.
- Overlay sin cambios: el JSON completo actual mide **799–29.716 bytes**; la respuesta compacta ronda **65 bytes** más el envoltorio de la lista. Reducción del cuerpo JSON de aproximadamente **92–99,8 %** en esas respuestas. Settings y estado completos siguen viajando cuando cambian. Compresión, cabeceras, preflight y otras rutas impiden trasladar ese porcentaje literalmente al egress total facturado.
- Chat conectado: aproximadamente **95 % menos consultas REST de respaldo** (de hasta 4.500/h a unas 240/h, antes de latencia/ticks), sin demorar los eventos Realtime.
- El número de comprobaciones OBS no cambia; siguen generando consultas a base y preflight. La optimización principal es su tamaño. Para muchos streamers conviene una futura distribución por eventos autorizados, con recuperación por cursor; no cachear públicamente los estados privados ni tokens.
- Los clientes abiertos con código viejo siguen usando sus endpoints anteriores hasta recargarlos. Se mantienen esos endpoints para compatibilidad y rollback.

## Cloudflare

Cuenta real revisada después de que el usuario inició sesión. `sanlean.com.ar` usa nameservers de Cloudflare, pero los cuatro A de GitHub Pages y el CNAME `www` están en **DNS only**. El panel muestra cero tráfico/caché HTTP. Workers & Pages informa **No projects found** y cero solicitudes. El repositorio no contiene configuración de Workers/R2 ni endpoints Cloudflare.

R2 no está activado: el panel muestra la pantalla de contratación “Add R2 subscription to my account”, con cuota gratuita y cobros por excedentes. No se activó, respetando la instrucción del usuario de mantener todo gratis.

No se cambia el proxy del dominio completo para solucionar egress de llamadas directas a `*.supabase.co`: no reduciría ese tráfico y afectaría también a la WEB pública. Los recursos estáticos ya están fuera de Supabase, en el CDN de GitHub Pages (`Cache-Control: max-age=600`). No hay contenido estático en Supabase que justifique una migración a Cloudflare en esta auditoría.

## Validación y operación

- Navegador aislado a 320, 390, 740 y 1440 px: render/actualización, delta sin reiniciar animación, acceso visual/control, token revocado, cursor Bits tras fallo, ambos modos, una sola cadena de polling, backoff y recuperación.
- Pruebas de chat: entrega Realtime inmediata, deduplicación, plataformas, cambio de workspace, respaldo espaciado, recuperación rápida y backoff.
- SQL con fixtures de dos propietarios y rollback: tokens inválidos, autorización, lectura/control, cambios y revocación, separación de workspaces, dos páginas de eventos, no replay inicial, expiración/pausa, denegación de tablas e ingestión falsa. Sin filas persistentes ni avance de la secuencia de eventos.
- HTTP real: token inválido de overlay devuelve `200 []`; Bits devuelve `401 Invalid alert token`.
- Regresiones: CARTAS, ajustes privados, firmas/OAuth Kick y suscripciones Twitch aprobadas.
- Advisors antes/después: mismas advertencias preexistentes, ninguna adicional. Las funciones antiguas de overlay tienen avisos por ejecución con token; tablas exclusivamente de servidor tienen RLS sin políticas de cliente; protección contra contraseñas filtradas estaba desactivada. No se altera esa configuración en esta tarea. [Guía de Advisors](https://supabase.com/docs/guides/database/database-linter), [contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Tras publicar, recargar MI PANEL y las fuentes de navegador de OBS. Comparar un día representativo posterior en Usage (puede demorar una hora) con las horas/fuentes de stream equivalentes. Revisar especialmente PostgREST Egress y ausencia del polling `stream-bits/alerts`. El acumulado ya consumido se mantiene hasta el reinicio del ciclo.

Rollback: restaurar los tres scripts y sus referencias HTML del commit previo; los endpoints anteriores siguen disponibles. Las funciones nuevas son aditivas, no reemplazan ni borran tablas. No revocar permisos de esquema sin comprobar dependencias futuras.

Fuentes: [Usage de la organización](https://supabase.com/dashboard/org/dripxbflxoxhnxxdzbkr/usage), [egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress), [invocaciones](https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations), [Fair Use](https://supabase.com/docs/guides/platform/billing-faq#fair-use-policy), [Cloudflare DNS/proxy](https://developers.cloudflare.com/dns/proxy-status/).
