# CARTAS · rombos para USUARIO y OBS

## Prueba en OBS

Browser Source de demostración, sin iniciar sesión y sin modificar ningún stream:

- Normal oculto: https://sanlean.com.ar/Usuario/overlay.html?demo=normal
- Caótico oculto: https://sanlean.com.ar/Usuario/overlay.html?demo=chaotic
- Sólo ganador: https://sanlean.com.ar/Usuario/overlay.html?demo=chaotic&reveal=winner
- Los cinco revelados: https://sanlean.com.ar/Usuario/overlay.html?demo=chaotic&reveal=all

Agregar una **Fuente de navegador**, pegar la URL y usar **1920 × 1080**. El fondo es transparente; no requiere chroma. La demostración es estática y sirve para revisar tamaño, artes, textos y glow. Se puede redimensionar la fuente en la escena.

Para una ronda real: entrar en **MI PANEL → OVERLAYS → CARTAS** y copiar **URL OBS · VISUALIZACIÓN**. La ruta real distingue mayúsculas: `/Usuario/overlay.html?token=…`. Cada espacio de streamer tiene sus tokens propios, creados al cargar el panel con una sesión autorizada. No usar la URL privada de control como fuente de transmisión. No se guardan tokens personales en este repositorio.

En **CARTAS** elegir **MANUAL**, rol y **NORMAL / CAÓTICO**, generar la ronda, elegir A–E, revelar ganador y luego revelar otros rombos individualmente o **REVELAR LAS CINCO**. Elegir o finalizar una votación nunca revela el resultado. **CONTINUAR A LA RULETA** aplica la regla una sola vez; **APLICAR PARTIDA SIN PERKS** muestra los resultados de cero perks.

La conexión automática de mensajes Twitch/Kick todavía depende de completar OAuth/entrada de chat del proyecto. La prueba manual funciona sin esa conexión. No se afirma que el chat esté conectado porque exista el selector de plataforma.

## Presentación

Cinco rombos A–B–C–D–E en disposición escalonada: A/C/E abajo, B/D arriba. Antes de revelar, sólo el rombo base y su letra. Los textos aparecen debajo de A/C/E y arriba de B/D. Las composiciones PNG quedan dentro del rombo; no se recortan ni se rotan las perks. Ganador con resplandor y pulso suave: **#FF003C** normal, **#873FFD** caótico. Se respeta la preferencia de reducir movimiento. Panel y OBS comparten el mismo componente visual.

## Catálogo completo y nombres comprobados

Se conservan los nombres efectivamente subidos; los caóticos de 2/3/4 usan `perk` en singular. No renombrar imágenes sin actualizar `data/cards-assets.json`.

| Resultado | PNG en `/cartas/` | Disponible |
|---|---|---|
| 0 perks normal | `normal-0-perks.png` | Ambos roles |
| 1 perk normal | `normal-1-perk.png` | Ambos roles |
| 2 perks normal | `normal-2-perks.png` | Ambos roles |
| 3 perks normal | `normal-3-perks.png` | Ambos roles |
| 4 perks normal | `normal-4-perks.png` | Ambos roles |
| 0 perks en ronda caótica | `caotico-0-perks.png` | Ambos roles |
| 1 perk en ronda caótica | `caotico-1-perk.png` | Ambos roles |
| 2 perks en ronda caótica | `caotico-2-perk.png` | Ambos roles |
| 3 perks en ronda caótica | `caotico-3-perk.png` | Ambos roles |
| 4 perks en ronda caótica | `caotico-4-perk.png` | Ambos roles |
| 0 perks + 0 addons | `caotico-0-perks-0-addons.png` | Ambos roles |
| 2 malas + 1 buena + 1 random | `caotico-2-malas-1-buena-1-random.png` | Ambos roles |
| Auras killer | `caotico-auras-killer.png` | Killer |
| Auras superviviente | `caotico-auras-superviviente.png` | Superviviente |
| Obsesión killer | `caotico-obsesion-killer.png` | Killer |
| Tótems killer | `caotico-totems-killer.png` | Killer |
| Tótems superviviente | `caotico-totems-superviviente.png` | Superviviente |
| Me la Pela + Objeto + 2 random | `caotico-me-la-pela-objeto-2-random.png` | Superviviente |
| Me la Pela + vacío + 2 random | `caotico-me-la-pela-slot-vacio-2-random.png` | Superviviente |

Bases compartidas en raíz: `/rombo.png` y `/rombo-caotico.png`. **Una ronda caótica siempre usa el arte caótico, incluso cuando gana 0, 1, 2, 3 o 4 perks.**

## Generación de rondas y votos

- Normal: exactamente 0/1/2/3/4 perks, mezcladas entre A–E. Un voto vigente por identidad y plataforma; un nuevo mensaje válido reemplaza el anterior.
- Caótico superviviente: cinco opciones distintas del catálogo de **11** resultados (5 cantidades + 6 especiales).
- Caótico killer: cinco opciones distintas del catálogo de **10** resultados (5 cantidades + 5 especiales).
- Siempre hay al menos un especial en caótico. Si la primera selección contiene sólo los cinco normales, uno se reemplaza por un especial y se vuelve a mezclar. Esto garantiza la condición; no implica probabilidad uniforme para todos los conjuntos.
- Son posibles **461 conjuntos** distintos para superviviente y **251 para killer**, sin contar el orden A–E: todas las selecciones de cinco resultados distintos salvo el conjunto formado sólo por los cinco normales. Un conjunto puede tener de uno a cinco especiales.
- Se mezclan cartas del rol elegido; no se ofrecen resultados del otro rol. `0 perks` y `0 perks + 0 addons` son resultados diferentes y pueden coexistir.
- Cada mensaje caótico válido suma, incluso si la misma persona repite su letra. El mensaje debe contener una sola letra A/B/C/D/E, sin importar mayúsculas y espacios externos. `A A A` no cuenta como tres votos.
- `registerChatMessage({platform,userId,message})` acepta Twitch/Kick según la plataforma seleccionada. En “ambas”, las identidades quedan separadas por plataforma.
- Ronda de 30 segundos. Empate: se puede repetir con las mismas cinco opciones y votos reiniciados. Cero votos: no hay ganador. Nada dispara la ruleta automáticamente.
- La probabilidad automática de evento caótico sigue sin definirse (`null`); el selector permite forzarlo para pruebas sin inventar un porcentaje.

## Qué llega a la ruleta al ganar

`R` = perk aleatoria habilitada del rol, con su peso configurado. `W` = pool editorial Weak (“malas”). `S` = pool editorial Strong (“buenas”). Los términos no son una clasificación oficial de DBD.

| Carta ganadora | Combinación exacta del próximo resultado |
|---|---|
| 0 perks | Ninguna perk; no impone restricción de addons |
| 1 perk | R1 |
| 2 perks | R1 + R2 |
| 3 perks | R1 + R2 + R3 |
| 4 perks | R1 + R2 + R3 + R4 |
| 0 perks + 0 addons | Ninguna perk ni addon; la restricción de addons se muestra como indicación para la partida |
| 2 malas + 1 buena + 1 random | W1 + W2 + S1 + R1; cuatro perks distintas |
| Auras killer | Cuatro perks distintas del pool Aura killer |
| Auras superviviente | Cuatro perks distintas del pool Aura superviviente |
| Obsesión killer | Cuatro perks distintas del pool Obsession killer |
| Tótems killer | Cuatro perks distintas del pool Totem killer |
| Tótems superviviente | Cuatro perks distintas del pool Totem superviviente |
| Me la Pela + Objeto + 2 random | Slot 1: `30_noMither`; slot 2: `32_objectOfObsession`; slots 3/4: dos R distintas |
| Me la Pela + vacío + 2 random | Slot 1: `30_noMither`; slot 2: `slot_vacio`; slots 3/4: dos R distintas (tres perks equipadas y un vacío) |

Las cantidades 0–4 tienen las mismas reglas cuando aparecen en un evento caótico; cambia el arte, no su significado.

### Todas las combinaciones de perks permitidas

- Cantidad N: cualquier selección ponderada de N perks distintas habilitadas del rol. Los slots no usados no se completan con más perks.
- Categoría: cualquier grupo de cuatro perks distintas del pool temático correspondiente que figura más abajo, sujeto a la prioridad de habilitadas. Ninguna perk ajena a la categoría rellena una build temática.
- Calidad: cualquier pareja distinta del pool Weak + una Strong distinta de las anteriores + una habilitada distinta de las tres. La aleatoria puede pertenecer también a Weak o Strong; lo prohibido es repetir la misma perk.
- Fijas: se conservan los dos slots indicados y cualquier pareja aleatoria distinta y compatible puede ocupar los otros dos. Las fijas se buscan en el catálogo completo aunque el propietario les haya puesto peso cero.
- Vacíos: `slot_vacio` se excluye de cantidades, categorías y random. Sólo aparece cuando la carta exige expresamente ese slot.
- Con Me la Pela fija, el componente aleatorio excluye `42_selfCare`, `76_forThePeople` y `95_circleOfHealing`, además de las fijas y el vacío. Las reglas están en `data/perk-constraints.json`. No se agregaron incompatibilidades generales nuevas.
- La exclusión se mantiene entre todos los grupos: no se repiten claves de perks, aunque una pertenezca a varios pools.

### Pesos y fallback

1. Se priorizan perks habilitadas de la categoría o calidad requerida, según sus pesos.
2. Si no alcanzan para cubrir los slots temáticos, Weak o Strong, se completa desde el catálogo de **esa misma categoría**, sin repetir. Las perks deshabilitadas rescatadas reciben peso 1.
3. Las posiciones R respetan estrictamente el pool habilitado: no reactivan perks deshabilitadas. Si faltan suficientes R distintas/compatibles, el giro se rechaza y la regla queda pendiente para corregir el pool y reintentar. Tampoco se entrega una build incompleta si faltan perks temáticas o fijas en el catálogo.
4. Los resultados cero no necesitan un pool habilitado para aplicarse.

### Consumo de un único giro y espacios de streamer

La regla incluye identificador de ronda, rol y espacio de streamer. Sólo puede aplicarse a la ruleta de perks de ese rol y espacio; no modifica la ruleta de killers. Revelar otros rombos no cambia la regla ganadora. El botón queda bloqueado tras un giro exitoso y el almacenamiento pendiente se borra sólo cuando el resultado se confirmó en Supabase. Un error conserva la regla para reintentar.

Se bloquean giros simultáneos por overlay y, en navegadores compatibles, entre pestañas del mismo navegador con Web Locks. Una confirmación tardía nunca borra una regla nueva de otra ronda. La selección normal de las ruletas se mantiene cuando no existe una regla de CARTAS aplicable.

La regla pendiente y la ronda viven en el navegador que controla CARTAS. No hay arbitraje de partidas simultáneas entre dispositivos: usar un panel controlador por espacio durante la prueba. OBS sólo consulta el estado público. Los resultados ocultos, sus reglas y sus imágenes no se publican hasta que el streamer los revela. El permiso existente de OVERLAYS sigue siendo necesario para publicar; no se cambiaron RLS ni permisos de colaboradores.

## Pools actuales de generación

Fuente de verdad: `data/perk-categories.json` y los catálogos del rol. Se enumeran los integrantes actuales para que pueda reconstruirse cualquier combinación de la tabla anterior. Si se actualizan estos JSON, revisar esta lista.

### Superviviente

**Tótems (11):** Caza menor (`44_smallGame`); Fuerza interior (`70_innerStrength`); Contrafuerza (`91_counterforce`); BendiciÃ³n: CÃ­rculo de curaciÃ³n (`95_circleOfHealing`); BendiciÃ³n: Paso sombrÃ­o (`96_shadowStep`); Clarividencia (`97_clairvoyance`); BendiciÃ³n: Exponencial (`98_exponential`); BendiciÃ³n: TeorÃ­a oscura (`101_darkTheory`); PasiÃ³n (`106_overzealous`); BendiciÃ³n: IluminaciÃ³n (`131_boonIllumination`); BendiciÃ³n: DecisiÃ³n (`173_steadfast`).

**Auras (13):** Alerta (`03_alert`); VÃ­nculo (`07_bond`); Corazonada (`18_detectivesHunch`); EmpatÃ­a (`21_empathy`); Familia (`25_kindred`); A mano descubierta (`33_open-Handed`); Oportunidades (`61_windowsOfOpportunity`); Clarividencia (`97_clairvoyance`); ConexiÃ³n empÃ¡tica (`102_empathicConnection`); Neblinoso (`114_fogwise`); VisiÃ³n estÃ¡tica (`139_stillSight`); Ojos de Belmont (`144_eyesOfBelmont`); PercepciÃ³n Extrasensorial (`164_extrasensoryPerception`).

**Strong · buenas (16):** Adrenalina (`01_adrenaline`); Golpe decisivo (`15_decisiveStrike`); LiberaciÃ³n (`17_deliverance`); DistorsiÃ³n (`19_distortion`); Esperanza (`23_hope`); Agilidad (`29_lithe`); Esprint (`48_sprintBurst`); Inquebrantable (`54_unbreakable`); Oportunidades (`61_windowsOfOpportunity`); Extraoficial (`74_offTheRecord`); Por los demÃ¡s (`76_forThePeople`); De tripas corazÃ³n (`89_biteTheBullet`); ReafirmaciÃ³n (`111_reassurance`); Jugador secundario (`116_backgroundPlayer`); Hecho para esto (`122_madeForThis`); Carga sobre los hombros (`148_shoulderTheBurden`).

**Weak · malas (15):** Autodidacta (`04_autodidact`); EspÃ­ritu calmado (`11_calmSpirit`); DistracciÃ³n (`20_diversion`); Abandonado a tu suerte (`27_leftBehind`); Me la pela (`30_noMither`); A mano descubierta (`33_open-Handed`); Farmacia (`34_pharmacy`); PremoniciÃ³n (`37_premonition`); Carne resbaladiza (`43_slipperyMeat`); Solo quedo yo (`45_soleSurvivor`); Pericia tÃ©cnica (`51_technician`); Esto no puede estar pasando (`53_thisIsNotHappening`); Subir las apuestas (`55_upTheAnte`); VisiÃ³n de futuro (`82_visionary`); EspÃ­ritu de novato (`94_rookieSpirit`).

### Killer

**Tótems (21):** Maleficio: Devoradora de esperanza (`20_hexDevourHope`); Tierra embrujada (`21_hexHauntedGround`); Nana de la cazadora (`22_hexHuntressLullaby`); Maleficio: Nadie escapa de la muerte (`23_hexNoOneEscapesDeath`); Maleficio: Ruina (`24_hexRuin`); Maleficio: El tercer sello (`25_hexTheThirdSeal`); Maleficio: La emociÃ³n de la caza (`26_hexThrillOfTheHunt`); Maleficio: Represalias (`68_hexRetribution`); Maleficio: Favor de sangre (`72_hexBloodFavour`); Inmortal (`73_hexUndying`); Maleficio: Control de masas (`79_hexCrowdControl`); Maleficio: Juguete (`85_hexPlaything`); Maleficio: Pentimento (`88_pentimento`); Maleficio: EnfrÃ©ntate a la oscuridad (`101_faceTheDarkness`); Maleficio: Dos pueden jugar (`114_hexTwoCanPlay`); Maleficio: Destino desdichado (`122_hexWretchedFate`); Maleficio: Solo hay miseria (`129_nothingButMisery`); Maleficio: Obertura del mal (`133_hexOvertureOfDoom`); Maleficio: Mente colmena (`136_hiveMind`); Maleficio: Susto de muerte (`140_scaredToDeath`); Maleficio: A tu merced (`143_underYourThumb`).

**Auras (14):** VocaciÃ³n de enfermera (`00_aNursesCalling`); Murmullo amargo (`05_bitterMurmur`); Acechador de ciervos (`12_deerstalker`); Soy todo oÃ­dos (`57_imAllEars`); OÃ­do para la maquinaria (`66_gearhead`); Acecho letal (`83_lethalPursuer`); Gancho Flagelante: Oleada de ira (`91_floodOfRage`); Oscuridad expuesta (`94_darknessRevelated`); Sin escondite (`100_nowhereToHide`); Instinto AlienÃ­gena (`109_alienInstinct`); Amigos para siempre (`113_friendsTilTheEnd`); Codicia Humana (`123_humanGreed`); Mirada errante (`135_wanderingEye`); Testigo Celestial (`144_celestialWitness`).

**Obsesión (11):** DevociÃ³n oscura (`11_darkDevotion`); Luz que agoniza (`15_dyingLight`); Juega con la comida (`39_playWithYourFood`); Rencor (`42_rancor`); RecuÃ©rdame (`43_rememberMe`); Lo mejor para el final (`44_saveTheBestForLast`); PersecuciÃ³n furtiva (`59_furtiveChase`); NÃ©mesis (`64_nemesis`); Veda abierta (`103_gameAfoot`); Amigos para siempre (`113_friendsTilTheEnd`); Testigo Celestial (`144_celestialWitness`).

**Strong · buenas (15):** VocaciÃ³n de enfermera (`00_aNursesCalling`); Barbacoa y chile (`03_barbecueAndChilli`); IntervenciÃ³n corrupta (`09_corruptIntervention`); Discordancia (`13_discordance`); Maleficio: Devoradora de esperanza (`20_hexDevourHope`); Maleficio: Ruina (`24_hexRuin`); Pim Pam Pum (`40_popGoesTheWeasel`); Interruptor del hombre muerto (`67_deadMansSwitch`); Sin escapatoria (`80_noWayOut`); Acecho letal (`83_lethalPursuer`); Candado (`84_deadlock`); Acogida nefasta (`87_grimEmbrace`); Gancho Flagelante: Dolor retumbante (`89_painResonance`); Sin escondite (`100_nowhereToHide`); Amigos para siempre (`113_friendsTilTheEnd`).

**Weak · malas (15):** Bestia de presa (`04_beastOfPrey`); Coulrofobia (`10_coulrophobia`); Acechador de ciervos (`12_deerstalker`); Desasosiego (`14_distressing`); Enfurecimiento (`17_fireUp`); Insidioso (`28_insidious`); ApretÃ³n de hierro (`29_ironGrasp`); Furia ciega (`33_madGrit`); Gancho Flagelante: Santuario monstruoso (`36_monstrousShrine`); Presencia abrumadora (`38_overwhelmingPresence`); DepredaciÃ³n (`41_predator`); Hijo de las sombras (`45_shadowborn`); Aliento (`49_stridor`); Instinto territorial (`51_territorialImperative`); Implacable (`55_unrelenting`).

## Verificación técnica

`tests/cartas.cjs` comprueba los 19 archivos, 400 rondas caóticas, cambios de voto, empate, revelado manual, no duplicados, slots fijos, fallback temático, exclusiones, fallo de escritura sin consumir, doble giro, aislamiento por espacio y render de OBS a 1920×1080, 1280×720, 640×360 y 390×844. Requiere Node.js, Playwright y Edge (o `CARTAS_BROWSER=chrome`). Ejecutar `node tests/cartas.cjs`; `NODE_PATH` puede apuntar a una instalación de Playwright y `CARTAS_ARTIFACTS` permite guardar capturas.

La demostración visual no verifica una sesión personal ni la conexión real del chat. Para validar extremo a extremo, usar la URL personal del panel, iniciar una ronda manual y observar el revelado en OBS con el panel abierto.
