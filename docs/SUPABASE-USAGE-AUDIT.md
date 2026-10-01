# Consumo de Supabase — 1 de octubre de 2026

## Evidencia

Proyecto SanLean (`ugdwieebdgarkjrrpyal`), organización en Free. El correo aportado informa 723.955 invocaciones y un período de gracia hasta el 31 de octubre de 2026, sujeto a las condiciones del propio correo. Su umbral de aviso es 550.000; la cuota publicada del plan sigue siendo 500.000. Ese acumulado no equivale a la muestra de logs que sigue.

Consulta agregada de `function_edge_logs`, desde 2026-09-30 17:59:03 UTC hasta 2026-10-01 17:59:03 UTC (14:59:03 de Argentina en ambos días):

| Ruta | Método | Invocaciones |
| --- | --- | ---: |
| stream-overlay | GET | 295.593 |
| stream-bits/alerts | GET | 33.439 |
| stream-bits/status | POST | 1.489 |
| stream-bits-sounds/status | POST | 159 |
| stream-kick/status | POST | 55 |
| stream-bits/webhook | POST | 46 |
| stream-bits-sounds/resolve | GET | 17 |
| stream-bits/test-alert | POST | 7 |
| stream-bits/connect | POST | 3 |
| stream-bits/callback | GET | 3 |

Los dos primeros grupos provienen de OBS. `stream-overlay` presenta cuatro consultas distintas por token; esto no determina cuántas instancias de OBS había. No se guardan tokens, IPs ni datos personales en este informe. Los 895 OPTIONS observados se excluyen: Supabase no los factura. Hubo un 500 y un 400 en callback; el tráfico dominante respondió 200. No es una tormenta de reintentos por errores: es consulta periódica exitosa.

La base completa ocupa 13 MB. Las tablas más grandes son `user_roulette_settings` (360 kB) y `stream_overlays` (320 kB). Storage registra cero objetos. Los audios predeterminados también tienen dos registros pequeños en `stream_bits_default_audio_chunks` (96 kB de tabla). No hay evidencia de archivos pesados o duplicados que explique las invocaciones. No se borraron registros. Estas medidas no sustituyen las métricas de egress, MAU o Realtime del panel de facturación.

## Qué hace Supabase

Autenticación, cuentas, configuraciones privadas de ruletas, espacios de stream, colaboradores/permisos, estados de overlays, sorteos, conexión Twitch/Kick, recepción de chat y Bits, reglas, entradas con vencimiento, pruebas de alertas y sonidos personalizados. Los recursos visuales del sitio y audios locales se sirven desde GitHub Pages. WEB pública, USUARIO y OBS conservan sus capas separadas.

## Cambios aplicados

- El overlay consulta directamente la RPC existente `get_stream_overlay_by_token`, con la clave publicable. La Edge Function desplegada era un intermediario de esa misma RPC, usando el rol anon. Se verificaron definición, permisos y acceso REST antes de cambiar el cliente. El token sigue limitando la lectura a un overlay habilitado. El control utiliza la misma RPC existente `update_stream_overlay_by_control`; un token de visualización no permite escribir. No hay nuevos permisos ni cambios de esquema.
- Intervalo del overlay: 500 ms después de cada respuesta, frente a 120 ms. Timeout de 12 segundos, consultas seriales y espera progresiva hasta 30 segundos tras errores. Recuperación automática al volver la conexión. No se suspende por `document.hidden`, que puede afectar fuentes OBS operativas.
- La firma de render contempla todos los settings: cambios de opciones con igual cantidad también se reflejan.
- Alertas Bits: 2 segundos entre respuestas. Entradas activas: 5 segundos. Sus contadores visuales siguen actualizándose cada segundo localmente. Se conserva el cursor tras fallos y la espera crece hasta 30 segundos. No se modifica el webhook, la creación de entradas ni los vencimientos.
- El estado de pausa se consulta cada 30 segundos solamente si Bits está visible y la pestaña está activa. Se impiden consultas superpuestas y se descartan respuestas de otro espacio de stream. Las acciones manuales siguen actualizando inmediatamente su estado.
- El listado reciente de Bits deja de consultar con la pestaña oculta. Se actualizan las versiones de los scripts privados para su recarga.

El cambio puede añadir hasta aproximadamente 0,5 s más el tiempo de red al reflejar un cambio del overlay, 2 s más red al detectar una alerta y 5 s más red al refrescar entradas activas. Durante una caída se prioriza evitar reintentos continuos. Los scripts antiguos siguen consumiendo hasta que se recarguen las fuentes de OBS o pestañas que los tienen abiertos.

## Ahorro y planes

Quitar el intermediario elimina el grupo que representa aproximadamente 89,4 % de las invocaciones de la muestra. Las peticiones RPC siguen consumiendo base de datos y transferencia; el intervalo mayor también reduce esas consultas. Esto es una estimación por arquitectura, no una medición posterior al despliegue ni una reducción retroactiva del correo.

Con la latencia media observada de alerts (~801 ms), pasar de 900 a 2.000/5.000 ms reduce sus consultas aproximadamente 39–71 %, según la mezcla de fuentes. Repitiendo el mismo uso diario de la muestra durante 30 días, quedarían aproximadamente 350.000–660.000 invocaciones Edge al mes, antes de medir el efecto adicional de limitar las consultas de estado. Por eso Free es posible, pero no está garantizado solo con este cambio.

Para proyectar sin depender de esa muestra: una fuente de alertas a 2 s hace como máximo 1.800 consultas por hora; una de entradas activas a 5 s, 720. La latencia real reduce esos máximos. Una fuente de cada tipo durante 4 h diarias y 30 días: hasta 302.400 llamadas. Dos fuentes de alertas separadas más entradas activas durante 6 h diarias: hasta 777.600, más webhooks y uso del panel. Multiplicar por streamers y fuentes abiertas, no por usuarios registrados.

Precios consultados el 1 de octubre de 2026:

| Plan | Base mensual | Edge incluidas | Excedente Edge |
| --- | ---: | ---: | --- |
| Free | USD 0 | 500.000 | Sujeto a política de uso; sin paquete de pago independiente |
| Pro | Desde USD 25 | 2.000.000 | USD 2 por cada bloque adicional de 1.000.000, redondeado hacia arriba |

Pro incluye USD 10 de crédito de cómputo, suficiente para un proyecto Micro. Otros proyectos, tamaños, impuestos y extras pueden aumentar el total. Mantener Spend Cap para las partidas que cubre; no es un techo absoluto de toda la factura.

Recomendación: seguir en Free mientras se mide el consumo diario tras recargar OBS y la proyección mensual queda holgadamente bajo 500.000 (objetivo operativo: 400.000). Si el uso sostenido supera ese margen, Pro es el siguiente plan razonable; Team no se justifica por este caso. No se cambió ni contrató ningún plan.

Antes de escalar a varios streamers, reemplazar el polling de Bits por notificaciones de eventos con autorización por espacio, reconexión y recuperación por cursor; evaluar también Realtime para estados OBS. Realtime tiene su propia cuota, no es consumo cero. Mantener webhooks idempotentes, consultar solo datos nuevos y definir retención del chat sin borrar recibos necesarios para deduplicación. El chat actual consulta REST cada 1,2 s: carga la base pero no suma por sí mismo invocaciones Edge. Cada mensaje entrante vía webhook sí puede sumar una invocación.

## Verificación

- Pruebas de navegador aisladas en 1440 y 390 px: cero Edge calls del overlay, render de estados, visualización/control, edición de pool con igual tamaño, backoff, recuperación, cursor y ambos modos Bits.
- Pruebas existentes de CARTAS, aislamiento de ajustes privados y navegación del panel aprobadas.
- REST real con token inválido: HTTP 200 y lista vacía. Prueba SQL con rol anon: token válido devuelve un overlay; token inválido devuelve cero; token de visualización no puede escribir. La transacción se revirtió. Lectura de definiciones y grants reales confirma la misma autorización que el intermediario anterior.
- Sin modificaciones de estilos, WEB pública, datos, RLS, reglas de Bits ni conexiones externas.

Fuentes: [precios](https://supabase.com/pricing), [invocaciones y facturación](https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations), [RPC](https://supabase.com/docs/reference/javascript/rpc).
