# setup-deploy-direto.ps1
$ErrorActionPreference = "Stop"

Write-Host "🚀 Configurando Deploy Direto..." -ForegroundColor Green

# Verificar se Railway CLI está instalado
try {
    $railwayVersion = railway --version
    Write-Host "✅ Railway CLI: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g @railway/cli
}

# Verificar se Vercel CLI está instalado
try {
    $vercelVersion = vercel --version
    Write-Host "✅ Vercel CLI: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g vercel
}

Write-Host "`n🔐 Configuração de Login:" -ForegroundColor Yellow
Write-Host "1. Para Railway: Execute 'railway login' em um terminal separado" -ForegroundColor Cyan
Write-Host "2. Para Vercel: Execute 'vercel login' em um terminal separado" -ForegroundColor Cyan
Write-Host "`n⚠️ IMPORTANTE: Faça login nos CLIs antes de usar os scripts de deploy!" -ForegroundColor Red

Write-Host "`n✅ Configuração concluída!" -ForegroundColor Green
Write-Host "Use os scripts: deploy-railway-direto.ps1 e deploy-vercel-direto.ps1" -ForegroundColor Cyan
