# SanLean — Organización del proyecto

Este archivo es la referencia para organizar el trabajo de SanLean entre conversaciones sin perder decisiones anteriores.

Los frentes separan conversaciones y tareas, pero todos trabajan sobre el mismo proyecto, el mismo repositorio y las mismas reglas generales. No representan productos independientes.

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

No modificar desde solicitudes de USUARIO salvo indicación expresa.

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
