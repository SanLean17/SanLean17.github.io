# SanLean — CARTAS

Este documento define la lógica funcional aprobada para `USUARIO > CARTAS` y su relación con las ruletas de perks. Complementa `docs/USUARIO-DESIGN-SYSTEM.md` y debe respetar el mismo sistema visual de USUARIO.

`CARTAS` reemplaza el nombre anterior `VOTACIONES`. La votación es una modalidad de la herramienta, no el nombre del módulo completo.

## 1. Principio general

CARTAS no es un editor de mazos ni una biblioteca de cartas configurables.

Es una herramienta de juego en vivo conectada al chat de Twitch/Kick. Cada ronda genera automáticamente cinco cartas ocultas identificadas por las letras `A`, `B`, `C`, `D` y `E`, pero el orden visual se mezcla en cada nueva ronda. Ejemplos válidos: `B · D · C · A · E`, `E · A · D · B · C`, etc.

El streamer controla cuándo iniciar la ronda y cuándo revelar resultados. El contenido de las cartas se genera de forma aleatoria y no se configura carta por carta antes de cada ronda.

## 2. Plataforma persistente

La plataforma se configura a nivel de la herramienta CARTAS y no en cada ronda.

Opciones:
- `TWITCH`
- `KICK`
- `TWITCH + KICK`

La selección queda guardada para las rondas siguientes hasta que el propietario la cambie. Si en el futuro sólo existe una plataforma conectada, la interfaz puede bloquear automáticamente la opción correspondiente.

## 3. Modos de elección

### MODO CHAT
- El streamer inicia la votación manualmente.
- La ronda dura exactamente 30 segundos.
- Al llegar a 0 segundos, la votación se cierra automáticamente.
- El chat vota escribiendo la letra visible de la carta.
- El overlay muestra conteos y porcentajes en vivo debajo de las cartas, no dentro de las cartas.
- El sistema determina la carta ganadora al cerrar la ronda.
- La carta ganadora NO se revela automáticamente.
- El streamer debe usar `REVELAR CARTA GANADORA`.

### MODO MANUAL
- Se usan las mismas cinco cartas y la misma generación aleatoria de contenidos.
- No se abre una votación al chat.
- El streamer selecciona manualmente una carta.
- Seleccionar una carta no revela su contenido inmediatamente.
- Después de elegirla, el streamer usa la misma acción de revelación que en MODO CHAT.

## 4. Regla de voto normal

En una ronda normal cada usuario tiene un único voto activo.

Ejemplo:
- Pedro escribe `A` → A recibe el voto de Pedro.
- Pedro escribe luego `B` → A pierde ese voto y B lo recibe.

El voto se reemplaza; no se acumula.

No es necesario mostrar públicamente qué usuario votó cada opción. Internamente el sistema debe poder asociar temporalmente usuario → voto actual para permitir el reemplazo durante la ronda.

## 5. Evento especial

SanLean puede generar aleatoriamente una ronda especial.

Reglas:
- El streamer no fuerza manualmente la aparición del evento.
- El evento se decide antes de abrir la ronda.
- Las cinco cartas cambian visualmente de color/estado para comunicar que es una ronda especial.
- Se conserva la misma estructura y las mismas letras, con orden mezclado.
- Los resultados posibles pueden ser más exigentes que en una ronda normal, por ejemplo `0 PERKS · 0 ADD-ONS`.
- El catálogo exacto de resultados especiales se definirá por separado.
- La probabilidad exacta de aparición todavía no está fijada y no debe inventarse localmente en código.

### Voto acumulable en evento especial
Cada mensaje válido cuenta como un voto nuevo.

Ejemplo:
- Pedro escribe `A`, `A`, `B`, `B`.
- A recibe 2 votos.
- B recibe 2 votos.

El overlay debe indicar de forma visible `EVENTO ESPECIAL` y `VOTOS ACUMULABLES`.

## 6. Empates

Si la ronda termina empatada:
- No se elige un ganador arbitrariamente.
- Se mantienen exactamente las mismas cinco cartas, el mismo orden y sus contenidos ocultos.
- Se reinician los votos.
- Se abre otra votación de 30 segundos.

La repetición por empate no debe regenerar ni reordenar las cartas.

## 7. Apariencia y anatomía de las cartas

La carta normal usará como base el asset `rectangulo-fondo.png` cuando esté disponible en GitHub.

Reglas ya aprobadas:
- No se muestran killers, perks ni ilustraciones de personajes en el frente.
- El frente muestra únicamente el fondo y una letra grande con la tipografía de SanLean.
- La letra ocupa un protagonismo similar al de la referencia visual aprobada.
- Los votos, cantidad y porcentaje se muestran debajo de las cinco cartas mediante filas/barras, nunca dentro de cada carta.
- La carta ganadora recibe el resplandor exterior de selección del sistema.
- La ganadora no se da vuelta automáticamente.
- Al revelar, la misma carta muestra el reverso y encima un PNG/símbolo correspondiente al resultado de perks. Esos assets se incorporarán cuando el usuario los suba al repositorio.

Para evento especial se usará una variante visual del mismo asset, manteniendo dimensiones y geometría. La propuesta visual actual es una familia violeta/púrpura diferenciada del rojo de marca, con glow controlado; el asset definitivo se aprobará cuando sea editado.

## 8. Revelación de cartas

Al finalizar una ronda:
- La carta ganadora queda identificada visualmente con resplandor.
- El streamer decide cuándo usar `REVELAR CARTA GANADORA`.
- Al revelarla, la carta muestra el resultado que ya tenía asignado antes de la votación.

Después de revelar la ganadora, el streamer también puede tocar cualquier otra carta para revelar su contenido por curiosidad o a pedido del chat.

Las cartas no ganadoras no cambian el resultado oficial de la ronda; sólo se muestran.

## 9. Resultados normales de perks

En una ronda normal las cinco cartas representan cantidades de perks entre 0 y 4.

Las cantidades se mezclan aleatoriamente entre las cinco cartas en cada nueva ronda. Ejemplo posible:
- carta visible C = 3 perks
- carta visible B = 0 perks
- carta visible D = 4 perks
- carta visible E = 1 perk
- carta visible A = 2 perks

La siguiente ronda vuelve a mezclar tanto la posición de las letras como los resultados. El público no conoce el contenido mientras vota.

## 10. Rol de la próxima partida

Antes de iniciar la ronda el streamer debe indicar el rol al que se aplicará el resultado:
- `KILLER`
- `SUPERVIVIENTE`

Esta selección determina qué ruleta de perks recibirá el resultado después de revelar la carta ganadora.

No debe modificar la configuración normal e independiente de las ruletas.

## 11. Integración con las ruletas de perks

Existen dos contextos distintos que no deben confundirse.

### Ruleta normal
El streamer entra directamente a `PERKS DE KILLERS` o `PERKS DE SUPERVIVIENTES` y gira la ruleta sin una ronda de CARTAS previa.

- Funciona con la configuración habitual de esa sección.
- Los cuatro slots siguen su comportamiento normal.
- No hereda ninguna cantidad desde CARTAS.

### Ruleta proveniente de CARTAS
La carta ganadora define una cantidad exacta de perks entre 0 y 4.

Ejemplos:
- Resultado `0 PERKS`: no se gira ninguna ruleta y se informa que la partida se juega sin perks.
- Resultado `2 PERKS` de Superviviente: la ruleta de superviviente muestra cuatro posiciones, dos quedan vacías/inactivas desde el inicio y sólo dos slots giran.
- Resultado `3 PERKS` de Killer: un slot queda vacío/inactivo y tres slots giran.

Regla crítica:
- Los slots activos de una ruleta proveniente de CARTAS deben terminar siempre en perks reales.
- No pueden resolver `SLOT VACÍO` ni perder una de las cantidades ya definidas por la carta.

La cantidad ganada por la carta manda sobre la cantidad de slots activos.

## 12. Control del streamer después de revelar

SanLean no debe girar una ruleta automáticamente al revelar la carta.

Después del reveal se muestra una acción contextual:
- `IR A PERKS DE KILLERS`, o
- `IR A PERKS DE SUPERVIVIENTES`.

Al entrar en esa sección, la ruleta debe saber que existe un resultado pendiente de CARTAS y mostrar la cantidad correspondiente, por ejemplo `2 PERKS PENDIENTES`.

El streamer mantiene el control y toca `GIRAR` cuando quiera.

## 13. Estados funcionales

Estados principales:
- `SIN INICIAR`
- `VOTACIÓN ACTIVA`
- `ELECCIÓN MANUAL`
- `EMPATE`
- `ESPERANDO REVELACIÓN`
- `REVELADA`

Un evento especial usa además una marca visual propia, pero sigue respetando estos estados funcionales.

## 14. Estructura de USUARIO > CARTAS

No existe editor de mazos.

Orden de interfaz aprobado:
1. `PLATAFORMA DE CARTAS`: configuración persistente Twitch/Kick/Ambas.
2. `CONFIGURACIÓN DE LA RONDA`: MODO CHAT/MANUAL + PRÓXIMA PARTIDA KILLER/SUPERVIVIENTE.
3. `CONTROL EN VIVO`: estado, tiempo, total de votos y marca de evento especial.
4. `CARTAS`: cinco cartas limpias arriba y votos/porcentajes en barras debajo.
5. Acciones de cierre/reveal.
6. `RESULTADO DE LA RONDA` y continuación a la ruleta correspondiente.
7. `NUEVA RONDA`.

Control de ronda:
- `INICIAR VOTACIÓN` en MODO CHAT.
- cierre automático a los 30 segundos.
- `GENERAR CARTAS` en MODO MANUAL.
- selección manual de una carta en MODO MANUAL.
- `REVELAR CARTA GANADORA` después del cierre/selección.
- posibilidad de revelar individualmente las otras cartas luego de la ganadora.
- `NUEVA RONDA` cuando termina el uso del resultado actual.

## 15. Separación con OVERLAYS OBS

CARTAS controla la ronda; OVERLAYS OBS es la salida visual.

El streamer no configura las reglas de las cartas desde OVERLAYS OBS. La URL del overlay es estable y recibe el estado de la ronda en vivo.

## 16. Principios que no deben romperse

- No volver a crear mazos configurables como flujo de CARTAS.
- No pedir la plataforma nuevamente en cada ronda.
- No poner votos o porcentajes dentro de las cartas.
- No revelar automáticamente la carta ganadora.
- No girar automáticamente una ruleta tras el reveal.
- No regenerar ni reordenar cartas durante un desempate.
- No permitir `SLOT VACÍO` en slots activos de una ruleta especial proveniente de CARTAS.
- No mezclar la configuración de la ruleta normal con la configuración temporal heredada desde una carta.
- El streamer siempre mantiene el control de los momentos clave: iniciar/generar, seleccionar cuando corresponde, revelar y girar la ruleta resultante.
