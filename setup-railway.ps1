# Script para configurar Railway CLI
Write-Host "🚂 Configurando Railway CLI..." -ForegroundColor Blue

# Verificar se Railway CLI está instalado
if (!(Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instalando Railway CLI..." -ForegroundColor Yellow
    npm install -g @railway/cli
}

# Verificar versão
Write-Host "🔍 Versão do Railway CLI:" -ForegroundColor Yellow
railway --version

# Tentar login
Write-Host "🔐 Tentando login no Railway..." -ForegroundColor Yellow
railway login --browserless

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Railway CLI configurado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Railway CLI não pôde ser configurado automaticamente" -ForegroundColor Yellow
    Write-Host "💡 Execute manualmente: railway login" -ForegroundColor Cyan
}

Write-Host "🎉 Configuração Railway finalizada!" -ForegroundColor Green