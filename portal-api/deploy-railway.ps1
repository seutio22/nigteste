# Deploy da API do portal SEMPRE no Railway "amusing-flexibility".
# Se rodar `railway up` na raiz do repo (pasta pai), o CLI usa o link de lá — costuma ser
# "perpetual-imagination" (demandas). Este script fixa projeto/ambiente/serviço por ID.
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
Set-Location $here

$env:RAILWAY_PROJECT_ID = "af05d835-bea3-4b3a-a2b0-dcecec4e1121"
$env:RAILWAY_ENVIRONMENT_ID = "d866c183-f35b-4294-aa56-51bf91b57bd3"
$env:RAILWAY_SERVICE_ID = "bb0654bb-1aaa-44ae-a139-f5213b85bd97"

Write-Host "Railway: amusing-flexibility / production / portal-colaborador-api" -ForegroundColor Cyan
npx --yes @railway/cli@latest up . --path-as-root @args  # ex.: .\deploy-railway.ps1 --detach
