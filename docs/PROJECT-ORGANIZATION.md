# SanLean — Organización del proyecto

El proyecto se trabaja por frentes separados para evitar mezclar decisiones, pero todos comparten el mismo repositorio y las mismas reglas generales.

## 01 — DESARROLLO PRINCIPAL

Objetivo: arquitectura general, decisiones transversales, integración entre módulos, Supabase, permisos, estructura multi-streamer y coordinación de releases.

Incluye:
- arquitectura de USUARIO
- modelo multi-streamer / workspaces
- permisos y colaboradores
- integración entre módulos
- decisiones que afectan varias áreas

No debe usarse para pulido visual detallado de una única pantalla cuando ese trabajo pueda resolverse en su frente específico.

## 02 — UX/UI USUARIO

Objetivo: sistema visual completo de `sanlean.com.ar/usuario/`.

Incluye:
- MI PANEL
- MI CUENTA
- componentes compartidos
- tipografía
- colores
- espaciados
- botones
- campos
- responsive
- estados visuales

Regla: cualquier función nueva de USUARIO debe respetar `docs/USUARIO-DESIGN-SYSTEM.md`.

## 03 — RULETAS

Objetivo: lógica y presentación de:
- Killers
- Perks Killer
- Perks Superviviente
- pesos
- participantes que agregan opciones
- resultados
- overlays OBS asociados a las ruletas

## 04 — STREAM / PLATAFORMAS

Objetivo: integraciones externas y automatizaciones.

Incluye:
- Twitch
- Kick
- OAuth
- lectura de eventos/chat
- overlays OBS
- votaciones
- sorteos
- reglas configurables por streamer

Las pantallas siguen perteneciendo a MI PANEL; este frente separa el desarrollo técnico, no la experiencia visual.

## 05 — TORNEO 1VS1

Objetivo: creación, edición, cronómetro, resultados, histórico y permisos del torneo.

## 06 — CUENTAS Y SEGURIDAD

Objetivo:
- login
- recuperación de contraseña
- MI CUENTA
- perfiles
- colaboradores
- permisos
- sesiones
- seguridad Supabase / RLS

## 07 — WEB PÚBLICA

Objetivo exclusivo: `sanlean.com.ar` público.

No modificar desde solicitudes de USUARIO salvo indicación expresa.

## Regla de coordinación

Los frentes separan conversaciones y tareas, no crean productos distintos.

Todo cambio transversal definido en DESARROLLO PRINCIPAL debe reflejarse en los frentes afectados. Las decisiones visuales generales se documentan en UX/UI USUARIO y se aplican a todo USUARIO.
