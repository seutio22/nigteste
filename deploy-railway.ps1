# Script para deploy direto no Railway
# Este script usa o Railway CLI para fazer deploy direto

Write-Host "🚂 Iniciando deploy direto no Railway..." -ForegroundColor Blue

# Verificar se o Railway CLI está instalado
if (!(Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Railway CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g @railway/cli
}

# Navegar para o diretório do backend
Set-Location demandas-api

# Verificar se está logado
Write-Host "🔍 Verificando autenticação..." -ForegroundColor Yellow
$authCheck = railway whoami 2>&1

if ($authCheck -match "Unauthorized") {
    Write-Host "⚠️ Não autenticado. Tentando login..." -ForegroundColor Yellow
    
    # Tentar login browserless
    railway login --browserless
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Falha no login. Usando deploy automático via Git..." -ForegroundColor Red
        Set-Location ..
        git add .
        git commit -m "trigger: Deploy Railway via script - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" --allow-empty
        git push origin main
        Write-Host "✅ Deploy automático iniciado via Git push" -ForegroundColor Green
        exit 0
    }
}

# Fazer deploy direto
Write-Host "🚀 Fazendo deploy direto no Railway..." -ForegroundColor Green
railway deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy Railway concluído com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no deploy Railway. Usando fallback..." -ForegroundColor Red
    Set-Location ..
    git add .
    git commit -m "trigger: Deploy Railway fallback - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" --allow-empty
    git push origin main
    Write-Host "✅ Deploy automático iniciado via Git push (fallback)" -ForegroundColor Green
}

Set-Location ..
Write-Host "🎉 Deploy Railway finalizado!" -ForegroundColor Cyan
