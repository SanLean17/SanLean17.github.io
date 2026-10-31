# HALLOWEEN: mapas interactivos de la WEB pública

## 31 de octubre de 2026 — Restauración y publicación

La WEB pública en `/halloween.html` volvió a mostrar los mapas interactivos que estaban
preparados pero no conectados mientras la portada decía «Próximamente».

- Galería con **3 columnas escritorio**, 2 tablet, 1 móvil y cinco escenarios.
- Título HALLOWEEN e introducción acordada con el propietario, sin kicker.
- Diseño oscuro con acento `#FF003C`, fuente y bordes consistentes con la WEB pública.
- Se recupera el fondo original facilitado por el propietario en una variante WebP
  comprimida incrustada en `css/halloween-background.css`; cargado exclusivamente
  por `halloween.html`. Se conserva el fondo de todas las demás páginas.
- Los cinco SVG provisionales fueron reemplazados por **ilustraciones cartográficas
  conceptuales originales de SanLean**. Tienen rutas, siluetas y decoración artística;
  **NO son una representación geográfica del juego** ni deben tomarse como tal. La
  marca visible «ESQUEMA ARTÍSTICO · SIN COORDENADAS VERIFICADAS» es obligatoria.
  Tampoco hay marcadores fácticos ni etiquetas geolocalizadas. Nunca usar estos
  dibujos para fijar ubicaciones sin comprobar una imagen licenciada real.
- El visor anterior sigue permitiendo zoom, arrastre, pellizco, controles, teclado,
  una marca personal por mapa en `sessionStorage`, filtros y leyenda. Se añaden
  vista clara/oscura y pantalla completa cuando el navegador la admite.
- Barra de datos a la derecha: descripción y referencias **textuales** de cada mapa,
  con enlaces a artículos oficiales de `halloweengame.com`. Son nombres de lugares,
  no coordenadas ni promesas de apariciones.
- Se conservan los 7 tipos de íconos y sus colores hasta que existan posiciones
  probadas. No se reutilizó ni copió el dataset o arte de repositorios ajenos.
- `tests/halloween-maps.test.mjs` y `tests/halloween-maps.browser.cjs` actualizados,
  con workflow exclusivo `.github/workflows/halloween-maps.yml` para verificar
  sintaxis, datos y experiencia desktop/mobile sin modificar otras secciones.

**Pendiente para mapas reales**: obtener imágenes con permiso compatible, sustituir
los cinco SVG (manteniendo dimensiones y coordenadas del catálogo) y realizar
verificación presencial/de fuentes fiables de escapes, objetos y referencias antes
de publicar los markers. Las ilustraciones actuales sirven para explorar y probar
la interfaz, no como guía de partida.

---


Implementación propia de SanLean, 30 de octubre de 2026. Ruta: `/halloween.html`.
No cambia navegación, footer, fondos, Analytics, CÓDIGOS ni USUARIO.

## Estado de entrega y assets

El visor es funcional. **No hay todavía cartografía autorizada ni coordenadas
verificadas para publicar.** Los cinco fondos son placeholders SVG originales,
creados con texto y geometría neutra; no representan calles, edificios ni terreno.
No se encontraron mapas autorizados existentes en el repositorio. Los retratos de
`Heroes Halloween/` no son mapas y no se reutilizan como tales.

| Mapa | Archivo en assets/halloween/maps/ | Estado / procedencia |
| --- | --- | --- |
| Haddonfield Heights | haddonfield-heights.svg | Placeholder propio de SanLean |
| Haddonfield Town Center | haddonfield-town-center.svg | Placeholder propio de SanLean |
| Orange Grove Estates | orange-grove-estates.svg | Placeholder propio de SanLean |
| East Haddonfield | east-haddonfield.svg | Placeholder propio de SanLean |
| The Tower Farm | tower-farm.svg | Placeholder propio de SanLean |

No se copiaron código, mapas, datasets, coordenadas, iconos ni arte de terceros.
Los pictogramas son trazos SVG propios. Sin dependencias de pan/zoom ni licencias
externas nuevas. Los recursos y fuentes globales ya existentes se conservan.

**Datos publicados: 0 markers y 0 etiquetas en cada mapa.** Por categoría: gate 0,
car 0, cellar 0, drain 0, vehicle_exit 0, supply 0, landmark 0. Fuente/confianza de
posiciones: no aplicable; no se publican datos sin evidencia. Los puntos sintéticos
de las pruebas se inyectan únicamente en el navegador de test, nunca en este JSON.

## Arquitectura

- `halloween.html`: estructura, metadata propia y carga exclusiva del visor.
- `css/halloween-maps.css`: reglas limitadas a `#halloweenMaps`; adaptación local de
  la altura de main frente al modo compacto mobile existente, sin cambiar el menú.
- `js/halloween-maps.js`: galería, estado del visor, Pointer Events, rueda, teclado,
  filtros, información accesible, carga/error y sessionStorage.
- `js/halloween-map-model.mjs`: categorías, pictogramas, validación y geometría pura.
- `data/halloween-maps.json`: catálogo extensible, no hay límite fijo de cinco mapas.
- `assets/halloween/maps/`: placeholders, futura cartografía autorizada.
- `tests/halloween-maps.test.mjs` y `tests/halloween-maps.browser.cjs`: pruebas propias.

No framework ni llamadas a servicios externos para el visor. Se consulta solamente
el JSON local y sus imágenes. No editor, importación, exportación, notas públicas,
Match Mode ni escritura de archivos. No se agregan eventos de Analytics en esta etapa.

## Formato de datos

`schemaVersion: 1`, `maps: []`. Cada mapa requiere `id` único (minúsculas/números/guiones),
`name`, `image`, `width`, `height`, `placeholder`, `markers` y `labels`.
`asset.origin` y `asset.permission` registran procedencia y permiso.
Las imágenes usan rutas locales `/assets/halloween/maps/nombre.svg|png|webp|jpg`.
Al agregar una imagen real se deben indicar sus dimensiones reales, documentar el
permiso y poner `placeholder: false`. Un placeholder con markers/labels es rechazado.
Agregar mapa #6 o #7 solo requiere otra entrada válida y su asset autorizado.

Cada marker requiere:

- `id`, `type`, `x`, `y`, `title`, `description`.
- `possible`: booleano; si es true, se añade lenguaje de ubicación posible.
- `confidence`: `confirmed`, `likely` o `community`; las dos últimas se muestran
  como referencias orientativas, sin presentar certeza absoluta.
- `source`: evidencia verificable, URL y/o referencia a observación propia.
- Opcionales: `requirements`, `variant`, `notes` (textos en español).

`labels` contiene `{x, y, text, source}` para calles/números/referencias verificadas.
No hay etiquetas predeterminadas inventadas. Se ocultan con su filtro y escalan con
el mapa. Antes de publicar deben revisarse sus posiciones para no tapar markers.

| type | Etiqueta | Color |
| --- | --- | --- |
| gate | Puerta de salida | #69d99b |
| car | Auto de escape | #6cbbff |
| cellar | Sótano / escotilla | #ff697d |
| drain | Alcantarilla / desagüe | #bd98ff |
| vehicle_exit | Salida de vehículos | #64d7cf |
| supply | Posible fuente de objetos | #f2bf64 |
| landmark | Referencia | #d6d9e2 |

En mapas reales solo aparecen categorías con datos. Los placeholders muestran la
leyenda preparada, con conteos cero y controles deshabilitados. Nunca se presentan
como puntos conocidos. La cuadrícula A–J / 1–10 es una ayuda propia de coordenadas,
no una afirmación sobre la cuadrícula oficial del juego.

## Coordenadas, zoom y gestos

Coordenadas normalizadas `x,y` entre 0 y 1, relativas a la imagen completa.
Imagen, labels, cuadrícula y anchors comparten una única escena transformada.
La escala inversa aplicada a los pictogramas mantiene su tamaño legible sin mover
su anclaje. El pin usa la transformación inversa del mismo sistema de coordenadas.

Al abrir/cambiar/resize/rotación: mapa completo y centrado. Zoom entre 1× y 8×
respecto al encuadre completo, con ancla en el cursor/punto medio de los dedos.
Pan limitado para no perder el mapa. Pointer capture mantiene el gesto fuera del
visor; cancelación, pérdida de foco y cambio de mapa limpian los punteros activos.
Un drag o pinch no coloca un pin ni activa accidentalmente la ficha de un marker.

Desktop: leyenda izquierda, mapa (~2/3 del ancho) central, selector derecho.
Hasta 900px: selector horizontal, mapa, controles y leyenda plegable debajo.
Galería: 4 columnas anchas, 3 hasta 1200, 2 hasta 900 y 1 hasta 760.
El mapa usa `dvh/svh`; el gesto se captura solo dentro del visor, no en toda la página.

Rueda, +/−, arrastre con mouse, pan con un dedo, pinch con dos y reset.
Teclado en el visor: flechas mueven, +/− acercan/alejan, 0 reajusta, Esc cancela.
Los markers son botones: hover con título breve; click/tap/Enter abre ficha en español.
La ficha recibe foco, se vuelve visible y al cerrar devuelve foco al marker.
Los controles tienen nombres accesibles y foco visible.

## Pin personal

MARCAR MI POSICIÓN activa el siguiente click/tap válido. Un segundo gesto reemplaza
el único pin de ese mapa. Para teclado: enfocar visor, desplazar mapa con flechas,
Enter coloca el pin en el centro. BORRAR POSICIÓN elimina solo el pin de ese mapa.
Anillo #FF003C, fondo blanco, centro rojo; ficha MI POSICIÓN.

`sessionStorage['sanlean.halloween.positions.v1']` guarda `{mapId:{x,y}}`.
Un pin independiente por mapa; persiste al cambiar de mapa/recargar en esa sesión.
No se envía al servidor ni modifica JSON ni la vista de otros usuarios.
Si el almacenamiento está bloqueado, funciona en memoria mientras la página siga
abierta. El navegador puede restaurar sessionStorage al recuperar una sesión cerrada;
no se ofrece una garantía de borrado al cerrar/restaurar el navegador.

## Referencias y licencias revisadas

Consultadas el 30/10/2026 únicamente como referencias; sin copiar implementación.

- https://github.com/Gitjon72/Haddonfield-atlas — galería, zoom/pan, mobile, marcadores
  y cuadrícula. Sin LICENSE declarada en el registro/listado consultado.
- https://github.com/p8riot/halloween-maps — categorías, navegación y cinco mapas;
  posibles ubicaciones diferenciadas de lo presente en una partida. Sin licencia
  declarada en el registro/listado consultado; no se importó su dataset.
- https://github.com/g-hostproxy/Halloween-Map-Exits — filtros y coordenadas porcentuales.
  Sin LICENSE declarada en el registro/listado consultado; no se usó exits.json.
- https://github.com/Davide-DevP/halloween-map-overlay — código Apache 2.0, sin reutilizarlo.
  Su NOTICE excluye expresamente las imágenes externas de mapas de esa licencia:
  https://github.com/Davide-DevP/halloween-map-overlay/blob/main/NOTICE
  No se descargaron ni se reutilizaron esas imágenes.

Fuentes primarias de hechos del juego:

- https://halloweengame.com/news/halloween-2026-content-update/ — confirma The Tower
  Farm como mapa #5, anunciado para el 27 de octubre de 2026.
- https://halloweengame.com/news/patch-notes-1-2-0/ — confirma la disponibilidad de
  Tower Farm y el nuevo escape por alcantarilla. No aporta coordenadas normalizadas
  sobre un asset autorizado para SanLean: no se deducen posiciones ni requisitos.

Las referencias comunitarias difieren en cobertura y recuentos; no se transforma
su coincidencia nominal en coordenadas comprobadas. No se modificó creditos.html
porque no se reutilizó ningún recurso externo que requiera atribución nueva.

## Validación y pendientes

Ejecutar `node --test tests/halloween-maps.test.mjs`.
Browser: `PLAYWRIGHT_MODULE` apunta a Playwright instalado y
`node tests/halloween-maps.browser.cjs`. `HALLOWEEN_ENGINE=webkit` prueba WebKit;
`HALLOWEEN_BASE_URL=https://sanlean.com.ar/halloween.html` prueba producción.
Las pruebas bloquean Analytics para no generar visitas de control.

Matriz Chromium: 1920, 1440, 1280, 1024, 430, 390, 375 y 320. WebKit: cuatro anchos
mobile. Pin, storage, navegación, zoom/pan, touch en Chromium, filtros con fixture,
labels, teclado, rotación, fallos de imagen y recuperación. Las pruebas emulan
navegadores/dispositivos; no equivalen a prueba física en un teléfono.

Pendientes en los cinco mapas: imagen autorizada, calibración contra esa imagen,
verificación propia de coordenadas/variantes, calles y direcciones, fuentes de
objetos y requisitos de salidas. Tower Farm requiere además verificar el acceso y
los requisitos de su alcantarilla. No publicar datos simulados para llenar esos vacíos.
