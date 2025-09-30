# Script para iniciar o projeto localmente
Write-Host "🚀 Iniciando Projeto Demandas Localmente..." -ForegroundColor Green

# Verificar se Node.js está instalado
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js não encontrado! Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js encontrado: $(node --version)" -ForegroundColor Green

# Verificar se npm está instalado
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm não encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ npm encontrado: $(npm --version)" -ForegroundColor Green

# Função para executar comando e verificar erro
function Execute-Command {
    param($Command, $Description)
    Write-Host "🔄 $Description..." -ForegroundColor Yellow
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao executar: $Description" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ $Description concluído!" -ForegroundColor Green
}

# 1. Configurar e iniciar Backend
Write-Host "`n🔧 Configurando Backend..." -ForegroundColor Cyan
Set-Location "demandas-api"

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências do backend..." -ForegroundColor Yellow
    Execute-Command "npm install" "Instalação de dependências do backend"
}

# Configurar banco local
Write-Host "🗄️ Configurando banco de dados local..." -ForegroundColor Yellow
Execute-Command "npx prisma generate" "Geração do cliente Prisma"
Execute-Command "npx prisma db push" "Configuração do banco local"

# Iniciar backend em background
Write-Host "🚀 Iniciando backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal

# 2. Configurar e iniciar Frontend
Write-Host "`n🌐 Configurando Frontend..." -ForegroundColor Cyan
Set-Location "../demandas-web"

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências do frontend..." -ForegroundColor Yellow
    Execute-Command "npm install" "Instalação de dependências do frontend"
}

# Iniciar frontend em background
Write-Host "🚀 Iniciando frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal

# Voltar para diretório raiz
Set-Location ".."

Write-Host "`n🎉 Projeto iniciado com sucesso!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:3333" -ForegroundColor Cyan
Write-Host "💾 Banco: SQLite local (dev.db)" -ForegroundColor Cyan
Write-Host "`n⚠️  Mantenha as janelas do PowerShell abertas!" -ForegroundColor Yellow
Write-Host "🔄 Para parar, feche as janelas do PowerShell ou pressione Ctrl+C" -ForegroundColor Yellow

# Aguardar um pouco para mostrar as mensagens
Start-Sleep -Seconds 3
