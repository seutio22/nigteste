# Script para deploy completo (Railway + Vercel)
# Este script faz deploy direto em ambas as plataformas

Write-Host "🚀 Iniciando deploy completo (Railway + Vercel)..." -ForegroundColor Magenta

# Função para executar com fallback
function Deploy-WithFallback {
    param(
        [string]$Platform,
        [string]$ScriptPath
    )
    
    Write-Host "🔧 Executando deploy $Platform..." -ForegroundColor Yellow
    
    try {
        & $ScriptPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Deploy $Platform concluído com sucesso!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Erro no deploy $Platform. Usando fallback..." -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Erro no deploy $Platform" -ForegroundColor Red
        return $false
    }
}

# Executar deploy Railway
$railwaySuccess = Deploy-WithFallback "Railway" ".\deploy-railway.ps1"

# Executar deploy Vercel
$vercelSuccess = Deploy-WithFallback "Vercel" ".\deploy-vercel.ps1"

# Resumo
Write-Host "`n📊 RESUMO DO DEPLOY:" -ForegroundColor Cyan
Write-Host "🚂 Railway: $(if ($railwaySuccess) { '✅ Sucesso' } else { '❌ Fallback' })" -ForegroundColor $(if ($railwaySuccess) { 'Green' } else { 'Yellow' })
Write-Host "🎨 Vercel: $(if ($vercelSuccess) { '✅ Sucesso' } else { '❌ Fallback' })" -ForegroundColor $(if ($vercelSuccess) { 'Green' } else { 'Yellow' })

if (-not $railwaySuccess -or -not $vercelSuccess) {
    Write-Host "`n🔄 Executando fallback final via Git..." -ForegroundColor Yellow
    git add .
    git commit -m "trigger: Deploy completo fallback - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" --allow-empty
    git push origin main
    Write-Host "✅ Deploy automático iniciado via Git push (fallback final)" -ForegroundColor Green
}

Write-Host "`n🎉 Deploy completo finalizado!" -ForegroundColor Magenta
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "  Backend: https://nigteste-production.up.railway.app" -ForegroundColor White
Write-Host "  Frontend: https://nigteste.vercel.app" -ForegroundColor White
