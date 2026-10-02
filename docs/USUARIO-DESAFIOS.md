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
- DESAFÍOS no incluye preview ni URL de METAS. La URL está exclusivamente en OVERLAYS OBS.
- El autoguardado conserva el borrador durante respuestas demoradas o fallidas, ordena las escrituras y evita guardar al sincronizar un selector desde el servidor. Finalizar espera el guardado pendiente y oculta el overlay; una nueva ronda comienza en cero. Los borradores se descartan al cambiar de espacio/meta.
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
- Browser Source recomendada: **520 × 220** con fondo transparente.
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

- CERRAR sólo pliega la herramienta. No modifica ni finaliza la sesión.
- FINALIZAR WIN STREAK guarda rol, Killer cuando corresponda, racha alcanzada y fecha en el historial de WIN STREAK.
- Superviviente usa el icono de escapes.
- Killer utiliza el retrato seleccionado del catálogo oficial interno.
- Browser Source recomendada: **520 × 220 px**.


## WIN STREAK — distribución y movimiento OBS

- WIN STREAK ya no repite su URL/vista OBS dentro de DESAFÍOS; la URL se obtiene desde **OVERLAYS OBS**.
- El título visual se presenta como **WINSTREAK** sin separación: WIN en `#FF003C` y STREAK en blanco.
- La composición inferior se centra como una unidad y admite rachas de 3 cifras o más sin desplazar el conjunto.
- El streamer puede elegir **IMAGEN IZQUIERDA** o **IMAGEN DERECHA** mediante el control segmentado canónico.
- La preferencia se guarda en `stream_overlays.settings.layout` por workspace y se aplica también a una sesión activa.
- El pulso/latido es una animación CSS de `transform: scale()`, puramente local en el Browser Source; no realiza solicitudes de red adicionales.
- `prefers-reduced-motion` desactiva el pulso automáticamente.
- El selector de Killers usa 4 columnas desktop, tarjetas centradas y únicamente scroll vertical con scrollbar rojo.


## Persistencia y visibilidad de desafíos

### WIN STREAK
- **PAUSAR** conserva rol, Killer, racha actual, orientación y configuración. Cambia la sesión a `paused` y la oculta de OBS.
- **CONTINUAR** reactiva exactamente la misma sesión, sin reiniciar el contador.
- **FINALIZAR WIN STREAK** cierra la sesión y es la única acción que la agrega al historial.
- **CANCELAR WIN STREAK** descarta la sesión activa o pausada, tanto de Killer como de Superviviente, oculta OBS y vuelve a la configuración sin agregar ni borrar registros del historial. Permite corregir la selección e iniciar una racha nueva desde cero.
- Cancelar conserva las preferencias de configuración y espera cualquier autoguardado en curso antes de limpiar la sesión. Un fallo conserva la sesión y permite reintentar; una respuesta de otro workspace no modifica el espacio actual.
- **OCULTAR EN OBS / MOSTRAR EN OBS** sólo cambia `state.visible`; no altera racha ni configuración.
- Una WIN STREAK pausada permanece oculta hasta pulsar CONTINUAR.

### METAS
- **OCULTAR EN OBS / MOSTRAR EN OBS** sólo modifica la visibilidad del overlay.
- Editar nombre, rol, progreso u objetivo mientras la meta está oculta no vuelve a mostrarla automáticamente.
- **PAUSAR** guarda las ediciones pendientes y conserva título, rol, progreso, objetivo, configuración y fecha de inicio. Persiste como `status: paused` y `visible: false`.
- La misma sesión vuelve al abrir USUARIO, incluso otro día: **META PAUSADA**, campos editables y botón **CONTINUAR**. El autoguardado y +1/-1 siguen disponibles para corregir valores sin reactivar OBS.
- **CONTINUAR** guarda las ediciones pendientes y retoma la sesión con el mismo progreso. Muestra OBS y recalcula ACTIVA / OBJETIVO ALCANZADO según el objetivo actual.
- **FINALIZAR META** es la única acción que agrega la sesión al historial, tanto activa como pausada. Alcanzar el objetivo, pausar, ocultar o plegar nunca crean registros.
- No hay GUARDAR CAMBIOS: se usa el autoguardado existente. Pausar, continuar, ocultar y finalizar esperan la cola de guardado. Un fallo conserva el borrador y muestra el error; editar o volver a ejecutar la acción permite reintentar.
- Mientras está pausada, el botón de visibilidad indica **OCULTO EN PAUSA** y queda deshabilitado. Las ediciones no cambian `paused` ni vuelven a mostrarla.
- OVERLAYS OBS conserva las tarjetas META y WIN STREAK con sus URLs independientes del estado de sesión.
- Todas las escrituras de METAS filtran por overlay y workspace. Cambiar de espacio cancela borradores y descarta respuestas de otra sesión.
- Pruebas: pausa/reapertura, edición pausada, continuar con objetivo alcanzado, visibilidad con guardado demorado, finalización desde pausa, fallos y cambio de workspace; panel a 1440/740/390/320 px y OBS real con datos aislados.

### Visual WINSTREAK
- Título, imagen y número se componen como una sola unidad centrada.
- WIN y STREAK comparten exactamente línea base, tamaño y ritmo tipográfico; sólo cambia el color.
- El icono de Superviviente se renderiza deliberadamente más pequeño que un retrato de Killer.
- El pulso CSS se aplica al bloque inferior completo y no genera tráfico de red.

- Compactación Superviviente: fila inferior de 118 px (102 px en fuente angosta), desplazada 10/8 px hacia el título; preview de 56 px con ajuste de 5 px. Conserva el icono menor que Killer, ambas orientaciones y el pulso con movimiento reducido.


## ALL KILLER CHALLENGE

ALL KILLER CHALLENGE usa el catálogo real `data/killers.json`; la cantidad no se fija manualmente. Actualmente el catálogo contiene 44 Killers.

### Estados
- `pending`: carta normal.
- `current`: Killer actual, borde/glow `#FF003C` y pulso CSS muy leve.
- `completed`: carta en blanco y negro con tilde verde.
- `failed`: carta en blanco y negro con cruz roja.
- Un Killer `failed` puede volver a seleccionarse; si luego se marca GANADO cambia a `completed`.

### USUARIO
- Buscador tolerante por nombre, key y alias habituales.
- Seleccionar una carta define el Killer actual.
- Acciones: MARCAR GANADO, MARCAR PERDIDO y VOLVER A PENDIENTE.
- Contadores: completados / total, fallidos y pendientes.
- PAUSAR conserva progreso y detiene el tiempo acumulado.
- CONTINUAR retoma el mismo challenge y reinicia únicamente el reloj de sesión.
- OCULTAR / MOSTRAR EN OBS sólo controla visibilidad.
- FINALIZAR guarda el resultado y duración en HISTORIAL.

### Tiempo
- `startedAt`: fecha/hora de inicio original.
- `runningSince`: inicio del tramo activo actual.
- `accumulatedMs`: tiempo acumulado de tramos anteriores.
- Al pausar se suma el tramo activo a `accumulatedMs`.
- Al continuar comienza un nuevo `runningSince`.
- Al finalizar se guarda la duración total real; el tiempo no se muestra en OBS.

### OBS
- Overlay independiente `challenge_all_killers`.
- Browser Source recomendada: **1920 × 300 px**.
- El roster OBS llena filas de hasta 19 Killers. Con 44 Killers: **19 / 19 / 6**, sin omitir personajes.
- Todas las cartas mantienen el mismo tamaño; la última fila queda centrada.
- El pulso del Killer actual es CSS local y no genera tráfico de red adicional.

### Historial
Cada registro guarda:
- fecha de inicio;
- fecha de finalización;
- duración total real;
- completados / total;
- fallidos y pendientes.

### Arquitectura reutilizable
El renderer `challenge-roster-view.js` es compartido y se diseñó para reutilizarse en ALL SURVIVOR CHALLENGE cambiando catálogo, textos y reglas de resultado, sin duplicar la capa visual.


### Ajuste visual OBS ALL KILLER
- En OBS los nombres se ocultan para priorizar el retrato a tamaño chico; USUARIO puede conservarlos.
- Las filas no usan gap horizontal ni vertical: las cartas quedan pegadas entre sí.
- Fondo de carta restaurado a `rgba(8,8,10,.78)`; retratos a opacidad completa en todos los estados.
- Completado y fallido mantienen B/N, pero sin transparencia excesiva para conservar legibilidad.
- Medida recomendada actual: **1920 × 300 px**: tres filas de cartas de 100 × 100 px. Las dos primeras contienen 19 Killers, con 10 px libres a cada lado; la última conserva sus 6 cartas centradas.
- El contenedor OBS ocupa el ancho y alto reales de la fuente; se elimina el límite heredado de 1200 px que cortaba las primeras columnas al centrar un roster de 1920 px.
- El encuadre OBS usa los límites de transparencia de `data/challenge-roster-bounds.json`, medidos con `tests/build-roster-bounds.py`. Un SVG con `preserveAspectRatio="xMidYMid meet"` amplía el retrato completo hasta el límite interior de la carta (98 × 98 px a la medida recomendada). Sólo se excluye margen totalmente transparente: los archivos originales y todos sus píxeles visibles permanecen intactos.
- Las nuevas imágenes sin límites medidos se muestran completas con `object-fit:contain` como respaldo. Al ampliar el catálogo, ejecutar el medidor para aprovechar también sus márgenes vacíos.
- Trazo de separación entre cartas: borde de 1 px `rgba(255,255,255,.3)`. Las marcas ✓/× se ubican en el 28% inferior de la carta para despejar la cara, con sombra oscura para mantener contraste.
- La altura se adapta si falta espacio. Una fuente más alta deja espacio transparente debajo sin agrandar las cartas. Cada nueva fila requiere 100 px adicionales; a partir de 58 Killers usar 1920 × 400.
- El pulso rojo se dibuja dentro de la carta, por lo que sigue visible en los bordes de la fuente. La entrada/salida usa opacidad sin escalar el roster.
- En OBS: actualizar la fuente de navegador y usar 1920 × 300. Usar escala 100% (1920 × 300 en el lienzo), eliminando la reducción manual anterior; conservar la posición superior deseada. No estirar esta barra a la altura total de la escena.
- Validación: `node tests/challenge-roster-layout.cjs` comprueba los píxeles visibles de las 44 imágenes contra el encuadre, filas centradas hasta los bordes, marcas inferiores, estados, pausa/continuar, ocultar/mostrar y respaldo sin límites medidos. Usa datos aislados en siete tamaños entre 320 y 1920 px. No escribe datos reales.
