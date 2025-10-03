# deploy-completo-direto.ps1
$ErrorActionPreference = "Continue"

Write-Host "🚀 Deploy Completo Direto (Railway + Vercel)" -ForegroundColor Yellow
Write-Host "Tempo estimado: 1-2 minutos" -ForegroundColor Cyan

$railwaySuccess = $false
$vercelSuccess = $false

# Deploy Railway (Backend)
Write-Host "`n1️⃣ Deploy Railway (Backend)..." -ForegroundColor Green
try {
    & ".\deploy-railway-direto.ps1"
    if ($LASTEXITCODE -eq 0) {
        $railwaySuccess = $true
        Write-Host "✅ Railway: Sucesso" -ForegroundColor Green
    } else {
        Write-Host "❌ Railway: Erro" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Railway: Erro - $($_.Exception.Message)" -ForegroundColor Red
}

# Deploy Vercel (Frontend)
Write-Host "`n2️⃣ Deploy Vercel (Frontend)..." -ForegroundColor Cyan
try {
    & ".\deploy-vercel-direto.ps1"
    if ($LASTEXITCODE -eq 0) {
        $vercelSuccess = $true
        Write-Host "✅ Vercel: Sucesso" -ForegroundColor Green
    } else {
        Write-Host "❌ Vercel: Erro" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Vercel: Erro - $($_.Exception.Message)" -ForegroundColor Red
}

# Resumo
Write-Host "`n📊 RESUMO DO DEPLOY:" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

if ($railwaySuccess) {
    Write-Host "✅ Railway (Backend): Sucesso" -ForegroundColor Green
    Write-Host "   🌐 https://nigteste-production.up.railway.app" -ForegroundColor Cyan
} else {
    Write-Host "❌ Railway (Backend): Erro" -ForegroundColor Red
}

if ($vercelSuccess) {
    Write-Host "✅ Vercel (Frontend): Sucesso" -ForegroundColor Green
    Write-Host "   🌐 https://nigteste.vercel.app" -ForegroundColor Cyan
} else {
    Write-Host "❌ Vercel (Frontend): Erro" -ForegroundColor Red
}

# Fallback para Git se algum deploy falhar
if (-not $railwaySuccess -or -not $vercelSuccess) {
    Write-Host "`n🔄 Executando fallback via Git..." -ForegroundColor Yellow
    try {
        git add .
        git commit -m "trigger: Deploy fallback" --allow-empty
        git push origin main
        Write-Host "✅ Deploy automático iniciado via Git push" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erro no fallback Git: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Deploy completo finalizado!" -ForegroundColor Magenta
Write-Host "Tempo total: ~1-2 minutos" -ForegroundColor Cyan
