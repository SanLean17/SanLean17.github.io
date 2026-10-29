$ErrorActionPreference = 'Stop'
$appRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
try {
  $health = Invoke-RestMethod 'http://127.0.0.1:4180/health' -TimeoutSec 2
  if ($health.app -eq 'sanlean-dbd-manager' -and $health.root -eq $appRoot) {
    Start-Process 'http://127.0.0.1:4180/'
    exit 0
  }
} catch {}
if (Get-NetTCPConnection -LocalPort 4180 -State Listen -ErrorAction SilentlyContinue) {
  Write-Host 'El puerto del Gestor esta ocupado. Cerra la otra copia del Gestor antes de abrir esta.'
  exit 1
}
$runtime = Join-Path $appRoot 'runtime/node.exe'
if (!(Test-Path -LiteralPath $runtime) -or !(Test-Path -LiteralPath (Join-Path $appRoot 'base-manifest.json'))) {
  Write-Host 'Extrae el ZIP completo en una carpeta antes de iniciar. No abras el BAT desde dentro del ZIP.'
  exit 1
}
& $runtime (Join-Path $PSScriptRoot 'server.cjs') $appRoot
exit $LASTEXITCODE
