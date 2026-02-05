# Deploy Railway via CLI - deve rodar da RAIZ do repo (nigteste)
# O Railway tem Root Directory = "demandas-api", entao precisa do repo completo
Write-Host "Deploy Railway (API) via CLI..." -ForegroundColor Cyan
$rootDir = $PSScriptRoot
Set-Location $rootDir

# Copiar config do Railway se existir em demandas-api
if (Test-Path "demandas-api\.railwayrc") {
    Copy-Item "demandas-api\.railwayrc" ".railwayrc" -Force
}

# Deploy a partir da raiz - envia repo inteiro; Railway encontra demandas-api
npx railway up

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deploy iniciado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Erro no deploy. Tente:" -ForegroundColor Yellow
    Write-Host "  1. cd demandas-api" -ForegroundColor White
    Write-Host "  2. npx railway link   (selecionar projeto e servico)" -ForegroundColor White
    Write-Host "  3. No Dashboard Railway: Settings -> Root Directory -> deixe VAZIO" -ForegroundColor White
    Write-Host "  4. npx railway up" -ForegroundColor White
}
