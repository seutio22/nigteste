# Script simplificado para iniciar Backend e Frontend
Write-Host "🚀 INICIANDO SISTEMA DE DEMANDAS..." -ForegroundColor Green

# Iniciar Backend
Write-Host "🔧 Iniciando Backend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\demandas-api'; npm run dev" -WindowStyle Minimized

# Aguardar um pouco
Start-Sleep -Seconds 5

# Iniciar Frontend
Write-Host "🌐 Iniciando Frontend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\demandas-web'; npm run dev:local" -WindowStyle Minimized

# Aguardar um pouco
Start-Sleep -Seconds 5

Write-Host "✅ Sistema iniciado!" -ForegroundColor Green
Write-Host "📱 Backend:  http://localhost:4000" -ForegroundColor White
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "💡 Aguarde alguns segundos para os serviços inicializarem" -ForegroundColor Yellow
