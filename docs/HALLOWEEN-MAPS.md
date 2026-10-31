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

## Auditoría de calibración — 31/10/2026

### Hallazgo y corrección

La importación había omitido la orientación de los datos. El atlas usa coordenadas
anteriores al giro y su visor aplica **x imagen = 1 − y fuente; y imagen = x fuente**.
Sus imágenes raster ya tienen la orientación final. Normalizar x/y sin ese paso
colocaba calles, casas y salidas en sectores equivocados. No era un problema del zoom.

Se cotejaron **individualmente** las cinco imágenes del propietario contra la
referencia realista con SIFT y ajuste afín RANSAC. Se revisaron las comparativas
antes/después y la correspondencia de tejados, intersecciones y calles. No se
justifica sumar un desplazamiento, deformación o recorte adicional: la diferencia
residual es inferior a un píxel. No se trasladaron los offsets del estilo papel,
ni se volvió a sumar `actorToRealisticX` (ya incorporado en los datos de origen).

| Mapa | Imagen SanLean | Coincidencias aceptadas | Error mediano, px de destino | Referencias visuales revisadas |
| --- | --- | --- | --- | --- |
| Haddonfield Heights | 4096×4096 | 598 | 0,295 | Victoria Way, Lampkin Lane, casas 702/807/918 y sector de la torre |
| Haddonfield Town Center | 1280×1280 | 553 | 0,155 | Peach St., Flemming Ave., edificio 1086 y locales 1001–1007 |
| Orange Grove Estates | 1280×1280 | 1086 | 0,140 | Westridge Dr., Stephens Ave., Orange Grove Ave. y casas 1514/1518/1522 |
| East Haddonfield | 4096×4096 | 403 | 0,299 | complejo central, Virginia St., Wallard St., viviendas 812/628/630 |
| The Tower Farm | 1280×1280 | 328 | 0,163 | Ridgeline Rd., Clover Way, construcciones 300/302/303/305/309 |

Estos errores miden **registro entre imágenes**, no la certeza de aparición de
un objeto dentro del juego. No convertirlos en una promesa de precisión del gameplay.

### Calibración mantenible

Cada mapa conserva sus coordenadas fuente y declara `calibration.sourceToImage`,
una matriz afín normalizada `[a,b,c,d,e,f]`: `(a*x+b*y+c, d*x+e*y+f)`.
`calibrateMap` proyecta una copia una sola vez al cargar el catálogo; no transforma
imágenes ni los pines personales, que ya están en coordenadas de imagen.
Las calles rotan con su eje, los números de vivienda quedan siempre derechos.
Cada registro contiene hash SHA-256 de la imagen, matriz medida, nueve puntos
fijos distribuidos por el plano, cantidad de coincidencias y error residual.
Las pruebas fallan si se reemplaza la imagen sin actualizar la auditoría.

Para una imagen futura: cotejar puntos distribuidos, estimar el registro específico,
componerlo con la orientación fuente, revisar visualmente y actualizar evidencia y
hash. No ajustar x/y a ojo ni aplicar el registro de otro escenario.

### Fuentes investigadas y límites

- [p8riot, datos](https://github.com/p8riot/halloween-maps/blob/main/data/maps.js)
  y [visor](https://github.com/p8riot/halloween-maps/blob/main/app.js): orientación,
  registro, calles, numeración, actores y etiquetas de posibles objetos. Se contrastó
  la procedencia de los 620 marcadores existentes; se completaron identificadores
  de fuente de los autos. No se inventaron nuevas ubicaciones.
- [Haddonfield Atlas](https://github.com/Gitjon72/Haddonfield-atlas): nomenclatura,
  presentación de viviendas y advertencias sobre certeza. Su mención del fusible
  describe el uso en puertas; su lista de investigación todavía solicita registrar
  dónde se encuentran. No aporta un catálogo de coordenadas de fusibles.
- [Halloween Map Exits](https://github.com/g-hostproxy/Halloween-Map-Exits/blob/main/exits.json):
  contraste cualitativo de salidas. Sus mapas tienen otro encuadre y no incluyen Tower
  Farm. El ajuste automático produjo muy pocos puntos coincidentes: no se usó como
  evidencia para trasladar ni sustituir coordenadas en los cinco mapas.
- [Halloween Map Overlay](https://github.com/Davide-DevP/halloween-map-overlay/blob/main/maps-src/markers.json):
  posiciones derivadas de círculos de otra cartografía y gas; no documenta apariciones
  de fusibles. Su NOTICE excluye las imágenes de terceros de la licencia del código.

No se incorporaron recursos gráficos ni código de esas aplicaciones. Se mantienen
exclusivamente los cinco mapas y nueve PNG del propietario. Las referencias se
consultaron para auditoría; las comparativas locales no se publican como nuevos assets.

**Fusible:** sin posiciones suficientemente documentadas en los archivos consultados.
Filtro deshabilitado y texto visible «Sin ubicaciones documentadas». Nunca se transforma
una puerta que requiere fusible en una aparición del objeto.

**Incertidumbre restante:** las salidas y los objetos conservan `community` y «posible».
El registro corrige la correspondencia cartográfica, pero no certifica cada actor,
interior/planta o variante de partida. Los puntos `searchable` de contenido desconocido
no se convierten en objetos. No se añadieron etiquetas cuya posición no esté respaldada.

### Lectura e interacción

Los puntos cercanos se agrupan según distancia en pantalla, con contador y lista de
candidatos consultable. El grupo se ancla en un punto real y se separa al ampliar;
los objetos coincidentes siguen juntos y todos se pueden consultar. No se desplazan
coordenadas para fingir separación. Las etiquetas que colisionan se ocultan temporalmente
y vuelven cuando hay espacio, conservando su ancla. Cuadrícula y referencias siguen
independientes. La ficha de detalle también es accesible dentro de pantalla completa.
Se conserva la lista mobile vertical de cinco mapas, los filtros por defecto y el pin personal.

### Verificaciones realizadas

- Chrome: 1440 px y mobile emulado 320/390/430 px, cinco mapas en cada tamaño.
- WebKit: mobile emulado 390 px, cinco mapas. No equivale a probar un teléfono físico.
- Comparativas de registro antes/después; capturas del visor normal y ampliado por mapa.
- Coordenadas proyectadas, filtros, grupos completos, etiquetas sin colisiones,
  cuadrícula independiente, cambio de mapas, pin personal y recuperación de imagen.
- Arrastre con mouse, arrastre/pellizco táctil mediante CDP y pantalla completa en Chrome.
- Se corrigió un clic de compatibilidad posterior al toque que, tras el scroll de
  selección, podía activar otro botón de la lista mobile. La lista sigue vertical.
- 42 pruebas de modelo/datos y regresión pública, sin errores de JavaScript en navegador.

El resultado verifica la correspondencia con las imágenes y fuentes disponibles;
no certifica cada aparición dentro de una partida real.
