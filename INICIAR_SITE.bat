@echo off
setlocal
cd /d "%~dp0"
echo Iniciando IA Sem Paciencia em http://localhost:8787 ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor-local.ps1"
endlocal
