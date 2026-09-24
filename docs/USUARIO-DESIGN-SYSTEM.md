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

### Tipografía
- Texto/UI: `Montserrat, Arial, sans-serif`.
- Títulos display: `Impact, Arial Black, Arial Narrow, sans-serif`.
- Título principal MI PANEL: 65 px desktop, line-height `.88`.
- Título de sección: 40 px desktop, line-height `.95`.
- Título de tarjeta: 18 px.
- Párrafo normal: 14 px, line-height `1.6`.
- Labels/metadatos: 11–12 px, peso 800 según jerarquía.

### Párrafos
- Un párrafo informativo normal no debe ocupar todo el ancho disponible.
- Ancho máximo recomendado/canónico: `66ch`.
- Cuando hay varios párrafos equivalentes deben usar el mismo ancho y ritmo visual.
- No hacer líneas extremadamente largas sólo porque exista espacio horizontal.

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
- Padding debe seguir la escala existente: 18 / 24 / 30 / 42 px según jerarquía.

## 8. Navegación de MI PANEL

MI PANEL es el centro funcional. Las herramientas no son aplicaciones separadas y existe un único controlador de navegación.

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

No mostrar además botones separados de TWITCH y KICK si ya existe la sección integrada `TWITCH / KICK`.

Al pulsar una opción:
1. Se desactiva visualmente la anterior.
2. Se ocultan todas las demás secciones.
3. Se muestra únicamente el contenido seleccionado.
4. No se repiten cabeceras, tarjetas de INICIO ni bloques de otras secciones arriba o debajo.
5. La navegación no debe tener controladores duplicados en módulos particulares.

La implementación final del router de MI PANEL vive en `js/usuario-stream-tabs.js`, cargado al final para consolidar el comportamiento del panel mientras se retiran progresivamente manejadores heredados de módulos antiguos.

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
- Títulos respetan tipografía/tamaño/jerarquía.
- Párrafos mantienen ancho y line-height del sistema.
- Botones reutilizan componente principal/secundario.
- Campos respetan altura y ancho máximo; no llenan espacios vacíos sin necesidad.
- Cajas respetan fondo, borde, radio y padding del sistema.
- Usa el mismo offset/columna que el resto de MI PANEL.
- Sólo una sección de MI PANEL está visible.
- Responsive no rompe alineaciones ni jerarquía.
- No modifica WEB pública si el cambio pertenece sólo a USUARIO.

## 11. WEB pública vs USUARIO

La WEB pública (`sanlean.com.ar`) y USUARIO (`sanlean.com.ar/usuario/`) son sistemas relacionados pero distintos.

Una solicitud referida únicamente a USUARIO no debe modificar la WEB pública salvo pedido expreso.
