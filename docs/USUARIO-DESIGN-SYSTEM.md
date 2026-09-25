# SanLean — Sistema visual de USUARIO

Este documento es la especificación obligatoria de diseño para todo `sanlean.com.ar/usuario/`.

La implementación canónica está en `css/usuario-design-system.css`. Si una pantalla nueva necesita apartarse de estas reglas, el cambio debe decidirse primero como una modificación del sistema, no resolverse localmente con valores arbitrarios.

## 1. Regla de trabajo obligatoria

Antes de agregar o modificar una pantalla/componente de USUARIO se sigue siempre este orden:

**Sistema visual → componente existente → implementación.**

Nunca al revés.

Si cambia una regla general —radio de cajas, tamaño de títulos, altura de campos, espaciados, ancho de formularios, botones, etc.— se modifica primero la fuente de verdad del sistema y la heredan todas las áreas correspondientes. No se corrige una única pantalla con valores locales si el cambio es general.

El sistema debe poder reutilizarse/exportarse en el futuro sin depender de estilos aislados de una pantalla concreta.

## 2. Alcance

USUARIO es un único producto e incluye MI PANEL, MI CUENTA, ruletas, Torneo 1VS1, overlays OBS, votaciones, sorteos, Twitch/Kick, colaboradores, permisos, seguridad y futuras herramientas.

Separar archivos o módulos técnicos no significa crear interfaces visuales distintas. Stream Tools forma parte de USUARIO y no posee un sistema visual propio.

MI CUENTA, MI PERFIL, SEGURIDAD, COLABORADORES y CONEXIONES forman parte del mismo sistema visual que MI PANEL. No deben tener una jerarquía, caja de encabezado ni geometría distinta.

## 3. Tokens obligatorios

### Color
- Acento principal: `#FF003C`.
- Fondo página: `#080809` + el fondo visual ya definido por `.user-page`.
- Superficie principal: `#09090B` / `rgba(8,8,10,.84)` según el componente existente.
- Superficie interior: `#111114`.
- Texto principal: `#FFFFFF`.
- Texto secundario: `rgba(255,255,255,.72)`.
- Texto atenuado: `rgba(255,255,255,.55)`.
- Borde normal: `rgba(255,255,255,.12)`.
- Borde de campo: `rgba(255,255,255,.24)`.

No agregar nuevos colores de fondo/acento por módulo salvo que se cambie este documento y el archivo de tokens.

### BLOQUE B — TIPOGRAFÍA Y JERARQUÍA (APROBADO PARCIALMENTE)

La referencia visual obligatoria para los encabezados de sección es el bloque de INICIO:

`PANEL DE USUARIO` → `BIENVENIDO A MI PANEL` → párrafo descriptivo.

Esta estructura se replica en KILLERS, PERKS DE KILLERS, PERKS DE SUPERVIVIENTES, TORNEO 1VS1, OVERLAYS OBS, VOTACIONES, SORTEOS, TWITCH / KICK, MI CUENTA, MI PERFIL, SEGURIDAD, COLABORADORES y CONEXIONES.

#### Categoría pequeña / kicker
- Referencia: `PANEL DE USUARIO`.
- Tamaño: `13px` desktop.
- Peso: `800`.
- Mayúsculas.
- Letter-spacing: `.16em`.
- Color: `#FF003C`.
- Distancia visual al título: `4px`.
- La categoría roja se desplaza levemente hacia abajo para acercarse al título sin mover el título principal.

#### Título principal / título de sección
- Referencia: `BIENVENIDO A MI PANEL`.
- Tamaño: `48px` desktop.
- Tamaño mobile: `40px`.
- Tipografía display del sistema.
- Line-height: `.98`.
- Mayúsculas cuando corresponda a la sección.
- Todas las secciones funcionales usan este mismo tamaño y ritmo visual.

#### Título de card
- Tamaño canónico: `29px`.
- Line-height: `1`.
- Referencia: cards `CONFIGURACIÓN`, `TWITCH + KICK` y `COLABORADORES` de INICIO.
- No reducir estos títulos al tamaño de un título funcional interno.

#### Párrafo descriptivo de encabezado
- Referencia: párrafo debajo de `BIENVENIDO A MI PANEL`.
- Tamaño: `16px` desktop.
- Line-height: `1.5`.
- Distancia título → párrafo: `11px`.
- Color: `rgba(255,255,255,.72)`.
- Ancho canónico: `760px` máximo.
- Todos los encabezados equivalentes usan la misma medida de bloque.
- El contenido descriptivo debe ocupar al menos dos líneas cuando sea razonable.

#### Label de campo
- Se conserva exactamente el aspecto actual aprobado.

#### Texto secundario / ayuda
- Se conserva exactamente el aspecto actual aprobado.

#### Estados y contadores
- Todavía NO se considera cerrado este subcomponente.
- Se revisará por separado antes de fijar tamaños/jerarquías globales, especialmente al rediseñar SORTEOS.

## 4. Layout

- Shell principal desktop: máximo `1500px`.
- Menú lateral: `236px`.
- Separación menú/contenido: `30px`.
- Offset funcional desktop: `266px`.
- MI PANEL, Stream Tools y todas las herramientas usan exactamente la misma columna de contenido.
- El contenido de una herramienta nunca puede comenzar debajo del menú lateral.
- Al seleccionar una sección, todas las demás se ocultan completamente.
- Nunca deben quedar visibles simultáneamente INICIO, otra herramienta y la herramienta activa.
- En viewport menor a 900 px el menú pasa al flujo normal y el offset vuelve a `0`.

### Caja canónica de encabezado

Toda vista principal de USUARIO comienza con la misma caja visual que las referencias aprobadas `BIENVENIDO A MI PANEL` y `MI CUENTA`.

Reglas actuales:
- ancho: `100%` de la columna funcional.
- altura visual desktop canónica: `188px`.
- en mobile la altura vuelve a ser automática.
- padding: `30px 32px` desktop.
- radio: `16px`.
- borde: `1px solid rgba(255,255,255,.10)`.
- fondo: `rgba(8,8,10,.82)`.
- sin glow/sombra permanente.
- separación con el contenido siguiente: `22px`.

Los contenedores exteriores de MI PERFIL, SEGURIDAD, COLABORADORES y CONEXIONES no deben añadir otra caja diferente alrededor del encabezado.

### BLOQUE C — ESPACIADOS Y ALTURAS (APROBADO EN PROGRESO)

La referencia es INICIO y sus cards.

#### 1. Encabezado → contenido siguiente
- Se conserva la distancia actual aprobada: `22px`.
- Esta medida se aplica como separación canónica entre el encabezado y el primer bloque de contenido.
- También se usa provisionalmente entre bloques principales consecutivos dentro de una vista.
- **Pendiente de revisión futura:** volver a evaluar esta misma distancia cuando se revisen módulos complejos como SORTEOS y TORNEO.

#### 2. Grilla de cards
- Desktop: siempre `3` columnas.
- Separación horizontal y vertical: `20px`.
- Si existe una cuarta card, comienza una nueva fila; se completan filas de hasta 3 cards.
- Responsive: la grilla puede reducir columnas para mantener legibilidad.
- La clase canónica para futuras grillas es `.ui-card-grid`.

#### 3. Espacio interno de card
- Padding canónico: `25px`.
- Referencia: cards de INICIO.
- Se conserva el mismo aire interior arriba, abajo y laterales.

#### 4. Categoría roja de card → título
- Categoría roja de card: `13px`.
- Distancia categoría → título: `7px`.
- Referencia: `RULETAS` → `CONFIGURACIÓN`.

#### 5. Título de card → párrafo
- Distancia: `10px`.
- El párrafo queda más cerca del título que antes, pero mantiene una separación mayor que la relación categoría → título.

#### 6. Interlínea del párrafo dentro de cards
- Line-height canónico: `1.5`.

#### 7. Párrafo → botón
- Se conserva la lógica y distancia visual de las cards de INICIO.
- Los botones permanecen alineados al borde inferior de la card mediante `margin-top:auto`.
- Tipografía, tamaño y forma del botón quedan sin cambios.

#### 8. Altura de cards
- Altura mínima canónica desktop: `200px`.
- Opción aprobada: **mínimo 200px**.
- Si una card necesita más espacio por contenido excepcional, puede crecer.
- Cards hermanas deben mantener altura uniforme cuando comparten fila.

#### 9. Distancia entre grupos/bloques
- Por ahora se usa la misma distancia del encabezado al contenido: `22px`.
- Esta decisión es provisional y debe recordarse/revisarse más adelante al auditar módulos con varios bloques internos.

## 5. Botones

Todos los botones del sistema deben partir de los componentes canónicos.

### Principal
- Fondo `#FF003C`.
- Texto blanco.
- Montserrat 800.
- Altura normal: 44–48 px según contexto.
- Bordes totalmente redondeados (`999px`).

### Secundario
- Fondo transparente/oscuro.
- Borde `#FF003C`.
- Texto blanco.
- Misma altura, tipografía y radio que el principal.

No crear botones con radios, alturas, tamaños de fuente o colores arbitrarios.

## 6. Campos y formularios

- Altura estándar: `48px`.
- Radio estándar de campo: `10px`.
- Fondo: `#09090B`.
- Borde: `rgba(255,255,255,.24)`.
- Focus: `#FF003C`.
- Texto: Montserrat 14 px.

### Regla crítica de ancho
Los campos NO deben crecer hasta extremos simplemente para completar una fila o llenar un vacío.

- Ancho máximo canónico de un formulario/campo largo: `460px`.
- Dos campos relacionados pueden compartir una fila: `460px + 460px + gap`, con un módulo de hasta `940px`.
- Si hay espacio sobrante, se conserva vacío intencionalmente.
- Un único campo no se estira a 100% de una caja enorme.
- La alineación responde a la jerarquía del formulario, no al espacio sobrante.

## 7. Cajas y tarjetas

- Fondo oscuro del sistema.
- Borde fino `rgba(255,255,255,.12)`.
- No inventar sombras, gradientes o iluminaciones diferentes para cada herramienta.
- Radio de panel/superficie principal: `16px`.
- Radio de tarjeta estructural: `14px`.
- Radio de campo: `10px`.
- Botones de acción: `999px`.

### Altura canónica de card

La referencia aprobada son las cards de INICIO: `CONFIGURACIÓN`, `TWITCH + KICK` y `COLABORADORES`.

- Altura mínima canónica desktop: `200px`.
- Padding: `25px`.
- Separación entre cards: `20px`.
- Grilla desktop: `3` columnas.
- Si una card necesita más espacio, puede crecer.

### BLOQUE A — FORMA GENERAL (APROBADO)

- **Panel principal:** radio `16px`. Referencia visual: caja `BIENVENIDO A MI PANEL`.
- **Card:** radio `14px`. Referencia visual: cards `CONFIGURACIÓN`, `TWITCH + KICK` y `COLABORADORES` de INICIO.
- **Input / Select:** radio `10px`.
- **Botón:** radio `999px`, forma píldora.
- **Borde de caja/card:** `rgba(255,255,255,.10-.12)`.
- **Borde de campo:** `rgba(255,255,255,.24)` y focus en `#FF003C`.
- **Sombras / iluminaciones:** sin glow permanente; glow rojo suave sólo donde ya esté definido para interacción.

## 8. Navegación de MI PANEL

Orden canónico actual:
1. INICIO
2. OVERLAYS OBS
3. VOTACIONES
4. SORTEOS
5. TWITCH / KICK
6. KILLERS
7. PERKS DE KILLERS
8. PERKS DE SUPERVIVIENTES
9. TORNEO 1VS1

Al pulsar una opción:
1. Se desactiva visualmente la anterior.
2. Se ocultan todas las demás secciones.
3. Se muestra únicamente el contenido seleccionado.
4. No se repiten cabeceras, tarjetas de INICIO ni bloques de otras secciones.
5. La navegación no debe tener controladores duplicados.

La implementación final del router de MI PANEL vive en `js/usuario-stream-tabs.js`.

## 9. Votaciones

### Ganador único
1. Termina la votación.
2. Se revela la carta ganadora.
3. El sistema queda esperando.
4. Si corresponde una ruleta, aparece una acción para continuar.
5. La ruleta sólo comienza cuando el streamer pulsa el botón.

### Empate
Un empate NO produce ganador y NO continúa a una ruleta.

La votación debe reiniciarse completa utilizando las mismas cinco cartas y una nueva ronda de 30 segundos. Los votos de la ronda empatada no se arrastran.

## 10. Checklist obligatorio antes de considerar terminado un módulo

- Usa los tokens de `usuario-design-system.css`.
- Reutiliza primero un componente existente.
- No introduce un color general nuevo.
- Encabezados replican la jerarquía aprobada de `BIENVENIDO A MI PANEL`.
- Párrafos de encabezado usan el ancho y la interlínea aprobados.
- Botones reutilizan componente principal/secundario.
- Campos respetan altura y ancho máximo.
- Cajas respetan fondo, borde, radio y padding del sistema.
- Cards equivalentes respetan altura mínima `200px`, padding `25px`, gap `20px` y grilla desktop de 3 columnas.
- Usa el mismo offset/columna que el resto de MI PANEL.
- Sólo una sección de MI PANEL está visible.
- Responsive no rompe alineaciones ni jerarquía.
- No modifica WEB pública si el cambio pertenece sólo a USUARIO.

## 11. WEB pública vs USUARIO

La WEB pública (`sanlean.com.ar`) y USUARIO (`sanlean.com.ar/usuario/`) son sistemas relacionados pero distintos.

Una solicitud referida únicamente a USUARIO no debe modificar la WEB pública salvo pedido expreso.
