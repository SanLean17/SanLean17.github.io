# DESAFÍOS · METAS

## Alcance

METAS pertenece exclusivamente a **USUARIO** y a sus overlays OBS. No modifica ni comparte estado con la WEB pública.

Cada meta pertenece a un `streamer_workspace`, por lo que propietarios distintos mantienen configuración, progreso, historial y URL de OBS independientes.

## Configuración

La primera implementación permite definir:

- Nombre de la meta.
- Rol: **KILLER** o **SUPERVIVIENTE**.
- Objetivo numérico (por ejemplo, 10).
- Tipo: **ACUMULATIVA** o **CONSECUTIVA**.

Killer usa la métrica **VICTORIAS**. Superviviente usa la métrica **ESCAPES**.

## Meta activa

Al iniciar, el progreso comienza en 0 y el overlay se vuelve visible.

Controles manuales:

- `+1`: suma una victoria/escape.
- `-1`: corrige el progreso sin bajar de 0.
- `REINICIAR RACHA`: sólo aparece en metas consecutivas y devuelve el progreso a 0.
- `+1 OBJETIVO`: aumenta el objetivo durante la meta activa. Ejemplo: una meta 10/10 puede transformarse en 10/11 sin reiniciar el desafío.
- `FINALIZAR META`: cierra la sesión, oculta el overlay y guarda el resultado en el historial del workspace.

Llegar al objetivo NO finaliza automáticamente. El estado pasa a **OBJETIVO ALCANZADO**, pero la meta sigue activa para permitir extensiones del objetivo.

## OBS

METAS utiliza un overlay propio de tipo `challenge_goal` almacenado en `stream_overlays`.

La Browser Source es independiente por workspace y usa el mismo sistema de tokens públicos/privados que los overlays existentes. El fondo es transparente y la referencia recomendada es 1920 × 1080.

La vista actual es una base visual SanLean preparada para recibir assets personalizados. Las imágenes que se incorporen más adelante no deben cambiar la lógica del contador ni crear una implementación paralela.

## Sistema visual

USUARIO reutiliza exclusivamente el Design System canónico:

- encabezado de sección estándar;
- `.module-box` / caja funcional canónica;
- inputs de 48px;
- selects canónicos;
- control segmentado canónico para ACUMULATIVA / CONSECUTIVA;
- botones de acción de 44px;
- acento `#FF003C`.

La vista del panel no tiene que ser idéntica al overlay. El panel prioriza control y claridad; el overlay prioriza lectura durante el stream.
