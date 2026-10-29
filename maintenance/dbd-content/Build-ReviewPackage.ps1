param([Parameter(Mandatory=$true)][string]$LocalSource,[Parameter(Mandatory=$true)][string]$InitialPatch,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$LocalSource=[IO.Path]::GetFullPath($LocalSource);$OutputDirectory=[IO.Path]::GetFullPath($OutputDirectory)
if (-not (Test-Path -LiteralPath (Join-Path $LocalSource 'runtime/node.exe'))) { throw 'No se encontró la versión local con su motor incluido.' }
$folder=Join-Path $OutputDirectory 'SanLean-Streamer-Tools-Catalogos-PRUEBA'
$zip=Join-Path $OutputDirectory 'SanLean-Streamer-Tools-Catalogos-PRUEBA.zip'
if ((Test-Path -LiteralPath $folder) -or (Test-Path -LiteralPath $zip)) { throw 'Ya existe una entrega de prueba. Conservarla o moverla antes de crear otra.' }
[void][IO.Directory]::CreateDirectory($folder)
# Explicit product allowlist: no user data, QA folders, stored profiles or AppData.
foreach ($name in @('public','runtime','obs-loaders','licenses')) { Copy-Item -LiteralPath (Join-Path $LocalSource $name) -Destination (Join-Path $folder $name) -Recurse }
foreach ($file in Get-ChildItem -LiteralPath $LocalSource -File) { if ($file.Extension -in @('.cjs','.bat','.ps1','.txt')) { Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $folder $file.Name) } }
Expand-Archive -LiteralPath $InitialPatch -DestinationPath $folder -Force
[IO.File]::WriteAllText((Join-Path $folder 'LEER-PRIMERO-PRUEBA.txt'),@'
SANLEAN - VERSIÓN DE PRUEBA DEL SISTEMA DE CATÁLOGOS
Extraer esta carpeta en una ubicación distinta de la instalación habitual.
Cerrar la copia habitual antes de iniciar esta: ambas usan el puerto local 4175.
Ejecutar INICIAR SANLEAN STREAMER TOOLS.bat. Incluye el motor; no instalar nada.
Esta copia empieza sin progreso personal. No contiene personajes/perks nuevos ni Terrifier.
Para probar conservación del progreso, usar el PATCH sobre una copia de la instalación habitual.
No cambiar las fuentes de OBS ni volver a ejecutar el configurador de fuentes.
Los .bat VALIDAR CONTENIDO DBD y CREAR PARCHE DE CONTENIDO STREAMER están en esta carpeta.
'@,(New-Object Text.UTF8Encoding($true)))
Compress-Archive -LiteralPath $folder -DestinationPath $zip
Write-Host "PRUEBA CREADA: $zip"
