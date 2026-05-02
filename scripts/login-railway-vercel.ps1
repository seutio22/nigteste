# Login interativo no Railway e na Vercel (abre o browser ou pede confirmação).
# Correr no PowerShell do utilizador:  .\scripts\login-railway-vercel.ps1
# Não funciona em CI / modo não interativo.

$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot ".."
Set-Location $root

Write-Host "`n=== 1. Railway ===" -ForegroundColor Cyan
Write-Host "Se quiseres código no terminal (sem abrir browser):  npx @railway/cli login --browserless`n" -ForegroundColor DarkGray
npx @railway/cli login
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== 2. Vercel (pasta portal-web) ===" -ForegroundColor Cyan
Set-Location (Join-Path $root "portal-web")
npx vercel login
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nOK. Testar:  npx @railway/cli whoami   e   npx vercel whoami" -ForegroundColor Green
Set-Location $root
