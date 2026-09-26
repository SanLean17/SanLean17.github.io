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
