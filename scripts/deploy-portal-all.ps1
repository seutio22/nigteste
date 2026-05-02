# Deploy completo: API (Railway) + portal-web (Vercel).
# Requer: npx @railway/cli login  e  npx vercel login
#
# Uso:  cd <raiz do repo> ; .\scripts\deploy-portal-all.ps1

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "`n=== 1. Railway (portal-api) ===" -ForegroundColor Cyan
$env:RAILWAY_PROJECT_ID = "af05d835-bea3-4b3a-a2b0-dcecec4e1121"
$env:RAILWAY_ENVIRONMENT_ID = "d866c183-f35b-4294-aa56-51bf91b57bd3"
$env:RAILWAY_SERVICE_ID = "bb0654bb-1aaa-44ae-a139-f5213b85bd97"
npx @railway/cli up --ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 2. Vercel (portal-web) ===" -ForegroundColor Cyan
& (Join-Path $root "scripts\deploy-portal-web.ps1")
exit $LASTEXITCODE
