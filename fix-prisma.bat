@echo off
echo Parando processos Node.js...
taskkill /F /IM node.exe 2>nul
echo.
echo Regenerando Prisma client...
cd demandas-api
npx prisma generate
echo.
echo Iniciando servidor backend...
start cmd /k "npm run dev"
echo.
echo Servidor iniciado! Teste agora a criação de manutenção.
pause
