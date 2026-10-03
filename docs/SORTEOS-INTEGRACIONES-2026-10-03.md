# SORTEOS: verificación e integraciones

## Comportamiento

- La simulación se inicia explícitamente y no escribe sesiones, OBS ni historial.
- Un participante se identifica por plataforma e ID. Repetir la palabra no duplica su participación; los ganadores quedan excluidos de nuevas tiradas en la misma sesión.
- Los filtros SUB/VIP/MOD usan badges del webhook firmado. Las bonificaciones SUB/VIP dan x2 como máximo.
- Twitch permite comprobar seguidores y meses de antigüedad con `moderator:read:followers`. El token se conserva en la tabla privada del servidor y se renueva cuando corresponde.
- Kick mantiene sus permisos de identidad, canal y eventos. No expone consulta de seguidores históricos: el panel explica esa limitación si se intenta activar SÓLO SEGUIDORES con Kick.
- Cerrar/reabrir conserva la sesión. Finalizar y cancelar son estados terminales diferentes; sólo finalizar guarda historial.
- La recarga recupera configuración y resultado. Las escrituras de OBS se serializan y los mensajes del ganador respetan su ID de plataforma.

## Instalación

Aplicar `supabase/schema/giveaway-eligibility.sql` después del esquema base de Stream Tools y `stream-chat.sql`. Luego desplegar `stream-bits` y `stream-kick`, incluyendo `_shared/chat-metadata.mjs`. Conservan la autenticación propia y la validación de firmas de webhook.

Para activar el filtro de seguidores en un espacio existente, su propietario debe usar ACTUALIZAR PERMISOS en Twitch. La aplicación rechaza un canal distinto al ya vinculado. No se cambia el propietario de la aplicación OAuth.

## Validación

- `giveaway-session.cjs`: inicio fallido, simulación sin escrituras, filtros, chances, cierre/reapertura, recuperación, ganador, historial y cancelación.
- `giveaway-metadata.mjs` y `giveaway-followers.mjs`: badges, acentos, consulta al canal/usuario correcto, renovación tras 401 y errores de plataforma.
- `giveaway-eligibility-database.sql`, `giveaway-keyword-database.sql` y `chat-database.sql`: pruebas con rollback, roles reales, filtros, Unicode, duplicados, falsificación y separación entre espacios.
- `giveaway-layout.cjs`: 28 combinaciones de tamaños/estados OBS entre 320 y 1920 px.
- `giveaway-confirmations.cjs`: modales a 1440, 390 y 320 px y palabra en mayúsculas.
- Regresiones: chat, conexiones compartidas, ajustes privados, CARTAS, METAS y cancelación WIN STREAK.

Las pruebas automáticas usan datos aislados. No envían mensajes al chat público ni generan sorteos o ganadores reales.

## Referencias

- [Twitch: seguidores del canal](https://dev.twitch.tv/docs/api/reference/#get-channel-followers)
- [Kick: eventos y badges del chat](https://docs.kick.com/events/event-types)
- [Kick: permisos](https://docs.kick.com/getting-started/scopes)
