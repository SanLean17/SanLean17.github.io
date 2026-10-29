param(
  [ValidateSet('Validate','Patch')][string]$Mode = 'Validate',
  [string]$Root = (Join-Path $PSScriptRoot '../..'),
  [string]$UpdateId = '',
  [string]$OutputDirectory = ''
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$Root = [IO.Path]::GetFullPath($Root)
$issues = New-Object 'System.Collections.Generic.List[string]'
$catalogs = @{}
$files = @('killers','survivors','perks-killer','perks-survivor')
function Issue([string]$File,[string]$Key,[string]$Message) { $issues.Add("ERROR: $File`n$Key`n$Message") }
function Has($Item,[string]$Name) { return $null -ne $Item.PSObject.Properties[$Name] }
function ImagePath($Item,[string]$Type) {
  if (Has $Item 'image') { return [string]$Item.image }
  if ($Type -eq 'perks-killer') { return "killer/$($Item.key).png" }
  if ($Type -eq 'perks-survivor') { return "survivor/$($Item.key).png" }
  return ''
}
function SafeAsset([string]$Relative,[string]$Type,$Item) {
  $folder = @{killers='assets/killers';survivors='survivors';'perks-killer'='killer';'perks-survivor'='survivor'}[$Type]
  if ($Item.key -eq 'slot_vacio' -and $Item.emptySlot -eq $true -and $Relative -ceq 'rombo.png') { return $true }
  return $Relative -cmatch ('^' + $folder + '/[a-zA-Z0-9_. -]+\.(png|webp)$') -and $Relative -notmatch '(^|/)\.\.?(/|$)'
}
try {
  foreach ($type in $files) {
    $file = "data/$type.json"
    try {
      $text = [IO.File]::ReadAllText((Join-Path $Root $file),[Text.Encoding]::UTF8)
      if (-not $text.TrimStart().StartsWith('[')) { throw 'El catálogo debe comenzar con [ y contener un array.' }
      $rows = ConvertFrom-Json -InputObject $text
      if ($rows -isnot [array]) { throw 'El catálogo debe ser un array.' }
      $catalogs[$type] = $rows
    } catch { Issue $file '' ("JSON no válido o archivo ausente: " + $_.Exception.Message); continue }
    $keys = @{}; $numbers = @{}
    foreach ($item in $rows) {
      if ($null -eq $item -or $item -isnot [pscustomobject]) { Issue $file '' 'Cada entrada debe ser un objeto.'; continue }
      $key = [string]$item.key
      if ($item.key -isnot [string] -or [string]::IsNullOrWhiteSpace($key)) { Issue $file $key 'Falta key.' }
      elseif ($keys.ContainsKey($key)) { Issue $file $key 'key duplicada.' } else { $keys[$key] = $true }
      if ($type -in @('killers','survivors')) {
        if ($key -cnotmatch '^[a-z0-9][a-z0-9_-]*$') { Issue $file $key 'La key del personaje debe estar en minúsculas y sin espacios.' }
      } elseif ($key -ne 'slot_vacio') {
        if ($key -cnotmatch '^(\d+)_[a-zA-Z][a-zA-Z0-9_-]*$') { Issue $file $key 'La perk necesita un prefijo numérico y una key sin espacios.' }
        else { $number = [long]$Matches[1]; if ($numbers.ContainsKey($number)) { Issue $file $key 'Prefijo numérico duplicado.' } else { $numbers[$number] = $true } }
      }
      if ($item.name -isnot [string] -or [string]::IsNullOrWhiteSpace($item.name)) { Issue $file $key 'Falta name (nombre visible).' }
      if ((Has $item 'enabled') -and $item.enabled -isnot [bool]) { Issue $file $key 'enabled debe ser true o false, sin comillas.' }
      if (Has $item 'aliases') {
        if ($item.aliases -isnot [string] -and $item.aliases -isnot [array]) { Issue $file $key 'aliases debe ser texto o un array de textos.' }
        elseif ($item.aliases -is [array] -and @($item.aliases | Where-Object { $_ -isnot [string] }).Count) { Issue $file $key 'Cada alias debe ser texto.' }
      }
      if ((Has $item 'updateId') -and ($item.updateId -isnot [string] -or $item.updateId -cnotmatch '^[a-z0-9]+(-[a-z0-9]+)*$')) { Issue $file $key 'updateId no válido: usar minúsculas, números y guiones.' }
      if ((Has $item 'image') -and ($item.image -isnot [string] -or [string]::IsNullOrWhiteSpace($item.image))) { Issue $file $key 'image debe contener una ruta, o se debe omitir en perks.' }
      $asset = ImagePath $item $type
      if (-not (SafeAsset $asset $type $item)) { Issue $file $key ("Ruta de imagen incompatible: " + $asset); continue }
      $full = Join-Path $Root $asset
      if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { Issue $file $key ("No existe:`n" + $asset) }
      else {
        $part = Get-Item -LiteralPath $full
        while ($part -and $part.FullName.Length -gt $Root.Length) {
          if ($part.Attributes -band [IO.FileAttributes]::ReparsePoint) { Issue $file $key 'No se admiten enlaces de archivos o carpetas para assets.'; break }
          if ($part -is [IO.FileInfo]) { $part = $part.Directory } else { $part = $part.Parent }
        }
      }
    }
  }
  foreach ($type in @('perks-killer','perks-survivor')) {
    $ownerType = if ($type -eq 'perks-killer') { 'killers' } else { 'survivors' }
    foreach ($item in $catalogs[$type]) {
      if (Has $item 'ownerKey') {
        if ($item.ownerKey -isnot [string] -or [string]::IsNullOrWhiteSpace($item.ownerKey) -or -not @($catalogs[$ownerType] | Where-Object { $_.key -ceq $item.ownerKey }).Count) { Issue "data/$type.json" $item.key ("ownerKey no existe en data/${ownerType}.json: " + $item.ownerKey) }
      }
    }
  }
  $conflictFile = 'data/perk-conflicts.json'
  try {
    $conflicts = [IO.File]::ReadAllText((Join-Path $Root $conflictFile),[Text.Encoding]::UTF8) | ConvertFrom-Json
    foreach ($role in @('killer','survivor')) {
      if (-not (Has $conflicts $role) -or $conflicts.$role -isnot [array]) { Issue $conflictFile $role 'Los conflictos deben ser un array de grupos.'; continue }
      foreach ($group in $conflicts.$role) {
        if ($group -isnot [array]) { Issue $conflictFile $role 'Cada grupo debe ser un array de keys.'; continue }
        foreach ($key in $group) { if ($key -isnot [string] -or -not @($catalogs["perks-$role"] | Where-Object { $_.key -ceq $key }).Count) { Issue $conflictFile $role ("La key referenciada no existe: " + $key) } }
      }
    }
  } catch { Issue $conflictFile '' ("JSON no válido: " + $_.Exception.Message) }
  if ($issues.Count) { $issues | ForEach-Object { Write-Host $_ -ForegroundColor Red }; throw "Se encontraron $($issues.Count) errores. No se creó ningún parche." }
  foreach ($type in $files) { $active = @($catalogs[$type] | Where-Object { $_.enabled -ne $false }).Count; Write-Host ("{0}: {1} activos / {2} preparados" -f $type,$active,($catalogs[$type].Count-$active)) }
  Write-Host 'VALIDACIÓN CORRECTA.' -ForegroundColor Green
  if ($Mode -eq 'Validate') { exit 0 }
  if (-not $UpdateId) { $UpdateId = Read-Host 'ID DE ACTUALIZACIÓN' }
  if ($UpdateId -cnotmatch '^[a-z0-9]+(-[a-z0-9]+)*$') { throw 'ID DE ACTUALIZACIÓN no válido.' }
  $assets = @{}; $found = 0
  foreach ($type in $files) {
    $selected = @($catalogs[$type] | Where-Object { $_.updateId -ceq $UpdateId }); $found += $selected.Count
    Write-Host ("{0}: {1}" -f $type,$selected.Count)
    foreach ($item in $selected) { $assets[(ImagePath $item $type)] = $true }
  }
  if (-not $found) { throw "No existen elementos con updateId '$UpdateId'." }
  Write-Host "ASSETS: $($assets.Count)"
  if (-not $OutputDirectory) { $OutputDirectory = Join-Path $Root 'exports' }
  [void][IO.Directory]::CreateDirectory($OutputDirectory)
  $destination = Join-Path $OutputDirectory "SanLean-$UpdateId-PATCH.zip"
  if (Test-Path -LiteralPath $destination) { throw "Ya existe $destination. Renombrá o mové el parche anterior para conservarlo." }
  $temp = Join-Path ([IO.Path]::GetTempPath()) ('SanLean-content-' + [guid]::NewGuid().ToString('N'))
  [void][IO.Directory]::CreateDirectory($temp)
  try {
    foreach ($relative in (@($files | ForEach-Object { "data/$_.json" }) + @($conflictFile) + @($assets.Keys))) {
      $target = Join-Path $temp $relative; [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target))
      Copy-Item -LiteralPath (Join-Path $Root $relative) -Destination $target
    }
    $readme = @"
SANLEAN - PARCHE DE CONTENIDO: $UpdateId
Requiere haber instalado una vez SanLean-Streamer-Tools-Catalog-System-PATCH.zip.
1. Cerrar SanLean Streamer Tools.
2. Hacer una copia de seguridad de la carpeta del programa.
3. Extraer el PATCH encima de la carpeta que contiene INICIAR SANLEAN STREAMER TOOLS.bat.
4. Aceptar reemplazar archivos.
5. Abrir nuevamente el programa.
6. No borrar la carpeta datos ni los datos locales.
7. No volver a configurar OBS ni modificar sus fuentes.
El contenido con enabled: false permanece preparado e invisible.
Este parche incluye catálogos completos: usar siempre una copia actualizada del proyecto.
"@
    [IO.File]::WriteAllText((Join-Path $temp 'README-PATCH.txt'),$readme,(New-Object Text.UTF8Encoding($true)))
    $temporaryZip = "$temp.zip"
    Compress-Archive -Path (Join-Path $temp '*') -DestinationPath $temporaryZip
    $writingDestination = $true
    Copy-Item -LiteralPath $temporaryZip -Destination $destination -ErrorAction Stop
    $writingDestination = $false
    Write-Host "PARCHE CREADO: $destination" -ForegroundColor Green
  } finally {
    $resolved = [IO.Path]::GetFullPath($temp)
    $tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if ($resolved.StartsWith($tempBase,[StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($resolved).StartsWith('SanLean-content-')) { Remove-Item -LiteralPath $resolved -Recurse -Force }
    if ($temporaryZip -and (Test-Path -LiteralPath $temporaryZip)) { Remove-Item -LiteralPath $temporaryZip -Force }
  }
  exit 0
} catch { if ($writingDestination -and (Test-Path -LiteralPath $destination)) { Remove-Item -LiteralPath $destination -Force }; Write-Host ("ERROR: " + $_.Exception.Message) -ForegroundColor Red; exit 1 }
