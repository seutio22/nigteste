@echo off
echo 🚀 Iniciando Projeto Demandas...
echo.

echo 📱 Abrindo Backend...
start "Backend - Porta 3333" powershell -NoExit -Command "cd /d %~dp0demandas-api && npm run dev"

echo.
echo ⏳ Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo 🌐 Abrindo Frontend...
start "Frontend - Porta 5173" powershell -NoExit -Command "cd /d %~dp0demandas-web && npm run dev"

echo.
echo ✅ Projeto iniciado!
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend: http://localhost:3333
echo.
echo ⚠️  Mantenha as janelas abertas!
pause
