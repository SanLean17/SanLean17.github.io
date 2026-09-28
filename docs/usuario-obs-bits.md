# USUARIO y OBS: ruletas y bits (28/09/2026)

## Cambios aplicados

- Selector MANTENER KILLERS / ELIMINAR KILLERS con respuesta inmediata, guardado en orden, última selección persistida y recuperación ante error.
- Precarga y decodificación de retratos originales (512 × 512), menor sobreexposición sin omitir tarjetas durante el movimiento. No se inventó resolución adicional.
- Killers: se conserva el carrusel, las reglas de secuencia y los 8 segundos de giro. El ganador mantiene resplandor y movimiento hasta generar o girar de nuevo. El nombre del donador también se anima.
- Perks en OBS: donador arriba del rombo, en color, con animación y tamaño de letra igual al nombre de la perk.
- Nueva sección BITS Y ALERTAS: reglas por cantidad exacta de bits, buscador, tres ruletas, cantidad de entradas, duración, pausa y eliminación. Una regla por cantidad y propietario. Las entradas se aplican desde el próximo giro; no habilitan opciones desactivadas ni killers ya usados.
- Fuente OBS independiente para alerta central y sonido. La prueba está identificada y no agrega entradas.
- Los archivos de la WEB pública no fueron modificados.

## Activación pendiente de Twitch

La aplicación SanLean ya fue registrada en Twitch Developers. La interfaz, base de datos y función están implementadas, pero no hay recepción real de bits hasta completar lo siguiente:

1. Registrar una aplicación de SanLean en https://dev.twitch.tv/console/apps (tipo confidencial, para conservar el secreto en el servidor).
2. Configurar exactamente esta redirección OAuth:
   `https://ugdwieebdgarkjrrpyal.supabase.co/functions/v1/stream-bits/callback`
3. En Supabase → Edge Functions → Secrets, guardar `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET`. No pegarlos en chats ni archivos del repositorio.
4. En USUARIO → TWITCH / KICK o MI CUENTA → CONEXIONES, pulsar ACTUALIZAR y CONECTAR TWITCH. Cada propietario autoriza su propio canal con el permiso `bits:read`.
5. Crear las reglas. Por ejemplo: 300 bits → El Caníbal; 1000 bits → Me la pela (superviviente). Debe coincidir la cantidad exacta del evento, no la suma de donaciones separadas.
6. Copiar la URL de alertas a una fuente de navegador OBS de 1920 × 1080, ubicada por encima de las ruletas. Comprobar que su audio esté activo en OBS.
7. Validar un Cheer real en un canal habilitado: una alerta, las entradas configuradas y el donador en el próximo giro. Un evento repetido por Twitch no debe duplicar entradas.

Documentación oficial: https://dev.twitch.tv/docs/authentication/register-app/ y https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelcheer

El usuario conserva el control manual de las ruletas sin conectar Twitch. No hay integración de bits con Kick.

## Validación realizada

- 250 casos de secuenciación y geometría a 1920, 1280, 800, 640 y 390 px. Comparación de keyframes y duración contra el código público.
- 30 eliminaciones consecutivas, agotamiento, reinicio y repetición permitida.
- 40 cambios rápidos de modo con latencia simulada; falla de guardado, restauración y reintento.
- Reglas: agregar, editar, pausar; búsquedas Buba y Me la pela; entradas vencidas, aislamiento y ausencia de doble conteo.
- Interfaz a 1440, 390 y 320 px; capturas del ganador, donador de perks y alerta.
- 400 rondas de CARTAS con cinco perks únicas del rol correcto, voto normal y caótico, revelado manual; regresiones de configuración privada y acciones concurrentes.
- Seis casos de firma del webhook: válida, contenido cambiado, secreto incorrecto, fecha vencida, encabezados faltantes y firma mal formada.
- Prueba de base de datos con rollback: cantidad exacta, duplicados, expiración, aislamiento entre propietarios, denegación a clientes sin privilegios. No se dejaron donaciones de prueba.

Las pruebas visuales se ejecutaron en Chromium con datos aislados. No se probó una donación real ni la aplicación nativa OBS porque falta registrar Twitch. La calidad final también depende del tamaño y escalado de la fuente en OBS.

## Archivos principales

- `js/usuario-roulettes.js`: selector y control de killers.
- `js/roulette-view.js`, `css/roulette-view.css`: carga y presentación.
- `js/usuario-bits.js`, `css/usuario-bits.css`, navegación privada: reglas y conexión.
- `Usuario/alertas.html`, `js/bits-alert.js`, `css/bits-alert.css`, `assets/usuario/bits-surprise.wav`: alertas.
- `supabase/schema/stream-bits.sql`: tablas, permisos y procesamiento atómico.
- `supabase/functions/stream-bits/`: OAuth, firma Twitch, deduplicación y lectura de alertas.
- `tests/`: verificaciones automatizadas y prueba SQL con rollback.

Supabase: migración `stream_bits_rules_alerts` y función `stream-bits` desplegadas. El secreto Twitch queda exclusivamente en el servidor. Las URLs de OBS contienen tokens de lectura y se deben mantener privadas.

## Corrección posterior: cartas visibles y conexión compartida

Se restauraron el armado del mazo y la animación de killers del commit estable `7009cf8`. Se retiró `content-visibility:auto`, que podía omitir el pintado durante el desplazamiento. Se conserva la precarga sin retrasar el inicio del giro.

El donador se centra dentro de la carta y ajusta tamaño/saltos de línea según la longitud. El resplandor tiene cinco veces el radio anterior (55–105 px), en una capa independiente del mazo.

MI PANEL y MI CUENTA usan el mismo componente, espacio de stream y estado verificado por el servidor. BITS/ALERTAS remite a esa conexión. Kick continúa pendiente. El primer ingreso explica que vincular Twitch es opcional y utiliza OAuth. Solo se solicita el permiso actualmente implementado `bits:read`; las funciones futuras pueden necesitar consentimiento adicional, según https://dev.twitch.tv/docs/authentication/scopes/.

Pruebas adicionales: giros completos de ocho segundos en USUARIO y OBS con comprobaciones de retratos durante el movimiento; nombres largos; mismo estado de conexión en ambas pantallas; aislamiento entre espacios y restricción al propietario. No se simuló una conexión real como si estuviera activa.
