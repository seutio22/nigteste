# Grava R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY no Railway (serviço portal-colaborador-api).
# R2_ACCOUNT_ID e R2_BUCKET_NAME já podem estar definidos; este script completa as chaves S3.
#
# Obter chaves: Cloudflare → R2 → Manage R2 API Tokens → Create (Object Read & Write).
#
# Uso (na pasta portal-api):
#   .\configure-r2-railway.ps1 -AccessKeyId "xxx" -SecretAccessKey "yyy"
#
# -SkipDeploys: grava sem disparar redeploy imediato
param(
  [Parameter(Mandatory = $true)]
  [string] $AccessKeyId,
  [Parameter(Mandatory = $true)]
  [string] $SecretAccessKey,
  [switch] $SkipDeploys
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$env:RAILWAY_PROJECT_ID = "af05d835-bea3-4b3a-a2b0-dcecec4e1121"
$env:RAILWAY_ENVIRONMENT_ID = "d866c183-f35b-4294-aa56-51bf91b57bd3"
$env:RAILWAY_SERVICE_ID = "bb0654bb-1aaa-44ae-a139-f5213b85bd97"

$service = $env:RAILWAY_SERVICE_ID
$railwayPkg = '@railway/cli@latest'

Write-Host "Railway: portal-colaborador-api — R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY" -ForegroundColor Cyan

if ($SkipDeploys) {
  npm exec --yes "--package=$railwayPkg" -- railway variable set "R2_ACCESS_KEY_ID=$AccessKeyId" -s $service --skip-deploys
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  npm exec --yes "--package=$railwayPkg" -- railway variable set "R2_SECRET_ACCESS_KEY=$SecretAccessKey" -s $service --skip-deploys
} else {
  npm exec --yes "--package=$railwayPkg" -- railway variable set "R2_ACCESS_KEY_ID=$AccessKeyId" -s $service
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  npm exec --yes "--package=$railwayPkg" -- railway variable set "R2_SECRET_ACCESS_KEY=$SecretAccessKey" -s $service
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "OK. Chaves R2 gravadas. Faça redeploy se necessário." -ForegroundColor Green
