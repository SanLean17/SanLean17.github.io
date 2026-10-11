@echo off
cd /d "%~dp0"
set "LOCAL_NODE=node"
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "LOCAL_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
where "%LOCAL_NODE%" >nul 2>nul
if errorlevel 1 (
  echo Necesitas Node.js para iniciar el servidor local. Consulta docs\USUARIO-LOCAL.md.
  pause
  exit /b 1
)
"%LOCAL_NODE%" scripts\serve-usuario-local.cjs
pause
