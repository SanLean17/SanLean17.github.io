param([Parameter(Mandatory=$true)][string]$LiteralTarget)
$ErrorActionPreference = 'Stop'
$target = [IO.Path]::GetFullPath($LiteralTarget)
if (!(Test-Path -LiteralPath $target)) { throw 'La copia ya no existe.' }
$item = Get-Item -LiteralPath $target -Force
if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'No se admiten enlaces.' }
if ($item.PSIsContainer) {
  $linked = Get-ChildItem -LiteralPath $target -Force -Recurse | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint } | Select-Object -First 1
  if ($linked) { throw 'La carpeta contiene enlaces. No se movió.' }
}
Add-Type -AssemblyName Microsoft.VisualBasic
if ($item.PSIsContainer) {
  [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($target, 'OnlyErrorDialogs', 'SendToRecycleBin', 'ThrowException')
} else {
  [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($target, 'OnlyErrorDialogs', 'SendToRecycleBin', 'ThrowException')
}
