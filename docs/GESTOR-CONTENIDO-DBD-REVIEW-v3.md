# SANLEAN — GESTOR DE CONTENIDO DBD · REVIEW v3

Revisión local completada el 2026-10-29T17:30:57.422Z. Producción intacta; no se hizo push, merge, PR real ni publicación de Terrifier/Chucky. La aplicación queda instalada en **Documents\Programa SanLean**. No hace falta descargarla otra vez.

## Entrega y carpetas

| Carpeta | Función | Datos |
| --- | --- | --- |
| Gestor de contenido DBD | Programa administrativo; abrir INICIAR GESTOR DE CONTENIDO DBD.bat | Conservar datos/ completo |
| SanLean Streamer Tools | MASTER limpia distribuible, utilizada también como base de las previews | Sin datos/, progreso personal, sesiones ni historial de pruebas |
| SanLean Local | Acceso a la WEB de prueba en 4181 | Comparte la base del Gestor; no duplica programa |
| SanLean Usuario | Acceso a /Usuario/ de la misma preview | Almacenamiento local del navegador; no usa producción |

La MASTER y el Gestor deben permanecer juntos en Programa SanLean. El Gestor obtiene el programa Streamer de la carpeta hermana y mantiene sus pruebas por borrador en datos/vista-streamer. Para distribuir la MASTER, comprimir únicamente SanLean Streamer Tools. Probar desde el Gestor permite conservar la MASTER limpia. Abrir directamente el BAT de la MASTER crea datos/ y usa el flujo de loaders del programa instalado; no se ejecutó ese flujo ni se tocaron los loaders habituales.

## Interfaz y administración

Se reutiliza el sistema canónico de USUARIO: fuentes, controles, confirmaciones, selects, cards y geometría. Las etapas son un control segmentado y sólo una está visible. Los formularios largos se editan en página. Los personajes agrupan sus perks con hasta tres columnas; los estados y acciones tienen separación. Los modales breves de nombres técnicos y confirmaciones conservan cancelación segura, Escape y foco.

El catálogo tiene cuatro pestañas visuales, imágenes, búsqueda por nombre/alias/inglés/propietario y CARGAR MÁS después de 40 resultados. Cada personaje abre su vista de administración, con estados por personaje/perk, activar/desactivar todas y paquete completo. Eliminación permanece cerrada en opciones avanzadas; se listan objetos, imágenes conservadas y referencias. No se borran perks implícitamente.

Se consolidaron 98 personajes y 294 asociaciones históricas desde las fuentes internas. Las 27 perks sin propietario explícito permanecen sin atribución inventada. Ver DBD-ASOCIACIONES-HISTORICAS.md.

## Validación y publicación

Hay 18 cards de revisión, sin una segunda lista de accesos duplicados. Cada una separa comprobación automática y revisión humana. VALIDAR no depende de casillas visuales; marcar LISTO sí exige completar la revisión. ABRIR MOBILE presenta la herramienta real a 390 px.

El resumen muestra antes, altas activas, desactivaciones, reactivaciones, eliminaciones y después. Terrifier conserva el movimiento **44 + 1 − 1 = 44 Killers** porque El Liche estaba desactivado en el borrador del usuario. Para una reactivación que devuelve un objeto ya activo en la base, se explica la restitución sin cambio neto respecto de esa base. Los parches incluyen catálogos aun cuando no se agregan assets.

Se conservan las tres cards aprobadas: parche Streamer, exportación manual y GitHub. El modal real de GitHub muestra archivos, assets, rama determinista y base; cancelar no crea publicaciones. La prueba con GitHub real sigue pendiente de autorización posterior. No se efectuó CI remoto porque no hubo push.

## Terrifier conservado

Borrador: 581a090a-4503-4bb8-a541-e9c19799550e. Fuente v2 revisión 22. Las ocho entradas, sus campos, propietarios, aliases, nombres de archivo y cambios de catálogo coinciden con la fuente. Sus ocho imágenes conservan SHA-256. Se mantuvo la decisión existente de desactivar lich. Sólo se regeneraron validación, preparación y preview locales; no se aprobaron sus checks humanos ni se publicó.

SHA-256 del árbol fuente v2 antes y después: 75df319633bddf289217c69792f8c45d235a118cc33bbebf69a3f8432c889de5. El original no cambió. La carpeta antigua del Escritorio no fue encontrada; se migró la v2 más reciente comprobada. Detalles en MIGRACION-v3.json y VERIFICACION/terrifier-preservacion.json.

## Prueba controlada Chucky

Borrador separado PRUEBA-DESACTIVAR-CHUCKY, id 412b92d5-407b-42cb-95ed-746eba6c56a3. Desactivar: 44→43 y ausencia en ruleta WEB, búsqueda, Tierlist, Killers/All Killer/Win Streak de USUARIO y Streamer. Reactivar: 43→44 en todas esas superficies. Key, imagen, aliases y progreso completed conservados. También se aplicaron físicamente ambos ZIPs a su programa de preview aislado y se reabrió el modelo persistente: ambos resultados correctos. La prueba terminó con Chucky activo.

Parche de desactivación: Gestor de contenido DBD/datos/preparados/412b92d5-407b-42cb-95ed-746eba6c56a3/16-1f0cb4cd-48fb-4164-9d20-01acf229229e/parche/SanLean-prueba-desactivar-chucky-PATCH.zip

Parche de reactivación: Gestor de contenido DBD/datos/preparados/412b92d5-407b-42cb-95ed-746eba6c56a3/17-0cba2715-fe81-4587-868a-70d11200d71e/parche/SanLean-prueba-desactivar-chucky-PATCH.zip

## URLs OBS verificadas

Primero abrir el Gestor, validar el borrador y ABRIR VISTA PREVIA. Las URLs muestran exactamente el estado de Streamer Preview; una herramienta inactiva puede verse transparente. Las comprobaciones se realizaron sobre las salidas reales en navegador y sus monitores, sin modificar escenas de OBS.

| Herramienta | URL directa temporal | Dimensiones |
| --- | --- | --- |
| meta | http://127.0.0.1:4182/obs/meta | 1920 × 1080 |
| win-streak | http://127.0.0.1:4182/obs/win-streak | 1920 × 1080 |
| all-killer | http://127.0.0.1:4182/obs/all-killer | 1920 × 300 |
| all-survivor | http://127.0.0.1:4182/obs/all-survivor | 1920 × 300 |
| killer-wheel | http://127.0.0.1:4182/obs/killer-wheel | 1920 × 1080 |
| perks-killer | http://127.0.0.1:4182/obs/perks-killer | 1920 × 1080 |
| perks-survivor | http://127.0.0.1:4182/obs/perks-survivor | 1920 × 1080 |

En OBS: Fuente de navegador temporal → URL copiada → dimensiones de la tabla. Conservar las fuentes habituales. Al terminar la prueba se puede quitar esa fuente temporal. No se instalaron loaders en AppData.

## USUARIO: presentación automática

Metas, Win Streak, All Killer y All Survivor tienen Mostrar/Ocultar/Automático con controles canónicos. Intervalo y duración en segundos, efectos arriba/izquierda/derecha/fade, compacto opcional para ambos All Challenges. Se conserva pausa, selección, resultados, estados y alineación de la última fila. Cada configuración está vinculada a overlay y workspace; se lee la última fila y se rechazan escrituras concurrentes mediante updated_at. La animación se calcula localmente sin escrituras remotas por ciclo ni consultas adicionales por frame. No hubo migración de base de datos ni contacto con producción.

## Pruebas y evidencias

- 31 pruebas de modelos/catálogos/validación/parches y Gestor aprobadas; 6 pruebas v3 finales aprobadas, incluidas 2 adicionales: 33 casos únicos.
- private-settings y killer-repeat-controller aprobados.
- Regresión original: 11 grupos aprobados.
- Regresión visual anterior adaptada: 6 grupos aprobados.
- Pruebas integrales v3: 6 grupos aprobados, sin errores JavaScript registrados.
- Gestor: 1440, 900, 740, 390 y 320 px. WEB/USUARIO: 1440 y 390. Streamer: 1440, 900 y 390. Sin overflow horizontal en los flujos comprobados.
- Cuatro comprobaciones extra: mobile USUARIO/Streamer, progreso compacto real, navegación rápida y auditoría sin selección.
- Siete monitores/salidas OBS: conectados, transparencia y animaciones de ruletas comprobadas.
- MASTER sin datos personales; imágenes reales de Terrifier preservadas; origen v2 inalterado.

VERIFICACION contiene informes JSON, logs y capturas seleccionadas. Las pruebas se hicieron en Windows con Edge; no equivalen a una sesión real dentro de OBS ni a pruebas remotas de Supabase/GitHub. La aprobación visual final y publicación real quedan para el usuario.

## Conservación y limpieza

No se ejecutó la limpieza del Gestor ni se borraron copias anteriores o datos del usuario. Se conservaron las preparaciones y evidencias de esta revisión y se listaron las candidatas en COPIAS-CANDIDATAS-A-BORRAR.md. Aclaración de alcance: dos pruebas preexistentes retiraron sus propios fixtures efímeros recién creados en Temp y una prueba de seguridad retiró su enlace de prueba; no afectaron archivos previos. Las carpetas operativas y los respaldos existentes permanecen intactos. No se creó Word.
