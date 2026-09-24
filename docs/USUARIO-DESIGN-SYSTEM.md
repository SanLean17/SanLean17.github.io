# SanLean — Sistema visual de USUARIO

Este archivo documenta reglas obligatorias para todo el sistema privado bajo `sanlean.com.ar/usuario/`.

## Alcance

USUARIO incluye MI PANEL, MI CUENTA, ruletas, Torneo 1VS1, overlays OBS, votaciones, sorteos, Twitch/Kick, colaboradores, permisos, seguridad y futuras herramientas.

Estas funciones forman un único producto. No deben presentarse como aplicaciones visualmente separadas ni como sistemas independientes.

## Regla principal

Toda función nueva de USUARIO debe reutilizar la estructura, jerarquía y lenguaje visual existente de MI PANEL / MI CUENTA antes de crear componentes nuevos.

## Identidad visual

- Acento principal: `#FF003C`.
- Fondo principal de USUARIO: el mismo fondo definido para `.user-page` en `css/usuario.css`.
- No introducir fondos generales alternativos para módulos internos.
- Cajas y tarjetas: fondos oscuros ya utilizados en MI PANEL, con bordes finos y contraste existente.
- Botones principales: rojo SanLean, forma y altura coherentes con los botones existentes.
- Botones secundarios: oscuros/transparentes con borde rojo cuando corresponda.
- Mantener tipografías, pesos, mayúsculas, tamaños y jerarquías del sistema actual.

## Layout y estructura

- Mantener el ancho, espaciados y alineación base de `.user-shell`.
- MI PANEL funciona como centro principal de herramientas.
- Las funciones de stream no deben abrir un sistema visual diferente: deben aparecer como secciones del mismo MI PANEL.
- MI CUENTA conserva perfil, seguridad, colaboradores/permisos y conexiones de cuenta.
- Responsive debe seguir la misma lógica de MI PANEL / MI CUENTA.

## Componentes

Antes de crear un componente nuevo, reutilizar o extender:

- `.panel-heading`
- `.panel-tabs`
- `.panel-tools`
- `.weight-card`
- cajas utilizadas por Torneo 1VS1
- botones `.profile-btn`, `.session-btn`, `.ghost-btn`
- campos definidos en `usuario.css`

Los nuevos componentes deben compartir radios, alturas, bordes, tipografía y espaciados con esos elementos.

## Votaciones y ruletas

Una votación no dispara automáticamente una ruleta al finalizar.

Flujo obligatorio:

1. Finaliza la votación.
2. Se muestra la carta ganadora o el empate.
3. El sistema queda en estado de espera.
4. Si la carta ganadora tiene una ruleta configurada, el streamer decide cuándo continuar mediante un botón.
5. El streamer puede reiniciar/cancelar antes de continuar.
6. Sólo al pulsar continuar/girar se ejecuta la ruleta correspondiente.

Esto evita que una automatización avance mientras el streamer está hablando, resolviendo un problema técnico o necesita repetir la votación.

## WEB pública vs USUARIO

La WEB pública (`sanlean.com.ar`) y USUARIO (`sanlean.com.ar/usuario/`) son sistemas relacionados pero distintos.

Una solicitud referida únicamente a USUARIO no debe modificar la WEB pública salvo pedido expreso.
