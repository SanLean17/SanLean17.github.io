# SanLean — VOTACIONES / CARTAS

Este documento define la lógica funcional aprobada para `USUARIO > VOTACIONES` y su relación con las ruletas de perks. Complementa `docs/USUARIO-DESIGN-SYSTEM.md` y debe respetar el mismo sistema visual de USUARIO.

## 1. Principio general

VOTACIONES no es un editor de mazos ni una biblioteca de cartas configurables.

Es una herramienta de juego en vivo conectada al chat de Twitch/Kick. Cada ronda genera automáticamente cinco cartas ocultas identificadas como `A`, `B`, `C`, `D` y `E`.

El streamer controla cuándo iniciar la ronda y cuándo revelar resultados. El contenido de las cartas se genera de forma aleatoria y no se configura carta por carta antes de cada ronda.

## 2. Modos de elección

### MODO CHAT
- El streamer inicia la votación manualmente.
- La ronda dura exactamente 30 segundos.
- Al llegar a 0 segundos, la votación se cierra automáticamente.
- El chat vota escribiendo `A`, `B`, `C`, `D` o `E`.
- El overlay muestra conteos y porcentajes en vivo.
- El sistema determina la carta ganadora al cerrar la ronda.
- La carta ganadora NO se revela automáticamente.
- El streamer debe usar `REVELAR CARTA GANADORA`.

### MODO MANUAL
- Se usan las mismas cinco cartas A–E y la misma generación aleatoria de contenidos.
- No se abre una votación al chat.
- El streamer selecciona manualmente una carta.
- Seleccionar una carta no revela su contenido inmediatamente.
- Después de elegirla, el streamer usa la misma acción de revelación que en MODO CHAT.

## 3. Regla de voto normal

En una ronda normal cada usuario tiene un único voto activo.

Ejemplo:
- Pedro escribe `A` → A recibe el voto de Pedro.
- Pedro escribe luego `B` → A pierde ese voto y B lo recibe.

El voto se reemplaza; no se acumula.

No es necesario mostrar públicamente qué usuario votó cada opción. Internamente el sistema debe poder asociar temporalmente usuario → voto actual para permitir el reemplazo durante la ronda.

## 4. Evento especial

SanLean puede generar aleatoriamente una ronda especial.

Reglas:
- El streamer no fuerza manualmente la aparición del evento.
- El evento se decide antes de abrir la ronda.
- Las cinco cartas cambian visualmente de color/estado para comunicar que es una ronda especial.
- La estructura A–E se mantiene.
- Los resultados posibles de las cartas pueden ser más exigentes que en una ronda normal, por ejemplo `0 PERKS · 0 ADD-ONS`.
- El catálogo exacto de resultados especiales se definirá por separado.

### Voto acumulable en evento especial
Cada mensaje válido cuenta como un voto nuevo.

Ejemplo:
- Pedro escribe `A`, `A`, `B`, `B`.
- A recibe 2 votos.
- B recibe 2 votos.

El overlay debe indicar de forma visible que la ronda es un `EVENTO ESPECIAL` y que los `VOTOS SON ACUMULABLES`.

## 5. Empates

Si la ronda termina empatada:
- No se elige un ganador arbitrariamente.
- Se mantienen exactamente las mismas cinco cartas y sus contenidos ocultos.
- Se reinician los votos.
- Se abre otra votación de 30 segundos.

La repetición por empate no debe regenerar ni reordenar las cartas.

## 6. Revelación de cartas

Al finalizar una ronda:
- La carta ganadora queda identificada visualmente.
- El streamer decide cuándo usar `REVELAR CARTA GANADORA`.
- Al revelarla, la carta muestra el resultado que ya tenía asignado antes de la votación.

Después de revelar la ganadora, el streamer también puede tocar cualquier otra carta A–E para revelar su contenido por curiosidad o a pedido del chat.

Las cartas no ganadoras no cambian el resultado oficial de la ronda; sólo se muestran.

## 7. Resultados normales de perks

En una ronda normal las cinco cartas representan cantidades de perks entre 0 y 4.

La distribución debe mezclarse aleatoriamente entre A–E en cada ronda. Ejemplo posible:
- A = 3 perks
- B = 0 perks
- C = 4 perks
- D = 1 perk
- E = 2 perks

La siguiente ronda vuelve a mezclar las cantidades. El público no conoce el contenido mientras vota.

## 8. Rol de la próxima partida

Antes de iniciar la ronda el streamer debe indicar el rol al que se aplicará el resultado:
- `KILLER`
- `SUPERVIVIENTE`

Esta selección determina qué ruleta de perks recibirá el resultado después de revelar la carta ganadora.

No debe modificar la configuración normal e independiente de las ruletas.

## 9. Integración con las ruletas de perks

Existen dos contextos distintos que no deben confundirse.

### Ruleta normal
El streamer entra directamente a `PERKS DE KILLERS` o `PERKS DE SUPERVIVIENTES` y gira la ruleta sin una votación previa.

- Funciona con la configuración habitual de esa sección.
- Los cuatro slots siguen su comportamiento normal.
- No hereda ninguna cantidad desde VOTACIONES.

### Ruleta proveniente de VOTACIONES
La carta ganadora define una cantidad exacta de perks entre 0 y 4.

Ejemplos:
- Resultado `0 PERKS`: no se gira ninguna ruleta y se informa que la partida se juega sin perks.
- Resultado `2 PERKS` de Superviviente: la ruleta de superviviente muestra cuatro posiciones, dos quedan vacías/inactivas desde el inicio y sólo dos slots giran.
- Resultado `3 PERKS` de Killer: un slot queda vacío/inactivo y tres slots giran.

Regla crítica:
- Los slots activos de una ruleta proveniente de VOTACIONES deben terminar siempre en perks reales.
- No pueden resolver `SLOT VACÍO` ni perder una de las cantidades ya definidas por la carta.

La cantidad ganada por la carta manda sobre la cantidad de slots activos.

## 10. Control del streamer después de revelar

SanLean no debe girar una ruleta automáticamente al revelar la carta.

Después del reveal se muestra una acción contextual:
- `IR A PERKS DE KILLER`, o
- `IR A PERKS DE SUPERVIVIENTE`.

Al entrar en esa sección, la ruleta debe saber que existe un resultado pendiente de VOTACIONES y mostrar la cantidad correspondiente, por ejemplo `2 PERKS PENDIENTES`.

El streamer sigue teniendo el control y toca `GIRAR` cuando quiera.

## 11. Estados funcionales de VOTACIONES

Estados principales:
- `SIN INICIAR`
- `VOTACIÓN ACTIVA`
- `FINALIZADA`
- `EMPATE`
- `ESPERANDO REVELACIÓN`
- `REVELADA`

Un evento especial usa además una marca visual propia, pero sigue respetando estos estados funcionales.

## 12. Estructura de USUARIO > VOTACIONES

La sección debe evitar cualquier editor de mazos.

Configuración mínima previa:
- `MODO`: CHAT / MANUAL.
- `ROL DE LA PRÓXIMA PARTIDA`: KILLER / SUPERVIVIENTE.
- `PLATAFORMA`: TWITCH / KICK / AMBAS, cuando las integraciones estén disponibles.

Control de ronda:
- `INICIAR VOTACIÓN` en MODO CHAT.
- selección manual de A–E en MODO MANUAL.
- temporizador fijo de 30 segundos en MODO CHAT.
- `FINALIZAR` sólo como acción manual excepcional si se decide conservarla.
- `REVELAR CARTA GANADORA` después del cierre.
- posibilidad de revelar individualmente las otras cartas luego de la ganadora.
- `NUEVA RONDA` cuando termina el uso del resultado actual.

Vista previa:
- debe mostrar las cinco cartas A–E como se verán en OBS.
- debe reflejar votos, porcentajes, temporizador, ganador, reveal y evento especial.

## 13. Separación con OVERLAYS OBS

VOTACIONES controla la ronda; OVERLAYS OBS es la salida visual.

El streamer no configura las reglas de las cartas desde OVERLAYS OBS. La URL del overlay es estable y recibe el estado de la ronda en vivo.

## 14. Principios que no deben romperse

- No guardar mazos configurables como flujo principal.
- No revelar automáticamente la carta ganadora.
- No girar automáticamente una ruleta tras el reveal.
- No regenerar cartas durante un desempate.
- No permitir `SLOT VACÍO` en slots activos de una ruleta especial proveniente de VOTACIONES.
- No mezclar la configuración de la ruleta normal con la configuración temporal heredada desde una carta.
- El streamer siempre mantiene el control de los momentos clave: iniciar ronda, revelar y girar la ruleta resultante.
