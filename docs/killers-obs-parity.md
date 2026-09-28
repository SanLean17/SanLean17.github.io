# Killers: paridad WEB / USUARIO / OBS

Referencia: `3037bf0` de `SanLean17/SanLean17.github.io`.

## Código público revisado (sin cambios)

- `js/main.js`: renderer DOM activo; `noAdjacent`, `longDeck`, centrado, cuatro fotogramas, 8000 ms y `cubic-bezier(.12,.72,.16,1)`.
- `css/killer-page.css`: carrusel de 1180 × 370, cartas de 196 × 278, separación de 14, retratos, nombres, donantes, iluminación, capas y selección de 1.22.
- `ruleta-killer.html`: el canvas antiguo está oculto por main.js; su función de giro no gobierna la ruleta visible. Las restricciones de perks corresponden a otra ruleta.

## Adaptación privada necesaria

Se conserva literalmente `noAdjacent` y la construcción por tandas de `longDeck`, además de los fotogramas del giro. El ganador sigue llegando de USUARIO. Después de fijarlo, se recorre el mazo hacia ambos lados para corregir duplicados adyacentes. Esto también cubre los pesos desiguales con los que el algoritmo público puede agotar alternativas. Solo cambia la secuencia decorativa; no se alteran probabilidades, donantes del ganador, configuración ni selección del resultado.

Con un único killer disponible se presenta una sola carta centrada: rellenar siete posiciones repetiría necesariamente ese killer. Con cero disponibles, el controlador existente bloquea el giro.

OBS conserva las dimensiones lógicas públicas y reduce el conjunto completo cuando la fuente es menor. Hay cinco cartas completas y dos parciales en los extremos, como en la WEB; no siete cartas completas. Se conservan también los degradados públicos. USUARIO mantiene su presentación reducida y calcula el centrado con su separación real de 10 px.

## Validación

- `tests/killer-obs-parity.cjs`: requiere Playwright y Chrome; admite `PLAYWRIGHT_MODULE`, `CHROME_PATH` y `QA_OUTPUT`. Compara con la página pública real del checkout: estilos calculados, fotogramas y duración. Verifica siete posiciones en 1920, 1280, 800, 640 y 390 px, 250 secuencias, pesos 99:1, llegada del resultado durante el frenado, recarga, ganador correcto y exclusión del pool usado.
- `tests/killer-repeat-controller.cjs`: ejecuta el controlador existente con almacenamiento en memoria y tiempo acelerado. Comprueba MANTENER, 30 eliminaciones únicas, agotamiento, último killer y reinicio. No escribe registros reales.
- Las capturas adjuntas al chat anterior no estaban disponibles: read_thread solo entregó marcadores de dos imágenes. La revisión visual se hizo sobre capturas nuevas de Chromium. OBS nativo y una sesión autenticada real no se probaron.

## Prueba en OBS

Refrescar la fuente existente y MI PANEL. GENERAR → GIRAR; comprobar encuadre, nombres y frenado. En ELIMINAR AL SALIR, repetir sin volver a generar: el ganador anterior debe quedar fuera. REINICIAR debe devolver los killers habilitados. En MANTENER pueden repetirse ganadores entre giros, pero no cartas adyacentes.
