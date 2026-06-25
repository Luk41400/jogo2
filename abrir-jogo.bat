@echo off
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
  start "" "http://127.0.0.1:5173"
  npm start
  exit /b
)

where py >nul 2>nul
if %errorlevel%==0 (
  start "" "http://127.0.0.1:5173"
  py -m http.server 5173 --bind 127.0.0.1
  exit /b
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://127.0.0.1:5173"
  python -m http.server 5173 --bind 127.0.0.1
  exit /b
)

echo Nao encontrei Node.js nem Python instalado no PATH.
echo Instale Node.js ou abra o projeto por um servidor local.
pause
