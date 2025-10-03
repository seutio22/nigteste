# Script simples para deploy direto
Write-Host "🚀 Deploy direto Railway + Vercel" -ForegroundColor Magenta

# Deploy Railway
Write-Host "🚂 Deploy Railway..." -ForegroundColor Blue
Set-Location demandas-api
railway deploy
Set-Location ..

# Deploy Vercel  
Write-Host "🎨 Deploy Vercel..." -ForegroundColor Blue
Set-Location demandas-web
vercel --prod --yes
Set-Location ..

Write-Host "✅ Deploy concluído!" -ForegroundColor Green
