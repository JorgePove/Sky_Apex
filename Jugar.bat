@echo off
rem Sky Apex: abre el juego con un servidor local para que lea el Excel de stats (datos\sky_apex_stats.xlsx) al momento.
rem Deja esta ventana abierta mientras juegas; al cerrarla se para el servidor. Necesita Node (https://nodejs.org).
title Sky Apex - servidor local
cd /d "%~dp0"
where node >nul 2>nul || (echo Falta Node.js: instalalo desde https://nodejs.org & pause & exit /b 1)
node herramientas\servidor_juego.mjs 8770
if errorlevel 1 pause
