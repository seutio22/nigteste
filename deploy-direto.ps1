# Script para deploy direto sem funções
Write-Host "🚀 Deploy direto Railway + Vercel" -ForegroundColor Magenta

# Deploy Railway
Write-Host "🚂 Deploy Railway..." -ForegroundColor Blue
Set-Location demandas-api
railway deploy
$railwaySuccess = $LASTEXITCODE -eq 0
Set-Location ..

# Deploy Vercel
Write-Host "🎨 Deploy Vercel..." -ForegroundColor Blue
Set-Location demandas-web
vercel --prod --yes
$vercelSuccess = $LASTEXITCODE -eq 0
Set-Location ..

# Resumo
Write-Host "`n📊 RESUMO:" -ForegroundColor Cyan
Write-Host "🚂 Railway: $(if ($railwaySuccess) { '✅ Sucesso' } else { '❌ Erro' })" -ForegroundColor $(if ($railwaySuccess) { 'Green' } else { 'Red' })
Write-Host "🎨 Vercel: $(if ($vercelSuccess) { '✅ Sucesso' } else { '❌ Erro' })" -ForegroundColor $(if ($vercelSuccess) { 'Green' } else { 'Red' })

# Fallback se necessário
if (-not $railwaySuccess -or -not $vercelSuccess) {
    Write-Host "`n🔄 Executando fallback via Git..." -ForegroundColor Yellow
    git add .
    git commit -m "trigger: Deploy fallback - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" --allow-empty
    git push origin main
    Write-Host "✅ Deploy automático iniciado via Git push" -ForegroundColor Green
}

Write-Host "`n🎉 Deploy finalizado!" -ForegroundColor Magenta
