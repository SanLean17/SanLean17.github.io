# HALLOWEEN — visor propio de la WEB pública SanLean

**Estado actual (31/10/2026):** una sola galería y un solo visor propio en
`https://sanlean.com.ar/halloween.html`. No hay iframes ni dependencia funcional
de aplicaciones de terceros. No modificar USUARIO, WEB restantes ni sus fondos.

## Decisiones definitivas

- Galería responsive: 3 columnas desktop, 2 tablet, 1 mobile.
- Cinco escenarios: Haddonfield Heights, Haddonfield Town Center,
  Orange Grove Estates, East Haddonfield y The Tower Farm.
- Visual SanLean: tipografías, negros y acento `#FF003C`.
- Vista central con rueda del mouse, zoom táctil, doble clic, arrastre,
  teclado, centrar mapa, pantalla completa, vista clara,
  mostrar cuadrícula y mostrar referencias.
- Sin controles visibles + / − ni indicador 100 %.
- Pin de posición personal por mapa, guardado en la sesión del navegador.
- Siete pictogramas SVG propios del proyecto: puerta, auto, sótano,
  alcantarilla, salida vehicular, suministros, punto de referencia.
  Filtros e información contextual en español. Hover/foco de marcadores
  muestra tooltip propio; clic/tap abre información más completa.
- Las posiciones no son puntos garantizados: los elementos del juego
  pueden aparecer de forma distinta en cada partida.
- La descripción del escenario no enlaza a otros proyectos.
- El fondo oscuro general es el mismo que usa el resto de la WEB.

## Cartografía real: qué falta

El visor está preparado para imágenes con calles, edificios y contornos
correctos respecto al juego, pero **actualmente esos archivos no están
autorizados ni incorporados**. Hasta entonces muestra cinco esquemas SVG
originales de SanLean, explícitamente no geográficos. No inventar
coordenadas ni rotular rutas ficticias como reales.

Al disponer de imágenes propias o con derechos de reutilización adecuados,
**subir directamente al repositorio principal** `SanLean17/SanLean17.github.io`
en `assets/halloween/maps/` con estos nombres:

| Escenario | Ruta del mapa listo para importar |
| --- | --- |
| Haddonfield Heights | `assets/halloween/maps/haddonfield-heights-map.webp` |
| Haddonfield Town Center | `assets/halloween/maps/haddonfield-town-center-map.webp` |
| Orange Grove Estates | `assets/halloween/maps/orange-grove-estates-map.webp` |
| East Haddonfield | `assets/halloween/maps/east-haddonfield-map.webp` |
| The Tower Farm | `assets/halloween/maps/tower-farm-map.webp` |

La vista de mapa y las cinco tarjetas buscan automáticamente esas imágenes
y, si no se encuentran o fallan, muestran los SVG actuales. El visor mide
las dimensiones reales de la imagen cargada para ajustar zoom/pan sin
deformar su relación de aspecto. El archivo debe contener el plano completo
con nombres de calles, límites y edificios, preferentemente limpio, sin
marcadores duplicados (estos se dibujarán en la capa propia SanLean).

**IMPORTANTE:** la aparición del mapa verdadero no crea posiciones
verificadas por sí sola. Una vez subida cada imagen, comprobar manualmente
el sistema de coordenadas e incorporar sus marcadores al catálogo
`data/halloween-maps.json` únicamente con evidencia. El modelo ya
acepta `markers` y `labels` con x/y normalizados entre 0 y 1,
tipos, título/descripción en español, posibles variaciones y fuente.

Esquema de marcador para trabajo futuro, NO PUBLICAR SIN VALIDACIÓN:

```json
{
  "id": "ejemplo-comprobar-01",
  "type": "gate",
  "x": 0.5,
  "y": 0.5,
  "title": "Puerta de salida",
  "description": "Ubicación de ejemplo, pendiente de comprobar",
  "possible": true,
  "confidence": "community",
  "source": "Referencia a confirmar con la imagen autorizada"
}
```

## Fuentes estudiadas como REFERENCIAS, no archivos para copiar

- `https://github.com/Gitjon72/Haddonfield-atlas`: atlas que el usuario
  compartió, con estilo de calles, nombres, edificios, cuadrícula, zoom y
  marcadores. Actualmente agrupa su interfaz en `index.html`, sin
  cinco archivos de mapa independientes ni licencia explícita.
- `https://github.com/g-hostproxy/Halloween-Map-Exits`: cartografía
  anotada bajo `maps/`, registros de salidas en `exits.json`,
  sin licencia explícita. Cuatro mapas.
- `https://github.com/p8riot/halloween-maps`: cinco mapas y
  versiones paper/realistic bajo `assets/maps/`,
  íconos en `assets/icons/`, coordenadas en `data/maps.js`.
  No declara licencia de reutilización.
- `https://github.com/Davide-DevP/halloween-map-overlay`:
  licencia Apache 2.0 del código con **exclusión expresa de las
  imágenes de terceros** según su `NOTICE`.

Que el repositorio sea público o gratuito, o que el usuario lo descargue
y vuelva a subir, no transfiere los derechos sobre sus imágenes, código o
la selección creativa de datos. Se necesita material original con derechos
apropiados o permiso de sus titulares, respetando las condiciones aplicables.
Si existe una licencia que exige atribución, no puede omitirse ese requisito.
Esto no impide crear nuestros propios íconos ni diseñar el visor en SanLean.

## Arquitectura y regresiones

- `halloween.html`: HTML de WEB pública, un visor y cinco tarjetas.
- `css/halloween-maps.css`: reglas acotadas a `#halloweenMaps`.
- `js/halloween-maps.js`: interacciones y detección de assets `-map.webp`.
- `js/halloween-map-model.mjs`: categorías y validación de coordenadas.
- `data/halloween-maps.json`: catálogo independiente y ampliable.
- `assets/halloween/maps/`: imágenes del proyecto.
- `tests/halloween-maps.test.mjs`: lógica y estructura.
- `tests/halloween-maps.browser.cjs`: desktop, mobile, zoom, tooltip, pin.
- `.github/workflows/halloween-maps.yml`: tests automáticos por push.

No modificar WEB pública fuera de Halloween, USUARIO, overlays ni
arquitecturas existentes. Antes de publicar datos nuevos, probar responsive,
fallos de carga, fuentes y marcadores sobre la base geográfica elegida.
