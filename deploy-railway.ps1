# Script para deploy direto no Railway
# Este script usa o Railway CLI para fazer deploy direto

Write-Host "🚂 Iniciando deploy direto no Railway..." -ForegroundColor Blue

# Localizar binário do Railway CLI
$railwayCmd = Join-Path $env:APPDATA 'npm\railway.cmd'
if (!(Test-Path $railwayCmd)) {
    Write-Host "❌ Railway CLI não encontrado. Instalando..." -ForegroundColor Red
    npm install -g @railway/cli | Out-Null
}
$railwayCmd = Join-Path $env:APPDATA 'npm\railway.cmd'
if (!(Test-Path $railwayCmd)) {
    Write-Host "❌ Falha ao localizar railway.cmd após a instalação. Abortando." -ForegroundColor Red
    exit 1
}

# Navegar para o diretório do backend
Set-Location demandas-api

# Verificar se está logado
Write-Host "🔍 Verificando autenticação..." -ForegroundColor Yellow
$authCheck = & $railwayCmd whoami 2>&1

if ($authCheck -match "Unauthorized") {
    Write-Host "⚠️ Não autenticado. Tentando login..." -ForegroundColor Yellow
    
    # Tentar login browserless
    & $railwayCmd login --browserless
    
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
& $railwayCmd deploy

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
