# Script para deploy direto no Vercel
# Este script usa o Vercel CLI para fazer deploy direto

Write-Host "🎨 Iniciando deploy direto no Vercel..." -ForegroundColor Blue

# Verificar se o Vercel CLI está instalado
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g vercel
}

# Navegar para o diretório do frontend
Set-Location demandas-web

# Verificar se está logado
Write-Host "🔍 Verificando autenticação..." -ForegroundColor Yellow
$authCheck = vercel whoami 2>&1

if ($authCheck -match "Not authenticated") {
    Write-Host "⚠️ Não autenticado. Tentando login..." -ForegroundColor Yellow
    
    # Tentar login
    vercel login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha no login. Usando deploy automático via Git..." -ForegroundColor Red
        Set-Location ..
        git add .
        git commit -m "trigger: Deploy Vercel via script - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" --allow-empty
        git push origin main
        Write-Host "✅ Deploy automático iniciado via Git push" -ForegroundColor Green
        exit 0
    }
}

# Fazer deploy direto
Write-Host "🚀 Fazendo deploy direto no Vercel..." -ForegroundColor Green
vercel --prod --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy Vercel concluído com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no deploy Vercel. Usando fallback..." -ForegroundColor Red
    Set-Location ..
    git add .
    git commit -m "trigger: Deploy Vercel fallback - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" --allow-empty
    git push origin main
    Write-Host "✅ Deploy automático iniciado via Git push (fallback)" -ForegroundColor Green
}

Set-Location ..
Write-Host "🎉 Deploy Vercel finalizado!" -ForegroundColor Cyan
