# Ruletas privadas · USUARIO y OBS

## Tres secciones listas para prueba

En MI PANEL: **KILLERS**, **PERKS DE KILLERS** y **PERKS DE SUPERVIVIENTES**. Cada sección tiene vista previa, GIRAR, OCULTAR EN OBS y COPIAR URL OBS. La configuración existente de pesos y nombres permanece debajo.

Cada espacio tiene tres Browser Sources distintos. Pegar la URL de visualización de cada sección en una Fuente de navegador de OBS, **1920 × 1080**. El fondo es transparente. Mantener el panel abierto mientras gira. El enlace privado de control permite ocultar y abrir el panel; el sorteo se controla desde la sesión del panel para aplicar la misma lógica a todas las ruletas.

## Comportamiento

- Killers: una selección ponderada de las opciones habilitadas. Puede girar incluso con un único killer habilitado. La animación muestra únicamente el pool habilitado y termina en el retrato ganador.
- Perks: cuatro slots. Se seleccionan cuatro claves distintas, respetando `data/perk-conflicts.json` en la ruleta normal. El slot vacío puede salir si está habilitado, como en la configuración existente; no se duplica.
- Un peso cero excluye la opción. Los pesos positivos definen su probabilidad relativa. Sin suficientes opciones compatibles se informa el problema y no se publica una build incompleta.
- Agregar un nombre aumenta el peso una vez. Si gana una entrada atribuida a ese nombre, se muestra debajo del resultado y se ilumina. La primera entrada es anónima; las siguientes usan los nombres agregados hasta el peso disponible. Un cambio manual del peso manda sobre cuántas entradas participan.
- Las animaciones duran aproximadamente 4,2 segundos. OBS recibe el mismo resultado confirmado que el panel; no vuelve a sortear. La demora de consulta de OBS puede desfasar ligeramente el momento visual.
- Las preferencias de reducir movimiento desactivan el desplazamiento. Hay diseños adaptados a ventanas angostas.

## CARTAS → ruleta

Revelar no gira automáticamente. CONTINUAR A LA RULETA guarda la regla con espacio, rol y ronda, y abre esa sección. El aviso **CARTAS PENDIENTES** identifica la regla. GIRAR la aplica y la consume al confirmar el resultado en Supabase.

Siempre hay cuatro posiciones visuales en perks. Cantidades menores dejan el resto inactivas; una carta de dos perks nunca obtiene un vacío en esos dos slots. En combinaciones con perks fijas, las fijas se muestran desde el inicio y sólo giran los slots aleatorios. Cero perks se informa sin animación. Las reglas y excepciones completas están en [CARTAS](../cartas/README.md).

La regla sólo se aplica al rol y espacio que la creó. Girar Killers no consume una carta de perks. Reabrir desde la misma ronda de CARTAS no restaura una regla ya aplicada. Una escritura fallida conserva la regla para reintentar.

## Guardado y permisos

- Las configuraciones se guardan en la tabla existente `user_roulette_settings`, con las políticas de propietario existentes.
- El navegador usa `sanlean-private-roulette:<user_id>`. No lee ni escribe la vieja clave de simulación de la WEB pública.
- Los cambios se guardan en orden, se identifica cualquier fallo y se espera el guardado antes de sortear. Un cambio de cuenta no puede enviar el borrador anterior a la nueva cuenta.
- La configuración pertenece al propietario. Los colaboradores con el permiso existente de OVERLAYS pueden girar con el pool que el propietario sincronizó; no pueden editar sus pesos desde este panel. No se ampliaron permisos ni políticas de base de datos.
- Los giros paralelos del mismo overlay se bloquean en el panel y entre pestañas con Web Locks. Para la prueba usar un panel controlador por espacio; no hay arbitraje distribuido entre varios dispositivos.
- No se cargan los scripts ni los controles de las ruletas públicas. No se modificaron esas páginas.

## Enlaces de demostración

Permiten revisar la apariencia sin sesión ni datos personales. Son muestras fijas; `spin=1` reproduce una animación al cargar:

- https://sanlean.com.ar/Usuario/overlay.html?demo=killers&spin=1
- https://sanlean.com.ar/Usuario/overlay.html?demo=killer-perks&spin=1
- https://sanlean.com.ar/Usuario/overlay.html?demo=survivor-perks&spin=1

## Comprobaciones

`node tests/private-settings.cjs` verifica aislamiento de cuentas, errores de guardado y cambios sucesivos. `node tests/cartas.cjs` usa Playwright/Edge para verificar CARTAS, los controles privados de las tres ruletas, exclusión de killers deshabilitados, cuatro slots, consumo único, ocultación y vistas OBS. El backend de esa prueba es simulado; no modifica streams reales.

Queda para la prueba personal validar sesión, permisos y las Browser Sources en OBS. Las automatizaciones de Twitch/Kick se implementan por separado; el control manual no necesita conectar el chat.
