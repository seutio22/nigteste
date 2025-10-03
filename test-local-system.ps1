# test-local-system.ps1
Write-Host "🔍 Testando Sistema Local..." -ForegroundColor Yellow

# Verificar se estamos no diretório correto
if (-not (Test-Path "demandas-api/package.json") -or -not (Test-Path "demandas-web/package.json")) {
    Write-Host "❌ Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Diretório do projeto verificado" -ForegroundColor Green

# Testar Backend
Write-Host "`n🔧 Testando Backend..." -ForegroundColor Cyan
Set-Location "demandas-api"

# Verificar se as dependências estão instaladas
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências do backend..." -ForegroundColor Yellow
    npm install
}

# Testar build
Write-Host "🏗️ Testando build do backend..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✅ Build do backend bem-sucedido" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no build do backend: $($_.Exception.Message)" -ForegroundColor Red
    Set-Location ".."
    exit 1
}

# Iniciar backend em background
Write-Host "🚀 Iniciando backend..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "dist/server.js" -WindowStyle Hidden

# Aguardar backend iniciar
Start-Sleep -Seconds 5

# Testar se backend está rodando
Write-Host "🔍 Testando se backend está rodando..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3333/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Backend rodando na porta 3333" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend não está respondendo: $($_.Exception.Message)" -ForegroundColor Red
}

Set-Location ".."

# Testar Frontend
Write-Host "`n🎨 Testando Frontend..." -ForegroundColor Cyan
Set-Location "demandas-web"

# Verificar se as dependências estão instaladas
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências do frontend..." -ForegroundColor Yellow
    npm install
}

# Testar build
Write-Host "🏗️ Testando build do frontend..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✅ Build do frontend bem-sucedido" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no build do frontend: $($_.Exception.Message)" -ForegroundColor Red
    Set-Location ".."
    exit 1
}

# Iniciar frontend em background
Write-Host "🚀 Iniciando frontend..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden

# Aguardar frontend iniciar
Start-Sleep -Seconds 10

# Testar se frontend está rodando
Write-Host "🔍 Testando se frontend está rodando..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method GET -TimeoutSec 5
    Write-Host "✅ Frontend rodando na porta 5173" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend não está respondendo: $($_.Exception.Message)" -ForegroundColor Red
}

Set-Location ".."

# Resumo
Write-Host "`n📊 RESUMO DO TESTE LOCAL:" -ForegroundColor Yellow
Write-Host "Backend: http://localhost:3333" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "`n💡 Para parar os servidores, feche as janelas do terminal ou use Ctrl+C" -ForegroundColor Green
