# Script simples para iniciar o projeto
Write-Host "🚀 Iniciando Projeto Demandas..." -ForegroundColor Green

# Iniciar Backend
Write-Host "🔧 Iniciando Backend na porta 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd demandas-api; npm run dev" -WindowStyle Normal

# Aguardar um pouco
Start-Sleep -Seconds 3

# Iniciar Frontend
Write-Host "🌐 Iniciando Frontend na porta 5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd demandas-web; npm run dev" -WindowStyle Normal

Write-Host "`n🎉 Serviços iniciados!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "💾 Banco: SQLite local" -ForegroundColor Cyan
