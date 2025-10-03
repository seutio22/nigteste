# Script para configurar Vercel CLI
Write-Host "🎨 Configurando Vercel CLI..." -ForegroundColor Blue

# Verificar se Vercel CLI está instalado
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instalando Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Verificar versão
Write-Host "🔍 Versão do Vercel CLI:" -ForegroundColor Yellow
vercel --version

# Verificar se está logado
Write-Host "🔐 Verificando autenticação Vercel..." -ForegroundColor Yellow
$authCheck = vercel whoami 2>&1

if ($authCheck -match "Not authenticated") {
    Write-Host "⚠️ Vercel não autenticado" -ForegroundColor Yellow
    Write-Host "💡 Execute manualmente: vercel login" -ForegroundColor Cyan
} else {
    Write-Host "✅ Vercel CLI já está autenticado!" -ForegroundColor Green
}

Write-Host "🎉 Configuração Vercel finalizada!" -ForegroundColor Green