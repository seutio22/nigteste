# Script simples para commit e deploy
param(
    [string]$Message = "Deploy automático"
)

# Commit e push
Write-Host "Commit e push..." -ForegroundColor Cyan
git add -A
git commit -m "$Message - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" --author="silmahayla@gmail.com"
git push origin main

# Deploy Vercel
Write-Host "Deploy Vercel..." -ForegroundColor Cyan
Set-Location demandas-web
$env:VERCEL_TOKEN="1zGvh5dfuG1p6TVf4uHxd04E"
npx vercel@latest deploy --prod --yes --token $env:VERCEL_TOKEN
Set-Location ..

Write-Host "Concluído!" -ForegroundColor Green
