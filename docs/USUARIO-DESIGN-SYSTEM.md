# SanLean — Sistema visual de USUARIO

Este documento es la especificación obligatoria de diseño para todo `sanlean.com.ar/usuario/`.

La implementación canónica está en `css/usuario-design-system.css`. Si una pantalla nueva necesita apartarse de estas reglas, el cambio debe decidirse primero como una modificación del sistema, no resolverse localmente con valores arbitrarios.

## 1. Alcance

USUARIO es un único producto e incluye MI PANEL, MI CUENTA, ruletas, Torneo 1VS1, overlays OBS, votaciones, sorteos, Twitch/Kick, colaboradores, permisos, seguridad y futuras herramientas.

Separar archivos o módulos técnicos no significa crear interfaces visuales distintas.

## 2. Tokens obligatorios

### Color
- Acento principal: `#FF003C`.
- Fondo página: `#080809` + el fondo visual ya definido por `.user-page`.
- Superficie principal: `#09090B` / `rgba(8,8,10,.84)` según el componente existente.
- Superficie interior: `#111114`.
- Texto principal: `#FFFFFF`.
- Texto secundario: `rgba(255,255,255,.72)`.
- Texto atenuado: `rgba(255,255,255,.55)`.
- Borde normal: `rgba(255,255,255,.12)`.
- Borde de campo: `rgba(255,255,255,.24)`.

No agregar nuevos colores de fondo/acento por módulo salvo que se cambie este documento y el archivo de tokens.

### Tipografía
- Texto/UI: `Montserrat, Arial, sans-serif`.
- Títulos display: `Impact, Arial Black, Arial Narrow, sans-serif`.
- Título principal MI PANEL: 65 px desktop, line-height `.88`.
- Título de sección: 40 px desktop, line-height `.95`.
- Título de tarjeta: 18 px.
- Párrafo normal: 14 px, line-height `1.6`.
- Labels/metadatos: 11–12 px, peso 800 según jerarquía.

### Párrafos
- Un párrafo informativo normal no debe ocupar todo el ancho disponible.
- Ancho máximo recomendado/canónico: `66ch`.
- Cuando hay varios párrafos equivalentes deben usar el mismo ancho y ritmo visual.
- No hacer líneas extremadamente largas sólo porque exista espacio horizontal.

## 3. Layout

- Ancho principal de MI PANEL: máximo 1080 px.
- Mantener el mismo `user-shell` y sus márgenes.
- El contenido de cada pestaña ocupa la misma zona funcional.
- Al seleccionar una sección, todas las demás se ocultan completamente.
- Nunca deben quedar visibles simultáneamente contenido de inicio, otra herramienta y la herramienta activa.

## 4. Botones

Todos los botones del sistema deben partir de los componentes canónicos.

### Principal
- Fondo `#FF003C`.
- Texto blanco.
- Montserrat 800.
- Altura normal: 44–48 px según contexto.
- Bordes totalmente redondeados (`999px`).

### Secundario
- Fondo transparente/oscuro.
- Borde `#FF003C`.
- Texto blanco.
- Misma altura, tipografía y radio que el principal.

No crear botones con radios, alturas, tamaños de fuente o colores arbitrarios.

## 5. Campos y formularios

- Altura estándar: 48 px.
- Fondo: `#09090B`.
- Borde: `rgba(255,255,255,.24)`.
- Focus: `#FF003C`.
- Texto: Montserrat 14 px.

### Regla crítica de ancho
Los campos NO deben crecer hasta extremos simplemente para completar una fila o llenar un vacío.

- Ancho máximo canónico de un formulario/campo largo: 460 px.
- Si hay espacio sobrante, se conserva vacío intencionalmente.
- Dos campos pueden formar una grilla sólo cuando la relación entre ambos lo justifique.
- Un único campo no se estira a 100% de una caja de 1000 px.
- La alineación debe responder a la jerarquía del formulario, no al espacio sobrante.

## 6. Cajas y tarjetas

- Fondo oscuro del sistema.
- Borde fino `rgba(255,255,255,.12)`.
- No inventar sombras, gradientes o iluminaciones diferentes para cada herramienta.
- El radio canónico actual de las tarjetas estructurales es 0 px. Los controles/botones sí son redondeados.
- Padding debe seguir la escala existente: 18 / 24 / 30 / 42 px según jerarquía.

## 7. Navegación de MI PANEL

MI PANEL es el centro funcional. Las herramientas no son aplicaciones separadas.

Pestañas actuales:
- Killers
- Perks Superviviente
- Perks Killer
- Torneo 1VS1
- Overlays OBS
- Votaciones
- Sorteos
- Twitch / Kick

Al pulsar una pestaña:
1. Se desactiva visualmente la anterior.
2. Se ocultan todas las demás secciones.
3. Se muestra únicamente el contenido seleccionado.
4. No se repiten cabeceras, tarjetas de presentación ni bloques de otras secciones debajo.

## 8. Votaciones

### Ganador único
1. Termina la votación.
2. Se revela la carta ganadora.
3. El sistema queda esperando.
4. Si corresponde una ruleta, aparece una acción para continuar.
5. La ruleta sólo comienza cuando el streamer pulsa el botón.

### Empate
Un empate NO produce ganador y NO continúa a una ruleta.

La votación debe reiniciarse completa utilizando las mismas cinco cartas y una nueva ronda de 30 segundos. Los votos de la ronda empatada no se arrastran.

## 9. Checklist obligatorio antes de considerar terminado un módulo

- Usa los tokens de `usuario-design-system.css`.
- No introduce un color general nuevo.
- Títulos respetan tipografía/tamaño/jerarquía.
- Párrafos mantienen ancho y line-height del sistema.
- Botones reutilizan componente principal/secundario.
- Campos respetan altura y ancho máximo; no llenan espacios vacíos sin necesidad.
- Cajas respetan fondo, borde y padding del sistema.
- Sólo una sección de MI PANEL está visible.
- Responsive no rompe alineaciones ni jerarquía.
- No modifica WEB pública si el cambio pertenece sólo a USUARIO.

## 10. WEB pública vs USUARIO

La WEB pública (`sanlean.com.ar`) y USUARIO (`sanlean.com.ar/usuario/`) son sistemas relacionados pero distintos.

Una solicitud referida únicamente a USUARIO no debe modificar la WEB pública salvo pedido expreso.
