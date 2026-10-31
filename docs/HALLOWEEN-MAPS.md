# Halloween — mapas interactivos de la WEB pública de SanLean

Actualizado: 31/10/2026. Implementación exclusivamente en `/halloween.html`.
No cambiar WEB restante ni `/usuario/`. Dominio: `sanlean.com.ar`.

## Decisiones actuales del producto

- Una sola galería SanLean: cinco escenarios en 3 columnas escritorio, 2 tablet, 1 móvil.
- Una sola vista de mapa SanLean; no hay iframe, visor externo, selector duplicado ni modo comunitario.
- Fondo habitual de la WEB, tipografías y botones propios, color `#FF003C`.
- Zoom rueda/pellizco/teclado, arrastre, centrar, pantalla completa con botón o toque simple sobre el plano;
  el tap sobre marcadores abre detalles y el tap en modo posición no activa pantalla completa.
- Marcar mi posición es personal, guardado en `sessionStorage`; no afecta a otros.
- Mostrar cuadrícula y mostrar referencias (nombres de calles y números de casa).
- Referencias en español: fichas al pasar mouse/foco y al pulsar un marcador.
- Leyenda con iconos aportados por el propietario, con círculo y borde del color de su categoría.
- Por defecto: puerta, auto, sótano y alcantarilla activados. Ruta de escape vehicular,
  fuente de objetos y todos los ítems desactivados.
- Objetos opcionales: cortapernos, fusible, gasolina, kit de reparación y llave del sedán.
  No se inventan coordenadas de fusible: sin posiciones identificadas, su filtro permanece deshabilitado.
- Todos los marcadores indican **posibles ubicaciones**. Ni el objeto ni la salida
  aparecen necesariamente en todas las partidas.

## Imágenes subidas por el propietario y usadas por la WEB

| Escenario | Archivo de imagen real del repositorio |
| --- | --- |
| Haddonfield Heights | `assets/halloween/maps/haddonfield-heights-map.webp` |
| Haddonfield Town Center | `assets/halloween/maps/haddonfield-town-center-map.jpeg` |
| Orange Grove Estates | `assets/halloween/maps/orange-grove-estates-map.jpeg` |
| East Haddonfield | `assets/halloween/maps/east-haddonfield-map.webp` |
| The Tower Farm | `assets/halloween/maps/tower-farm-map.jpeg` |

Cada imagen tiene respaldo SVG propio solo cuando falla la carga; en ese
caso NO se muestran marcadores ni calles sobre la ilustración ficticia.

Íconos del propietario usados desde `assets/halloween/icons/`:
`game-puertas.png`, `game-auto.png`, `game-sotano.png`,
`game-alcantarillas.png`, `item-cortadora-de-pernos.png`,
`item-fusible.png`, `item-gasolina.png`,
`item-kit-de-reparacion.png`, `item-llaves-sedan.png`.

## Información geográfica del catálogo

`data/halloween-maps.json` incluye dos capas de datos estructurados:

1. Nombres de calles y números de casas, con x/y normalizados y rotación
   de calles, obtenidos de referencias cartográficas de la comunidad.
2. Posibles salidas (puertas, autos, sótanos y alcantarillas), rutas vehiculares
   y lugares candidatos a objetos. Los objetos opcionales solo se incorporan
   cuando existe una etiqueta de objeto concreta asociada a un punto.
   Las ubicaciones simplemente registradas como `searchable` sin contenido
   identificado NO se convierten en fuentes confirmadas de objetos.

**Procedencia de los hechos, solo para auditoría de mantenimiento:** datos
de ubicaciones y nomenclatura contrastados contra los registros públicos del
atlas `p8riot/halloween-maps` (fuente estructurada `data/maps.js`,
coordenadas originales de 4096×4096) y revisados en conjunto con
`g-hostproxy/Halloween-Map-Exits` (`exits.json`). No se copiaron aplicaciones,
imágenes ni código de visualización de estos repositorios. Los datos se
transformaron al esquema propio de SanLean con etiquetas y explicaciones
escritas en español.

**Precisión:** el propio atlas de referencia califica los puntos de aparición
como posiciones proyectadas que necesitan corroboración visual o dentro del
juego. Las imágenes del propietario pueden tener recortes o modificaciones.
Se mantiene estado `confidence=community` y explicación «posible» en todos
los marcadores. Antes de convertir un marcador en «confirmado», comprobar
que su posición esté correctamente alineada con el mapa editado y se
corresponda con el juego. No afirmar que sea cartografía oficial.

## Arquitectura

- `halloween.html` — navegación, galería y componentes del visor.
- `css/halloween-maps.css` — estilos propios del sitio público y responsive.
- `js/halloween-maps.js` — carga de las imágenes, marcador, labels, filtros,
  zoom, fullscreen, tooltip, almacenamiento local temporal.
- `js/halloween-map-model.mjs` — categorías, rutas de íconos, validaciones.
- `data/halloween-maps.json` — información y coordenadas por mapa.
- `assets/halloween/maps/` — imágenes editadas por el propietario + respaldos.
- `assets/halloween/icons/` — íconos PNG aportados por el propietario.
- `tests/halloween-maps.test.mjs` — modelo, datos, fuentes locales y geometría.
- `tests/halloween-maps.browser.cjs` — interacción desktop/mobile.
- `.github/workflows/halloween-maps.yml` — verificaciones automáticas al modificar Halloween.

Todos los cambios deben pasar pruebas, revisar la WEB móvil y preservar
galería, menú, footer, CÓDIGOS, USUARIO y otros módulos de SanLean.
