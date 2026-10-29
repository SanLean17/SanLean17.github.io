# Herramientas de contenido DBD

La documentación canónica es [DBD-CONTENT-MAINTENANCE-TECHNICAL.md](../../docs/DBD-CONTENT-MAINTENANCE-TECHNICAL.md).

- `templates/`: objetos para completar; no se cargan automáticamente.
- `examples/terrifier/`: ejemplo aislado y desactivado, con datos por confirmar, sin assets.
- `ContentTools.ps1`: validador y generador de parches de capítulos, invocados por los dos `.bat` de la raíz.
- `Build-InitialPatch.ps1`: empaqueta la adaptación inicial del programa local. No incluye datos personales.
- `streamer-runtime/`: archivos de la adaptación local, conservando su arquitectura, animaciones y persistencia. El módulo común y los catálogos se copian desde la raíz al empaquetar; no mantener aquí otra copia.
- `streamer-baseline.json`: huellas de los archivos de origen local inspeccionados.

Los parches de capítulos futuros no vuelven a incluir código ni reemplazan loaders. Requieren haber instalado una vez el parche inicial.
