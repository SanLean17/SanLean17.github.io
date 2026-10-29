param([string]$Root=(Join-Path $PSScriptRoot '../..'),[string]$OutputDirectory='')
$ErrorActionPreference='Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$Root=[IO.Path]::GetFullPath($Root)
try {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'maintenance/dbd-content/ContentTools.ps1') -Root $Root -Mode Validate
  if ($LASTEXITCODE -ne 0) { throw 'La validación falló.' }
  if (-not $OutputDirectory) { $OutputDirectory=Join-Path $Root 'exports' }
  [void][IO.Directory]::CreateDirectory($OutputDirectory)
  $destination=Join-Path $OutputDirectory 'SanLean-Streamer-Tools-Catalog-System-PATCH.zip'
  if (Test-Path -LiteralPath $destination) { throw "Ya existe $destination. Conservá o mové el archivo anterior." }
  $temp=Join-Path ([IO.Path]::GetTempPath()) ('SanLean-initial-'+[guid]::NewGuid().ToString('N'))
  [void][IO.Directory]::CreateDirectory($temp)
  function CopyRelative([string]$Source,[string]$Relative) {
    $to=Join-Path $temp $Relative;[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($to));Copy-Item -LiteralPath $Source -Destination $to
  }
  $runtime=Join-Path $Root 'maintenance/dbd-content/streamer-runtime'
  foreach ($file in Get-ChildItem -LiteralPath $runtime -Recurse -File) { CopyRelative $file.FullName $file.FullName.Substring($runtime.Length+1) }
  CopyRelative (Join-Path $Root 'js/dbd-catalog.js') 'public/js/dbd-catalog.js'
  # Keep the local animation engine: only its image acceptance is extended to WebP.
  foreach ($name in @('killers','survivors','perks-killer','perks-survivor')) {
    CopyRelative (Join-Path $Root "data/$name.json") "data/$name.json"
    $items=ConvertFrom-Json -InputObject ([IO.File]::ReadAllText((Join-Path $Root "data/$name.json")))
    foreach ($item in $items) {
      $asset=$item.image
      if (-not $asset) { $role=if($name -eq 'perks-killer'){'killer'}else{'survivor'};$asset="$role/$($item.key).png" }
      CopyRelative (Join-Path $Root $asset) $asset
    }
  }
  foreach ($relative in @('data/perk-conflicts.json','VALIDAR CONTENIDO DBD.bat','CREAR PARCHE DE CONTENIDO STREAMER.bat','maintenance/dbd-content/ContentTools.ps1')) { CopyRelative (Join-Path $Root $relative) $relative }
  [IO.File]::WriteAllText((Join-Path $temp 'README-PATCH.txt'),@'
SANLEAN STREAMER TOOLS - SISTEMA DE CATÁLOGOS - VERSIÓN DE PRUEBA
1. Cerrar SanLean Streamer Tools.
2. Hacer una copia de seguridad de toda la carpeta del programa.
3. Extraer este ZIP encima de la carpeta que contiene INICIAR SANLEAN STREAMER TOOLS.bat.
4. Aceptar reemplazar archivos.
5. Abrir el programa de la forma habitual.
6. Confirmar que el contenido actual y el progreso siguen apareciendo.
7. No volver a configurar OBS. Los loaders y las direcciones se conservan.

No borrar datos, preferencias, progreso, historial ni respaldos.
Desde esta versión los cuatro catálogos están en data/, en la raíz del programa.
Las copias antiguas en public/data quedan sin uso para estos cuatro catálogos; no editarlas.
Los futuros parches de capítulos llevan solamente JSON + assets + instrucciones.
No hay contenido Terrifier activo en este parche.
Validar contenido: doble clic en VALIDAR CONTENIDO DBD.bat.
Crear parche: doble clic en CREAR PARCHE DE CONTENIDO STREAMER.bat e ingresar el updateId.
'@,(New-Object Text.UTF8Encoding($true)))
  $temporaryZip="$temp.zip";Compress-Archive -Path (Join-Path $temp '*') -DestinationPath $temporaryZip
  Copy-Item -LiteralPath $temporaryZip -Destination $destination -ErrorAction Stop
  Write-Host "PARCHE INICIAL CREADO: $destination"
} catch { Write-Host ("ERROR: "+$_.Exception.Message);Write-Host $_.ScriptStackTrace;exit 1 }
finally {
  if ($temp) {
    $resolved=[IO.Path]::GetFullPath($temp);$tempBase=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')+'\'
    if ($resolved.StartsWith($tempBase,[StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($resolved).StartsWith('SanLean-initial-')) { Remove-Item -LiteralPath $resolved -Recurse -Force }
    if ($temporaryZip -and (Test-Path -LiteralPath $temporaryZip)) { Remove-Item -LiteralPath $temporaryZip -Force }
  }
}
