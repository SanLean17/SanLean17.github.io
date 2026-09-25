# SanLean — Organización del proyecto

Este archivo es la referencia para organizar el trabajo de SanLean entre conversaciones sin perder decisiones anteriores.

Los frentes separan conversaciones y tareas, pero todos trabajan sobre el mismo proyecto, el mismo repositorio y las mismas reglas generales. No representan productos independientes.

## Separación obligatoria entre WEB y USUARIO

- **WEB**: sitio público de `sanlean.com.ar`.
- **USUARIO**: plataforma privada bajo `sanlean.com.ar/usuario/`, incluyendo MI PANEL, MI CUENTA, ruletas privadas, Stream Tools, colaboradores, plataformas, seguridad y futuras herramientas.
- WEB y USUARIO deben funcionar como sistemas separados. No deben compartir estado de `localStorage`, simulaciones, pesos, participantes, donaciones, configuraciones de ruletas ni lógica interna del panel.
- Una modificación exclusiva de USUARIO no debe alterar la WEB pública y una modificación de la WEB pública no debe depender del estado interno de USUARIO.
- La única comunicación funcional permitida entre ambos sistemas es el **Torneo 1VS1**: desde USUARIO se puede generar un enlace público específico del propietario/torneo para compartir una vista de solo visualización del estado del torneo.
- Esa vista pública del Torneo 1VS1 debe exponer únicamente los datos necesarios para mostrar el torneo. No debe reutilizar sesiones privadas, permisos internos, configuración de cuenta ni estado general de MI PANEL.
- Cualquier integración futura entre WEB y USUARIO distinta de esta excepción requiere una decisión explícita antes de implementarse.

## Conversaciones recomendadas dentro del Proyecto SANLEAN — WEB Y PLATAFORMA

### 01 — DESARROLLO PRINCIPAL
Usar para arquitectura general, decisiones transversales, integración entre módulos, Supabase, estructura multi-streamer y coordinación.

Incluye:
- arquitectura de USUARIO
- modelo multi-streamer / workspaces
- integración entre módulos
- decisiones que afectan varias áreas
- priorización y coordinación general

### 02 — UX/UI USUARIO
Usar para todo el sistema visual privado.

Incluye:
- MI PANEL
- MI CUENTA
- sistema de diseño
- tipografías
- colores
- tamaños
- espaciados
- botones
- campos
- cajas
- formularios
- responsive
- estados visuales

Fuente de verdad obligatoria: `docs/USUARIO-DESIGN-SYSTEM.md` y `css/usuario-design-system.css`.

Cualquier módulo nuevo de USUARIO debe validarse contra esas reglas antes de considerarse terminado.

### 03 — RULETAS
Usar para lógica y presentación de:
- Killers
- Perks Killer
- Perks Superviviente
- pesos
- participantes que agregan opciones
- resultados
- overlays OBS asociados a las ruletas

La lógica privada de pesos, participantes, recompensas o automatizaciones pertenece a USUARIO. Las ruletas de la WEB pública deben operar con su propia configuración local y no consumir estado de MI PANEL.

### 04 — STREAM / PLATAFORMAS
Usar para integraciones externas y automatizaciones.

Incluye:
- Twitch
- Kick
- OAuth
- lectura de eventos/chat
- overlays OBS
- votaciones
- sorteos
- reglas configurables por streamer

Las pantallas siguen perteneciendo visualmente a MI PANEL. Este frente separa el desarrollo técnico, no la experiencia del usuario.

### 05 — TORNEO 1VS1
Usar para:
- creación
- edición
- cronómetro
- resultados
- histórico
- permisos específicos del torneo
- generación del enlace público compartible de solo visualización

La edición y administración pertenecen a USUARIO. La WEB sólo puede recibir la vista pública específica del torneo mediante el enlace generado para ese propietario/torneo.

### 06 — CUENTAS, COLABORADORES Y SEGURIDAD
Usar para:
- login
- recuperación de contraseña
- MI CUENTA
- perfiles
- colaboradores
- permisos
- sesiones
- seguridad Supabase / RLS

### 07 — WEB PÚBLICA
Usar exclusivamente para `sanlean.com.ar` público.

No modificar desde solicitudes de USUARIO salvo indicación expresa. No consumir estado privado de USUARIO, excepto los datos públicos mínimos de la vista compartible del Torneo 1VS1.

## Fuentes de verdad del proyecto

Las decisiones importantes no deben depender únicamente de una conversación de ChatGPT.

Se deben conservar en el repositorio:

- Sistema visual USUARIO: `docs/USUARIO-DESIGN-SYSTEM.md`
- Tokens/componentes visuales: `css/usuario-design-system.css`
- Organización del proyecto: `docs/PROJECT-ORGANIZATION.md`
- Decisiones técnicas permanentes: documentarlas en `/docs/` cuando afecten más de un módulo.

Cuando una conversación defina una nueva regla general, debe actualizarse su fuente de verdad correspondiente antes de construir nuevas funciones sobre ella.

## Regla de coordinación

1. DESARROLLO PRINCIPAL decide cambios transversales.
2. UX/UI USUARIO define las reglas visuales generales.
3. Los frentes especializados implementan su lógica sin crear sistemas visuales propios.
4. Una modificación sólo de USUARIO no toca WEB pública.
5. Antes de crear un componente nuevo, se comprueba si ya existe uno equivalente en el sistema.
6. Antes de dar por terminado un módulo nuevo, se verifica el checklist de `USUARIO-DESIGN-SYSTEM.md`.
7. WEB y USUARIO no comparten estado interno. La única excepción permanente es la vista pública compartible del Torneo 1VS1, limitada a datos de visualización.
