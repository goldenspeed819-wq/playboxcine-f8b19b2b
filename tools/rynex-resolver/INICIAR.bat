@echo off
title Rynex Resolver
cd /d "%~dp0"
echo === Rynex Resolver ===
where node >nul 2>nul || (echo Instale o Node.js em https://nodejs.org e rode de novo. & pause & exit /b)
if not exist node_modules ( echo Instalando... & call npm install )
call npx playwright install chromium
start "Rynex Tunnel" cmd /k npx -y localtunnel --port 8791
node server.js
pause
