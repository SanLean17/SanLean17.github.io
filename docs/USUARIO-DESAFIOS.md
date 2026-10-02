# DESAFÍOS · METAS

## Alcance

METAS pertenece exclusivamente a **USUARIO** y a sus overlays OBS. No modifica ni comparte estado con la WEB pública.

Cada meta pertenece a un `streamer_workspace`, por lo que propietarios distintos mantienen configuración, progreso, historial y URL de OBS independientes.

## Configuración

La primera implementación permite definir:

- Nombre de la meta.
- Rol: **KILLER** o **SUPERVIVIENTE**.
- Objetivo numérico (por ejemplo, 10).

Killer usa la métrica **VICTORIAS**. Superviviente usa la métrica **ESCAPES**.

## Meta activa

Al iniciar, el progreso comienza en 0 y el overlay se vuelve visible.

Controles manuales:

- `+1`: suma una victoria/escape.
- `-1`: corrige el progreso sin bajar de 0.
- El objetivo puede editarse directamente durante la meta activa.
- `FINALIZAR META`: cierra la sesión, oculta el overlay y guarda el resultado en el historial del workspace.

SanLean no necesita distinguir entre acumulativa o consecutiva: esa regla la define el streamer en el nombre y controla el progreso manualmente. Llegar al objetivo NO finaliza automáticamente. El estado pasa a **OBJETIVO ALCANZADO**, pero la meta sigue activa para permitir editar el objetivo o finalizarla.

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
- botones de acción de 44px;
- acento `#FF003C`.

La vista del panel no tiene que ser idéntica al overlay. El panel prioriza control y claridad; el overlay prioriza lectura durante el stream.

## Iconos automáticos

El overlay resuelve el icono por palabras del nombre antes de usar el rol como fallback.

- DE FRENTE → `de-frente.png`
- ESCOTILLA / TRAMPILLA / HATCH → `escotilla.png`
- ME LA PELA / NO MITHER → `me-la-pela.png`
- PUNTOS DE SANGRE → `puntos-de-sangre.png`
- MOTORES / GENERADORES → `motores.png`
- SALVADA / SALVADAS → `salvada.png`
- RANDOM / ALEATORIO → `randoms.png`
- ESCAPE / ESCAPES → `escapes.png`
- KILLER → `killers.png`
- SUPERVIVIENTE → `escapes.png`
- AMBOS → `killers.png` + `escapes.png`

Ruta canónica: `assets/usuario/desafios/metas/`.
