# Script para iniciar os servidores
Write-Host "🚀 Iniciando servidores..." -ForegroundColor Green

# Iniciar backend
Write-Host "📡 Iniciando backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd demandas-api; npm run dev"

# Aguardar um pouco
Start-Sleep -Seconds 3

# Iniciar frontend
Write-Host "🌐 Iniciando frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd demandas-web; npm run dev"

Write-Host "✅ Servidores iniciados!" -ForegroundColor Green
Write-Host "Backend: http://localhost:3333" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
