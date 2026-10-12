# USUARIO: desarrollo local sin Supabase

## Abrir en esta PC

1. En la carpeta `repo`, hacé doble clic en **INICIAR-USUARIO-LOCAL.cmd**.
2. Dejá abierta la ventana del servidor.
3. Abrí **http://127.0.0.1:4173/Usuario/** en Chrome o Edge.
4. Entrás directamente a MI PANEL como `demo_local`. No hace falta correo ni contraseña.
5. Para detenerlo, cerrá la ventana del servidor o presioná Ctrl+C.

El iniciador usa Node.js instalado o el incluido con Codex en esta PC. En otra PC, instalá Node.js si falta. Alternativa desde la raíz del repositorio: `node scripts/serve-usuario-local.cjs`. El servidor escucha únicamente en 127.0.0.1, puerto 4173. Si el puerto está ocupado, cerrá el servidor anterior. No abrir los HTML con file://.

## Qué se conserva

Se usan los mismos módulos, catálogos, imágenes y estilos de USUARIO: navegación, killers/perks, ruletas, Torneo 1VS1, CARTAS, votaciones, desafíos, sorteos, BITS/ALERTAS, MI CUENTA y colaboradores. Los diez overlays locales (incluida VOTACIÓN) se crean por el flujo existente. No se copiaron pantallas ni se reemplazó el sistema visual.

El aviso MODO DESARROLLO LOCAL queda en MI PANEL y MI CUENTA. Las salidas de overlays y alertas no llevan avisos superpuestos. Desplegá «Herramientas y límites de la demo» para acceder a los controles. Incluye botones para ver el propietario o un colaborador demo con permisos limitados. Son vistas ficticias, no pruebas de seguridad del servidor.

- **Ruletas:** editá pesos y entradas; girá desde el panel. Los cambios persisten al recargar.
- **Torneo:** hay un torneo finalizado demo con tres participantes. Podés crear los tuyos con el flujo habitual.
- **CARTAS:** generá una ronda CHAT, iniciá la votación y usá SIMULAR VOTO A. Cada clic representa otro participante ficticio. La recepción usa el mismo lector local del chat; puede tardar un segundo. Finalizá/revelá con los controles habituales. MANUAL también funciona.
- **Sorteos:** iniciá un sorteo y pulsá AGREGAR PARTICIPANTES DEMO. Se agregan cinco nombres ficticios a esa sesión. Podés cerrar, sortear y excluir/restaurar participantes.
- **BITS:** hay una regla demo. Podés crear/editar/eliminar reglas, pausar y usar las pruebas de alerta. SIMULAR APORTE DE BITS aplica la primera regla demo y agrega entradas activas. No se reciben donaciones reales.
- **Overlays:** abrí VISTA PREVIA en el mismo navegador y origen. El panel y las pestañas de overlay comparten los datos locales. El servidor local comparte las visualizaciones con OBS de esta misma PC. Mantené abiertos el servidor y MI PANEL; copiá las URLs OBS de visualización. Los controles se usan desde MI PANEL. No necesitás iniciar una transmisión.
- **Colaboradores:** los cambios de permisos, altas y bajas afectan sólo registros ficticios.

## Límites explícitos

Auth, recuperación/cambio de contraseña, OAuth Twitch/Kick, EventSub, sincronización multiusuario, Edge Functions reales y subida de sonidos a Storage no están disponibles. Las operaciones no implementadas devuelven `LOCAL_UNAVAILABLE`; nunca se reenvían al backend. Este entorno permite revisar UI y flujos locales; no valida RLS, concurrencia de usuarios reales ni integraciones externas.

No es una copia de los datos de tu cuenta. Los datos nuevos viven en localStorage del navegador y origen elegido. `localhost`, `127.0.0.1` y otros puertos tienen almacenamientos distintos. Usá siempre la URL indicada. Borrar los datos del sitio borra tu trabajo local; no afecta producción. Para empezar de cero, borrá sólo los datos de `127.0.0.1:4173` desde el navegador. No hay exportación ni sincronización automática.

## Aislamiento y producción

`js/usuario-local-dev.js` se carga antes de los módulos y sólo actúa si `location.hostname` es exactamente `localhost` o `127.0.0.1` y la ruta pertenece a `/Usuario/`. No usa querystrings ni localStorage para activar el modo. En producción retorna antes de cambiar configuración, clientes, red o almacenamiento; se sigue cargando el SDK de Supabase y el Auth habitual.

En local no se carga el SDK de Supabase; `createClient()` devuelve un adaptador compatible con las operaciones utilizadas por estos módulos. El endpoint es del origen local y las peticiones de los módulos se resuelven en memoria/localStorage. Una política CSP limita fetch, XHR, WebSocket y EventSource al mismo origen. Fuentes o imágenes externas pueden necesitar Internet; no son llamadas a Supabase. La WEB pública no se modifica.

La adaptación no implementa todo el SDK ni todas las funciones SQL. Al agregar una nueva operación de backend, añadí su simulación y pruebas o mantenela explícitamente no disponible. El servidor de desarrollo no debe publicarse en Internet.

## Verificación

`node tests/usuario-local.cjs` prueba navegación a 1440/390/320, persistencia, roles, CARTAS, sorteos, overlays y bloqueo por host. Requiere Playwright y Chrome; permite configurar `PLAYWRIGHT_MODULE` y `BROWSER_PATH`. Las páginas se sirven al navegador mediante interceptación de recursos locales para funcionar también en entornos que bloquean puertos de loopback. Los tests de producción usan hosts simulados y no ingresan a ninguna cuenta real.

## Archivos de esta implementación

- `js/usuario-local-dev.js`: activación por host, bloqueo de red, adaptador de datos, identidad demo y herramientas de simulación.
- `Usuario/index.html`, `cuenta.html`, `overlay.html`, `alertas.html`, `restablecer-contrasena.html`, `stream-tools.html`, `challenge-simulation.html`: carga temprana del modo local; SDK real sólo fuera de loopback en las páginas que lo usaban.
- `js/usuario-connections.js`, `js/usuario-bits.js`: textos explícitos para conexiones simuladas.
- `js/torneo-fixes-v3.js`: referencia a `window.history` para que el historial del torneo no interfiera con la navegación.
- `scripts/serve-usuario-local.cjs`, `INICIAR-USUARIO-LOCAL.cmd`: servidor y arranque por doble clic.
- `tests/usuario-local.cjs`: verificaciones automatizadas; este documento contiene los pasos y límites.

Validado: navegación en 1440/390/320 sin desbordamiento horizontal, entrada automática, perfil/cuenta, persistencia de pesos, giro de ruleta, torneo demo, voto/revelado de CARTAS, participantes de sorteos, colaboradores/permisos, eventos Bits/pausa de temporizadores, tokens de visualización/control y hosts de producción falsos con flags de bypass. Cero solicitudes a Supabase y cero errores JavaScript en el recorrido local probado. También pasaron `private-settings.cjs`, `supabase-usage.cjs` y la comprobación HTTP del servidor. No se probó Auth real contra el servicio restringido ni una sesión externa de OBS.

## Monitor visual sin transmitir

Recargá MI PANEL y desplegá **ABRIR MONITOR LOCAL · VER SIN ESTAR EN VIVO**, justo debajo del aviso de desarrollo. Elegí ALERTAS BITS, ENTRADAS ACTIVAS o cualquiera de los overlays. Las pruebas de alerta están debajo de la pantalla del monitor. El área representa 1920 × 1080 y se escala para entrar en desktop y móvil.

Para ruletas, CARTAS, sorteos y desafíos, usá los controles de sus secciones habituales y mirá el resultado en el monitor o en ABRIR VENTANA. Una salida vacía significa que todavía no se envió contenido visible: generá la ronda, girá o activá MOSTRAR. No hay necesidad de estar en vivo ni de conectar Twitch/Kick.

**OBS también puede mostrarlo:** copiá la URL de visualización a una Fuente de navegador, tamaño 1920 × 1080. Usá la misma dirección del servidor que aparece en el panel (127.0.0.1, puerto 4173). El monitor y OBS son espectadores; el manejo se hace en MI PANEL. Las fuentes de OBS se muestran limpias, sin avisos de desarrollo. La comprobación automatizada usa dos navegadores aislados; no sustituye una prueba manual de tu instalación de OBS ni de su audio.

El puente de visualización vive en memoria del servidor, sólo escucha loopback y se vuelve a llenar al abrir el panel. No guarda datos en nube ni archivos: recibe únicamente estados/configuración visual de overlays y eventos/entradas Bits. Excluye perfiles, autenticación, colaboradores y tokens de control. Rechaza publicaciones de otros orígenes. Si reiniciás el servidor, el panel vuelve a publicar dentro de cinco segundos. Si un servidor estático alternativo no soporta el puente, la vista previa del mismo navegador sigue disponible, pero OBS independiente necesita el iniciador incluido.

Archivos adicionales: `js/usuario-local-preview.js` y `css/usuario-local-preview.css` (monitor que reutiliza controles canónicos); `scripts/usuario-preview-bridge.cjs` (puente de sólo visualización); `tests/usuario-local-preview.cjs` (monitor, navegadores aislados, Bits, aislamiento de origen y responsive). Ejecutar la prueba con acceso a puertos loopback.

### VOTACIÓN local

En VOTACIÓN elegí Killers o PERSONALIZADA, cargá dos a cinco opciones e iniciá. En Herramientas de la demo podés enviar votos A, B, C, D y E. Cada clic representa una persona diferente; se usa el lector local de chat habitual. El overlay muestra cantidades, porcentajes, ganador/empate y respeta OCULTAR EN OBS. La URL aparece en OVERLAYS OBS y en el selector del monitor. Se agrega automáticamente al abrir MI PANEL, sin borrar las URLs ni los estados existentes. La creación de este overlay adicional está limitada al modo local; no cambia el esquema de producción.
