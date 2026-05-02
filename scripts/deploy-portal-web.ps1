# Deploy do portal-web na Vercel (produção).
# Pré-requisitos: npx vercel login (feito)
#
# Se aparecer erro do tipo «portal-web\portal-web» não existe:
#   Vercel → projeto portal-web → Settings → General → Root Directory
#   Deixe em branco (.) se corre este script DENTRO da pasta portal-web.
#   OU defina Root Directory = portal-web se correr deploy A PARTIR da raiz do monorepo (ajuste o cd abaixo).
#
# Uso:  .\scripts\deploy-portal-web.ps1

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$pw = Join-Path $root "portal-web"
Set-Location $pw

Write-Host "Instalar dependências…" -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) {
  Write-Host "npm ci falhou; a tentar npm install…" -ForegroundColor Yellow
  npm install
}

Write-Host "Build…" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploy produção Vercel…" -ForegroundColor Cyan
npx vercel deploy --prod --yes
exit $LASTEXITCODE
