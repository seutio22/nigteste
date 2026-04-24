# deploy-railway-direto.ps1
$ErrorActionPreference = "Stop"

function Invoke-Railway {
    if (Get-Command railway -ErrorAction SilentlyContinue) {
        & railway @args
    } else {
        & npx --yes @railway/cli @args
    }
}

Write-Host "🚀 Deploy Direto Railway..." -ForegroundColor Green

$enteredBackend = $false
try {
    Invoke-Railway whoami 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Não está logado no Railway. Execute 'railway login' ou 'npx @railway/cli login' primeiro!" -ForegroundColor Red
        Write-Host "💡 Dica: Abra um terminal e execute: railway login" -ForegroundColor Yellow
        exit 1
    }
    $railwayStatus = Invoke-Railway whoami 2>$null

    Write-Host "✅ Logado no Railway como: $railwayStatus" -ForegroundColor Green

    Set-Location "demandas-api"
    $enteredBackend = $true

    Write-Host "📦 Fazendo deploy do backend..." -ForegroundColor Cyan

    # Projeto/serviço da API demandas (evita falhar quando esta pasta está `railway link` a outro serviço, ex.: portal-colaborador-api).
    $railwayProject = if ($env:RAILWAY_PROJECT_ID) { $env:RAILWAY_PROJECT_ID } else { '2192a2e2-aa38-4290-9bd7-6c895e168b06' }
    $railwayEnv = if ($env:RAILWAY_ENVIRONMENT) { $env:RAILWAY_ENVIRONMENT } else { 'production' }
    $railwayService = if ($env:RAILWAY_SERVICE_NAME) { $env:RAILWAY_SERVICE_NAME } else { 'nigteste' }

    # `railway deploy` na CLI atual é para templates; o deploy do código usa `railway up` (como no GitHub Actions).
    Invoke-Railway up --ci -p $railwayProject -e $railwayEnv -s $railwayService

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deploy Railway concluído com sucesso!" -ForegroundColor Green
        Write-Host "🌐 Backend disponível em: https://nigteste-production.up.railway.app" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Erro no deploy Railway" -ForegroundColor Red
        exit 1
    }

} catch {
    Write-Host "❌ Erro no deploy Railway: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    if ($enteredBackend) { Set-Location ".." }
}

Write-Host "`n🎉 Deploy Railway finalizado!" -ForegroundColor Magenta
