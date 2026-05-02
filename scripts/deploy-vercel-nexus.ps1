# Deploy demandas-web (Nexus) na Vercel — só CLI, sem GitHub Actions.
# Pré-requisito: npx vercel login
#
# Uso (na raiz do repo):
#   .\scripts\deploy-vercel-nexus.ps1
#   .\scripts\deploy-vercel-nexus.ps1 -Clean

param(
  [switch]$Clean
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$fe = Join-Path $root "demandas-web"
Set-Location $fe

if ($Clean -and (Test-Path (Join-Path $fe "node_modules"))) {
  Write-Host "A remover node_modules…" -ForegroundColor Yellow
  Remove-Item -LiteralPath (Join-Path $fe "node_modules") -Recurse -Force -ErrorAction Stop
}

Write-Host "npm ci…" -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Build…" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Vercel --prod (cwd = demandas-web)…" -ForegroundColor Cyan
npx vercel deploy --prod --yes
exit $LASTEXITCODE
