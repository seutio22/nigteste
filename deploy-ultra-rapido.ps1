# deploy-ultra-rapido.ps1
$ErrorActionPreference = "Stop"

Write-Host "⚡ Deploy Ultra Rápido (30-60 segundos)" -ForegroundColor Magenta

# Verificar se está logado nos CLIs
$railwayLoggedIn = $false
$vercelLoggedIn = $false

try {
    railway whoami 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $railwayLoggedIn = $true }
} catch { }

try {
    vercel whoami 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $vercelLoggedIn = $true }
} catch { }

if (-not $railwayLoggedIn -or -not $vercelLoggedIn) {
    Write-Host "❌ Login necessário nos CLIs:" -ForegroundColor Red
    if (-not $railwayLoggedIn) {
        Write-Host "   - Execute: railway login" -ForegroundColor Yellow
    }
    if (-not $vercelLoggedIn) {
        Write-Host "   - Execute: vercel login" -ForegroundColor Yellow
    }
    Write-Host "`n💡 Após fazer login, execute este script novamente" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Ambos CLIs logados - iniciando deploy ultra rápido..." -ForegroundColor Green

# Deploy paralelo (Railway e Vercel ao mesmo tempo)
$railwayJob = Start-Job -ScriptBlock {
    Set-Location "demandas-api"
    railway deploy --service nigteste-backend
}

$vercelJob = Start-Job -ScriptBlock {
    Set-Location "demandas-web"
    vercel deploy --prod --confirm
}

Write-Host "🚀 Deploy paralelo iniciado..." -ForegroundColor Cyan

# Aguardar ambos os jobs
$railwayResult = Wait-Job $railwayJob | Receive-Job
$vercelResult = Wait-Job $vercelJob | Receive-Job

# Limpar jobs
Remove-Job $railwayJob, $vercelJob

# Verificar resultados
$railwaySuccess = $railwayJob.State -eq "Completed" -and $railwayJob.ChildJobs[0].Output -notcontains "error"
$vercelSuccess = $vercelJob.State -eq "Completed" -and $vercelJob.ChildJobs[0].Output -notcontains "error"

Write-Host "`n📊 RESULTADO:" -ForegroundColor Yellow
if ($railwaySuccess) {
    Write-Host "✅ Railway: Sucesso" -ForegroundColor Green
} else {
    Write-Host "❌ Railway: Erro" -ForegroundColor Red
}

if ($vercelSuccess) {
    Write-Host "✅ Vercel: Sucesso" -ForegroundColor Green
} else {
    Write-Host "❌ Vercel: Erro" -ForegroundColor Red
}

Write-Host "`n⚡ Deploy ultra rápido concluído!" -ForegroundColor Magenta
Write-Host "Tempo total: ~30-60 segundos" -ForegroundColor Cyan
