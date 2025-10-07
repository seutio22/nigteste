# Script de inicialização rápida para teste
Write-Host "🚀 Iniciando sistema para teste de segurança..." -ForegroundColor Green

# Iniciar Backend
Write-Host "📡 Iniciando Backend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\demandas-api'; npm run dev"

# Aguardar um pouco
Start-Sleep -Seconds 5

# Iniciar Frontend  
Write-Host "🌐 Iniciando Frontend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\demandas-web'; npm run dev:local"

# Aguardar um pouco
Start-Sleep -Seconds 5

Write-Host "✅ Serviços iniciados!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "📡 Backend: http://localhost:4000" -ForegroundColor Yellow
Write-Host "🧪 Teste de Segurança: test-security-fix.html" -ForegroundColor Yellow

Write-Host "`n📋 Para testar a correção de segurança:" -ForegroundColor Cyan
Write-Host "1. Abra http://localhost:5173 no navegador" -ForegroundColor White
Write-Host "2. Faça login no sistema" -ForegroundColor White
Write-Host "3. Navegue por algumas páginas" -ForegroundColor White
Write-Host "4. Faça logout" -ForegroundColor White
Write-Host "5. Abra test-security-fix.html para verificar se os dados foram limpos" -ForegroundColor White

Write-Host "`n🔒 A correção de segurança implementada:" -ForegroundColor Magenta
Write-Host "✅ Limpa TODOS os dados do localStorage no logout" -ForegroundColor Green
Write-Host "✅ Remove 15+ stores Zustand com persist" -ForegroundColor Green
Write-Host "✅ Limpa configurações de páginas" -ForegroundColor Green
Write-Host "✅ Remove configurações do sistema" -ForegroundColor Green
Write-Host "✅ Timeout funciona corretamente" -ForegroundColor Green

