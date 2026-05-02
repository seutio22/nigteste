# Corrige estipulantes «Contrato (…)» na base PostgreSQL (produção ou local).
#
# O Railway injecta `postgres.railway.internal` na API; da sua casa isso não liga.
# Use a URL pública do Postgres (Railway → o serviço Postgres → Connect → copiar URL com proxy público).
#
# Exemplo:
#   $env:DATABASE_URL = "postgresql://user:pass@ballast.proxy.rlwy.net:12345/railway"
#   .\fix-db-estipulantes-local.ps1
#
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$db = [string]$env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($db)) {
  Write-Host 'Defina DATABASE_URL no ambiente (connection string pública do Postgres).' -ForegroundColor Red
  exit 1
}
Write-Host 'Simulação…' -ForegroundColor Cyan
npm run db:fix-contrato-est -- --dry-run
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if (-not (Read-Host 'Aplicar na base de verdade? (s/N)').Trim().ToLower().StartsWith('s')) {
  Write-Host 'Cancelado.'
  exit 0
}
npm run db:fix-contrato-est
