@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0maintenance\dbd-content\ContentTools.ps1" -Mode Validate
set "SANLEAN_RESULT=%ERRORLEVEL%"
echo.
pause
exit /b %SANLEAN_RESULT%
