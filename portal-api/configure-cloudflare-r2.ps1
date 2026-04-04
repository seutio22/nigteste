# Grava variáveis Cloudflare R2 no .env local e, opcionalmente, no serviço portal-colaborador-api (Railway).
#
# Pré-requisitos (Railway): npx @railway/cli login
# Dashboard Cloudflare: R2 → bucket → Manage R2 API Tokens (Object Read & Write) + CORS no bucket.
#
# Uso:
#   cd portal-api
#   .\configure-cloudflare-r2.ps1
#   .\configure-cloudflare-r2.ps1 -Railway
#   .\configure-cloudflare-r2.ps1 -Railway -SkipDeploys

param(
  [switch] $Railway,
  [switch] $SkipDeploys
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$envFile = Join-Path $PSScriptRoot ".env"

function Read-SecretLine {
  param([string] $Prompt)
  $sec = Read-Host -AsSecureString $Prompt
  if ($sec.Length -eq 0) { return "" }
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

Write-Host ""
Write-Host "Cloudflare R2 — portal-colaborador-api" -ForegroundColor Cyan
Write-Host "  Account ID: painel R2 (Overview). Token: Manage R2 API Tokens (S3)." -ForegroundColor Gray
Write-Host ""

$accountId = (Read-Host "R2_ACCOUNT_ID").Trim()
$accessKey = (Read-Host "R2_ACCESS_KEY_ID").Trim()
$secretKey = Read-SecretLine "R2_SECRET_ACCESS_KEY"
$bucket = (Read-Host "R2_BUCKET_NAME").Trim()
$maxMb = (Read-Host "R2_MAX_FILE_MB (Enter = 25)").Trim()
if (-not $maxMb) { $maxMb = "25" }

if (-not $accountId -or -not $accessKey -or -not $secretKey -or -not $bucket) {
  Write-Host "Erro: Account ID, Access Key, Secret e Bucket são obrigatórios." -ForegroundColor Red
  exit 1
}

$lines = @()
if (Test-Path $envFile) {
  $lines = @(Get-Content $envFile -ErrorAction Stop | Where-Object { $_ -notmatch '^\s*R2_' })
}
$lines += "R2_ACCOUNT_ID=`"$accountId`""
$lines += "R2_ACCESS_KEY_ID=`"$accessKey`""
$lines += "R2_SECRET_ACCESS_KEY=`"$secretKey`""
$lines += "R2_BUCKET_NAME=`"$bucket`""
$lines += "R2_MAX_FILE_MB=`"$maxMb`""
Set-Content -Path $envFile -Value $lines -Encoding utf8
Write-Host "OK: gravado em .env" -ForegroundColor Green

if (-not $Railway) {
  Write-Host "Para Railway: .\configure-cloudflare-r2.ps1 -Railway" -ForegroundColor Gray
  exit 0
}

$env:RAILWAY_PROJECT_ID = "af05d835-bea3-4b3a-a2b0-dcecec4e1121"
$env:RAILWAY_ENVIRONMENT_ID = "d866c183-f35b-4294-aa56-51bf91b57bd3"
$env:RAILWAY_SERVICE_ID = "bb0654bb-1aaa-44ae-a139-f5213b85bd97"
$service = $env:RAILWAY_SERVICE_ID
$railwayPkg = '@railway/cli@latest'

Write-Host "Railway: a gravar R2_* no serviço..." -ForegroundColor Cyan

function Invoke-RailwaySet {
  param([string] $Pair)
  if ($SkipDeploys) {
    npm exec --yes "--package=$railwayPkg" -- railway variable set $Pair -s $service --skip-deploys
  } else {
    npm exec --yes "--package=$railwayPkg" -- railway variable set $Pair -s $service
  }
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Invoke-RailwaySet "R2_ACCOUNT_ID=$accountId"
Invoke-RailwaySet "R2_ACCESS_KEY_ID=$accessKey"
Invoke-RailwaySet "R2_SECRET_ACCESS_KEY=$secretKey"
Invoke-RailwaySet "R2_BUCKET_NAME=$bucket"
Invoke-RailwaySet "R2_MAX_FILE_MB=$maxMb"

Write-Host "OK: variáveis R2 no Railway." -ForegroundColor Green
