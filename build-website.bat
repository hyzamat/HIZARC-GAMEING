@echo off
setlocal
title Hizarc Games - Production Build
cd /d "%~dp0"

echo.
echo   =============================================
echo     HIZARC GAMES  -  production build
echo   =============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [!] Node.js is not installed or not on PATH. Get it from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo   Installing dependencies...
  call npm install || (pause & exit /b 1)
)

echo   Building optimized site into the "dist" folder...
call npm run build
if errorlevel 1 (
  echo.
  echo   [!] Build failed - see the errors above.
  pause
  exit /b 1
)

echo.
echo   Done! Upload the contents of the "dist" folder to games.hizarc.com.
echo   Previewing the production build at http://localhost:4173  (Ctrl+C to stop)
echo.
call npm run preview -- --open
pause
