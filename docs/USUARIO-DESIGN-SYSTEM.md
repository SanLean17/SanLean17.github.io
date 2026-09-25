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
- Usa la misma escala visual aprobada que `El correo de acceso no se modifica desde el perfil.`.
- Si ocupa dos líneas o más, debe limitar su ancho para que las líneas tengan longitudes visuales semejantes y no formen una línea muy larga seguida de otra demasiado corta.

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

#### Encabezado → contenido siguiente
- Distancia canónica: `22px`.
- También se usa provisionalmente entre bloques principales consecutivos.
- **Pendiente:** revisar esta distancia al auditar SORTEOS y TORNEO.

#### Grilla de cards
- Desktop: `3` columnas.
- Gap horizontal y vertical: `20px`.
- La cuarta card inicia una nueva fila.
- Responsive puede reducir columnas.

#### Card
- Padding: `25px`.
- Categoría roja: `13px`.
- Categoría → título: `7px`.
- Título → párrafo: `10px`.
- Interlínea del párrafo: `1.5`.
- Botones alineados abajo.
- Altura mínima: `200px`; puede crecer si el contenido lo requiere.

## 5. Botones

Los botones de acción del sistema toman como referencia exacta los botones de las cards `CONFIGURACIÓN` y `COLABORADORES` de INICIO.

### Botón de acción canónico
- Altura: `44px`.
- Padding horizontal: `20px`.
- Radio: `999px`.
- Tipografía: Montserrat `800`, `13px`.
- Principal: fondo `#FF003C`, texto blanco.
- Secundario: fondo transparente, borde `#FF003C`, texto blanco.
- Esta regla se aplica a los botones de acción de MI CUENTA, MI PERFIL, SEGURIDAD, COLABORADORES, TORNEO, OVERLAYS, VOTACIONES, SORTEOS, plataformas y componentes equivalentes.
- `ACTUALIZAR CONTRASEÑA`, `INICIAR SORTEO`, `CERRAR PARTICIPACIÓN`, `CREAR TORNEO` y acciones equivalentes deben compartir exactamente esta altura y tipografía base.
- **Excepción aprobada:** los controles propios de KILLERS, PERKS DE KILLERS y PERKS DE SUPERVIVIENTES conservan su diseño especializado porque manejan más información y no se consideran botones de acción estándar.
- Los botones de navegación, selects personalizados y controles especializados tampoco se convierten en botones de acción.

## 6. Campos y formularios

La referencia prioritaria aprobada es `SEGURIDAD → CONTRASEÑA ACTUAL`.

### Ritmo canónico de campo
- Label → campo: `9px`.
- Altura de input/select estándar: `48px`.
- Radio: `10px`.
- Fondo: `#09090B`.
- Borde: `rgba(255,255,255,.24)`.
- Focus: `#FF003C`.
- Texto: Montserrat `14px`.
- Input → texto de ayuda: `10px`.
- Entre grupos de campos verticales: `19px`.
- Entre dos campos que comparten fila: `35px` horizontal.
- En mobile los campos en dos columnas pasan a una sola columna cuando corresponde.

### Texto de ayuda
- Referencia: `El correo de acceso no se modifica desde el perfil.`.
- Tamaño: `11px`.
- Peso: `500`.
- Line-height: `1.5`.
- Distancia desde el input superior: `10px`.
- Ancho máximo general: `460px`.
- La regla se aplica también a avisos equivalentes como la ayuda de contraseña.
- Cuando ocupa varias líneas, el ancho debe mantenerse controlado para que las líneas queden visualmente equilibradas.

### Caja funcional canónica
Todo bloque funcional principal debajo del encabezado debe tener una superficie que lo contenga; no deben quedar formularios o controles principales sueltos sobre el fondo.

- Clase canónica: `.ui-content-box`.
- Padding: `28px` desktop.
- Radio: `14px`.
- Borde: `1px solid rgba(255,255,255,.12)`.
- Fondo: `rgba(8,8,10,.84)`.
- Sin glow permanente.
- En mobile reduce padding para conservar espacio útil.
- Se aplica a formularios y bloques principales de MI PERFIL, SEGURIDAD, COLABORADORES, CONEXIONES, VOTACIONES, SORTEOS, TORNEO, plataformas y futuras herramientas.
- Los módulos que ya usan una superficie equivalente (`.module-box`, cards o cajas estructurales existentes) deben adoptar esta geometría antes de crear otra variante.

### Regla crítica de ancho
Los campos NO deben crecer hasta extremos simplemente para completar una fila o llenar un vacío.

- Ancho máximo canónico de un formulario/campo largo: `460px`.
- Dos campos relacionados pueden compartir una fila sin estirarse innecesariamente.
- Si hay espacio sobrante, se conserva vacío intencionalmente.
- La alineación responde a la jerarquía del formulario, no al espacio sobrante.
- Las cajas de SORTEOS, VOTACIONES y Stream Tools deben dimensionarse para contener correctamente dos campos de hasta `460px` más el gap canónico, sin solapamientos ni contenido pisado.

## 7. Cajas y tarjetas

- Fondo oscuro del sistema.
- Borde fino `rgba(255,255,255,.12)`.
- No inventar sombras, gradientes o iluminaciones diferentes para cada herramienta.
- Radio de panel/superficie principal: `16px`.
- Radio de tarjeta estructural y caja funcional: `14px`.
- Radio de campo: `10px`.
- Botones de acción: `999px`.

### Altura canónica de card
- Altura mínima desktop: `200px`.
- Padding: `25px`.
- Separación entre cards: `20px`.
- Grilla desktop: `3` columnas.
- Si una card necesita más espacio, puede crecer.

### BLOQUE A — FORMA GENERAL (APROBADO)
- **Panel principal:** radio `16px`.
- **Card:** radio `14px`.
- **Input / Select:** radio `10px`.
- **Botón:** radio `999px`.
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
- Botones de acción usan Montserrat 800 / 13px / 44px salvo las excepciones aprobadas de KILLERS/PERKS.
- Campos respetan altura `48px`, label-gap `9px`, ayuda `10px`, separación vertical `19px` y gap horizontal `35px` cuando comparten fila.
- Textos de ayuda respetan la escala de `11px / 1.5` y ancho controlado.
- Todo bloque funcional principal debajo del encabezado usa una superficie canónica o equivalente.
- SORTEOS/VOTACIONES no pueden tener campos o cajas solapados por límites de ancho heredados.
- Cajas respetan fondo, borde, radio y padding del sistema.
- Cards equivalentes respetan altura mínima `200px`, padding `25px`, gap `20px` y grilla desktop de 3 columnas.
- Usa el mismo offset/columna que el resto de MI PANEL.
- Sólo una sección de MI PANEL está visible.
- Responsive no rompe alineaciones ni jerarquía.
- No modifica WEB pública si el cambio pertenece sólo a USUARIO.

## 11. WEB pública vs USUARIO

La WEB pública (`sanlean.com.ar`) y USUARIO (`sanlean.com.ar/usuario/`) son sistemas relacionados pero distintos.

Una solicitud referida únicamente a USUARIO no debe modificar la WEB pública salvo pedido expreso.
