# Asociaciones históricas DBD — revisión v3

Fecha: 2026-10-29T17:30:57.422Z

La fuente única del Gestor es maintenance/dbd-manager/catalog-associations.json. associations.cjs añade esas relaciones a la base en memoria y las preserva en las cuatro salidas JSON preparadas. No se modifica el catálogo base al abrir el Gestor. Los ownerKey explícitos de contenido nuevo tienen prioridad.

| Rol | Personajes auditados | Perks asociadas |
| --- | ---: | ---: |
| Killer | 44 | 132 |
| Superviviente | 54 | 162 |

Los 98 personajes tienen sus tres perks según las fuentes internas existentes. Se comprueba cada key y se prueba la búsqueda heredada por propietario. La extracción es reproducible con extract-associations.cjs; no infiere propietarios del orden del roster.

Fuentes: js/usuario-roulette-tools.js (OWNER_BY_KEY y OWNER_RANGES) y js/usuario.js (survivorOwners y survivorOwnerGroups). Los rangos corregidos 97–114 prevalecen sobre grupos históricos desplazados; 96_boonDestroyer permanece sin propietario. Los alias ghost, pyramid, skull y first se traducen únicamente a claves existentes ghostface, pyramidhead, skullmerchant y lich.

Decisión a conservar para revisión editorial: el proyecto identifica vecna con perks 118–120 y lich con perks 136–138. Se mantienen estos nombres y keys actuales; no se intercambian personajes por una suposición externa. Los términos Liche y Vecna siguen encontrando el contenido asociado por los alias presentes.

Entradas sin asociación explícita: 13 perks Killer, 14 Survivor y los slots vacíos registrados. No se inventaron propietarios. La lista permite revisar cualquier asociación dudosa antes de publicarla.

| Catálogo | Key | Nombre | Tratamiento |
| --- | --- | --- | --- |
| perks-killer | slot_vacio | Slot Vacio | Slot vacío; excluido de totales. |
| perks-killer | 05_bitterMurmur | Murmullo amargo | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-killer | 12_deerstalker | Acechador de ciervos | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-killer | 14_distressing | Desasosiego | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-killer | 23_hexNoOneEscapesDeath | Maleficio: Nadie escapa de la muerte | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-killer | 26_hexThrillOfTheHunt | Maleficio: La emoción de la caza | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-killer | 28_insidious | Insidioso | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-killer | 29_ironGrasp | Apretón de hierro | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-killer | 36_monstrousShrine | Gancho Flagelante: Santuario monstruoso | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-killer | 46_sloppyButcher | Carnicero chapucero | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-killer | 47_spiesFromTheShadows | Espía de las sombras | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-killer | 55_unrelenting | Implacable | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-killer | 56_whispers | Murmullos | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-killer | 96_boonDestroyer | Esperanza destruida | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | slot_vacio | Slot Vacio | Slot vacío; excluido de totales. |
| perks-survivor | 13_darkSense | Percepción oscura | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 16_dejaVu | Déjà Vu | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 23_hope | Esperanza | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 25_kindred | Familia | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 28_lightweight | De pies ligeros | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 31_noOneLeftBehind | Nadie se queda atrás | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 35_plunderersInstinct | Instinto de saqueador | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 37_premonition | Premonición | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 40_resilience | Resiliencia | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 43_slipperyMeat | Carne resbaladiza | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 44_smallGame | Caza menor | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 47_spineChill | Escalofríos | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 53_thisIsNotHappening | Esto no puede estar pasando | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
| perks-survivor | 59_wellMakeIt | Lo conseguiremos | Sin asociación explícita en las fuentes; conservar sin ownerKey. |
