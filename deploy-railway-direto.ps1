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

    Invoke-Railway deploy --service nigteste-backend

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
