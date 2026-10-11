@echo off
setlocal
title Hizarc Games - Website Server
cd /d "%~dp0"

echo.
echo   =============================================
echo     HIZARC GAMES  -  local website server
echo   =============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [!] Node.js is not installed or not on PATH.
  echo       Download it from https://nodejs.org ^(LTS^) and run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo   Installing dependencies ^(first run only^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo   [!] npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

echo   Starting dev server...
echo   The site will open at  http://localhost:5173
echo   Other devices on your Wi-Fi can use the "Network" address shown below.
echo   Press Ctrl+C in this window to stop the server.
echo.

call npm run dev -- --open

echo.
pause
