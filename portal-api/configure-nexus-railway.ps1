# Define NEXUS_API_BASE_URL e NEXUS_API_TOKEN no serviço portal-colaborador-api (Railway).
# Mesmos projeto/ambiente/serviço que deploy-railway.ps1 (amusing-flexibility).
#
# Pré-requisitos: npx @railway/cli login (ou RAILWAY_TOKEN)
#
# Uso (na pasta portal-api):
#   .\configure-nexus-railway.ps1 -BaseUrl "https://sua-api-demandas.up.railway.app" -Token "eyJ..."
#
# -SkipDeploys: grava variáveis sem disparar redeploy
param(
  [Parameter(Mandatory = $true)]
  [string] $BaseUrl,
  [Parameter(Mandatory = $true)]
  [string] $Token,
  [switch] $SkipDeploys
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$env:RAILWAY_PROJECT_ID = "af05d835-bea3-4b3a-a2b0-dcecec4e1121"
$env:RAILWAY_ENVIRONMENT_ID = "d866c183-f35b-4294-aa56-51bf91b57bd3"
$env:RAILWAY_SERVICE_ID = "bb0654bb-1aaa-44ae-a139-f5213b85bd97"

$u = $BaseUrl.Trim().TrimEnd('/')
$service = $env:RAILWAY_SERVICE_ID

Write-Host "Railway: portal-colaborador-api — NEXUS_API_BASE_URL + NEXUS_API_TOKEN" -ForegroundColor Cyan
Write-Host "  URL: $u" -ForegroundColor Gray

if ($SkipDeploys) {
  & npx --yes @railway/cli@latest variable set "NEXUS_API_BASE_URL=$u" -s $service --skip-deploys
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  $Token | & npx --yes @railway/cli@latest variable set NEXUS_API_TOKEN --stdin -s $service --skip-deploys
} else {
  & npx --yes @railway/cli@latest variable set "NEXUS_API_BASE_URL=$u" -s $service
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  $Token | & npx --yes @railway/cli@latest variable set NEXUS_API_TOKEN --stdin -s $service
}
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "OK. Variáveis gravadas no serviço." -ForegroundColor Green
