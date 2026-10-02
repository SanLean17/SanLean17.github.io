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

### METAS: alias, control y composición OBS

- Prioridad: DE FRENTE → ME LA PELA → ESCOTILLA → SALVADAS → PUNTOS DE SANGRE → GENERADORES → RANDOM → ESCAPES → rol.
- La detección ignora mayúsculas, tildes y separadores; reconoce expresiones juntas como MELAPELA, DEFRENTE y NOMITHER. BP y GEN/GENS se reconocen como palabras completas para evitar coincidencias dentro de otras palabras.
- Cualquier rol, incluido AMBOS, muestra únicamente el icono detectado por el nombre. AMBOS sin coincidencia conserva KILLERS a la izquierda y ESCAPES a la derecha.
- CONTROL incluye un vocabulario informativo de ocho iconos. Reutiliza la ayuda canónica (`.ui-field-help`), sin crear botones ni selectores nuevos.
- La salida sigue siendo transparente, de 720 × 180. Título arriba, iconos sin recorte junto al contador, progreso y objetivo de idéntico tamaño/peso y slash fino al 58 % de la altura tipográfica. Los números largos reducen la fila completa para conservar la misma proporción.
- Vista previa de hasta 300 × 68 dentro del marco canónico compacto de 106 px.
- El autoguardado conserva el borrador durante respuestas demoradas o fallidas, ordena las escrituras y evita guardar al sincronizar un selector desde el servidor. Finalizar espera el guardado pendiente y limpia vista previa y URL; una nueva ronda comienza en cero. Los borradores se descartan al cambiar de espacio/meta.
- Verificación: `tests/challenge-goals.cjs` prueba alias/roles, panel real en cuatro anchos, select canónico, guardado demorado/fallido, finalización/reinicio, separación por espacio y el documento OBS real con respuestas de prueba. No escribe datos reales. Configurar PLAYWRIGHT_MODULE y CHROME_PATH si el entorno no los resuelve por defecto.

- Ajuste de stream: título de 24 px, números de 48 px e iconos de 64 px centrados verticalmente con el contador. La fuente OBS continúa en 720 × 180.
- Al alcanzar o superar el objetivo, el conjunto pulsa suavemente entre escala 1 y 1.018 cada 2 segundos, con un fondo rojo difuso detrás del título, los iconos y el contador, sin borde, que sobresale ligeramente del conjunto. La animación continúa mientras el contador cumpla el objetivo, se detiene al quedar por debajo y respeta movimiento reducido. Refrescos con datos idénticos no la reinician.

- Nitidez a tamaño chico: se conservan los PNG originales de 264 × 249, mostrados a 64 px (38 px en el panel), con sombras cortas. Los iconos acompañan el pulso leve del conjunto, sin una animación adicional. El resplandor rojo de objetivo cumplido se dibuja en una capa de fondo separada para no filtrar ni difuminar los números. El slash mide aproximadamente 28 px frente a números de 48 px.


## Navegación interna de DESAFÍOS

- Cada herramienta se abre desde la lista principal con **ABRIR**.
- Volver a pulsar el mismo control la cierra.
- Abrir otra herramienta cierra la anterior para evitar bloques largos apilados.
- Los controles usan el mismo chevron canónico de KILLERS / PERKS.
- **MIS METAS** es un historial plegable independiente y compacto.
- Cada registro de META muestra nombre, rol, resultado y fecha de finalización.

## WIN STREAK

WIN STREAK es independiente de METAS y usa su propio overlay `challenge_streak` por workspace.

### Superviviente

- La métrica es siempre escapes consecutivos.
- No existe objetivo máximo.
- La racha comienza en 0.
- El streamer puede usar `+1`, `-1`, escribir el valor manualmente o pulsar `REINICIAR RACHA`.
- OBS usa el icono `assets/usuario/desafios/metas/escapes.png`.

### Killer

- Antes de iniciar se selecciona un Killer del catálogo real de `data/killers.json`.
- El buscador acepta nombre visible, key y alias habituales en español/inglés.
- La selección queda asociada a esa sesión de WIN STREAK.
- La racha usa los mismos controles manuales que Superviviente.

### OBS WIN STREAK

- Título fijo: **WIN** en `#FF003C` + **STREAK** en blanco, usando la tipografía display del sistema.
- Debajo se muestra el retrato del Killer seleccionado o el icono de escapes para Superviviente.
- El número de la racha aparece al costado.
- Browser Source recomendada: **520 × 260** con fondo transparente.
- La actualización del número usa una animación breve y no reinicia ni modifica la racha por sí sola.


## DESAFÍOS — orden inline

Cada herramienta se despliega inmediatamente debajo de su propia fila dentro de DESAFÍOS:
- METAS → contenido de METAS → WIN STREAK → ALL KILLER CHALLENGE → ALL SURVIVOR CHALLENGE.
- WIN STREAK → contenido de WIN STREAK → resto de herramientas.
- Volver a pulsar ABRIR/CERRAR pliega únicamente esa herramienta.
- Sólo una herramienta permanece expandida a la vez.

## Historial

HISTORIAL ocupa todo el ancho de la columna funcional y posee un plegado general.
Dentro se separan grupos plegables:
- MIS METAS.
- WIN STREAK.
- futuras herramientas equivalentes.

Las filas guardadas incluyen fecha de finalización.

## WIN STREAK — cierre y finalización

- CERRAR termina la sesión activa sin agregarla al historial y devuelve a la configuración para iniciar otra racha/rol.
- FINALIZAR WIN STREAK guarda rol, Killer cuando corresponda, racha alcanzada y fecha en el historial de WIN STREAK.
- Superviviente usa el icono de escapes.
- Killer utiliza el retrato seleccionado del catálogo oficial interno.
- Browser Source recomendada: **520 × 220 px**.
