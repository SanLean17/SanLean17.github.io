# WEB pública — sistema mobile

Ámbito: páginas públicas hasta 760 px. No aplicar a USUARIO ni a escritorio.

La fuente de estilos es `css/public-mobile.css`. Los títulos de sección comparten
la referencia de Tier List: familia `--head`, 48 px (40–48 px en pantallas estrechas), centrados y líneas equilibradas.
Separaciones: 8 px entre subtítulo y párrafo, 16 px entre elementos relacionados,
32 px entre título y contenido o entre opciones. Párrafos de opciones: 15 px / 1.5.

Splash: SANLEAN de 86 px (doble del anterior de 43 px), con reducción responsive hasta 72 px en pantallas estrechas; texto de 14 px / 1.5.
Menú hamburguesa transparente conservando área táctil de 44 px.
Engranajes: componente circular de escritorio, 50 px y glifo de 30 px.
Killers: ancho de carta responsive de 144–184 px; el cálculo del giro en `main.js`
lee el ancho real. Fondo de personaje único, sin mosaico, fundido a negro.
Las ruletas de perks conservan dos columnas y 32 px de separación del título.
Si el contenido supera la altura disponible, debe poder desplazarse sin solaparse.


## Ajustes mobile — 26 de septiembre
- Splash sin la imagen del logo; conservar SANLEAN y el párrafo.
- Al ocultar saltos de línea, insertar espacios reales entre palabras y retirarlos al volver a escritorio.
- Inicio: subtítulos rojos, párrafos blancos sin botones adicionales; toda la opción es un enlace.
- Inicio, selección de perks y 1VS1 comparten `fondo-web-grande.png`.
- Killers usa ese mismo fondo en la primera pantalla y continúa con `fondo-negro-textura-2.png`.
- Ambas Tier Lists usan `fondo-negro-textura-2.png`. En las ruletas, conservar la imagen superior al abrir configuración y aplicar la textura solamente desde CONFIGURAR hacia abajo.
- Engranaje blanco vectorial en mobile para evitar que iOS lo convierta en emoji.
- Marcadores de killers: 9 px desde el borde; tamaño de cartas sin cambios.
- Menú desplegable de arriba hacia abajo y cierre inverso, 220 ms; respetar movimiento reducido.

- Menú abierto: encabezado y desplegable sobre el mismo negro; restaurarlo al finalizar el cierre.
- Tier List: borde de acento de 1 px en los botones para distinguir la opción inactiva.
- 1VS1 sin torneo: centrar título y mensaje como Halloween, usando el mismo contenedor mobile.
- Ruleta horizontal a ancho de pantalla; sombreados laterales de 18 px en los bordes. Cartas sin cambios.
